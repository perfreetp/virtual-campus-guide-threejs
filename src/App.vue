<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import CampusScene from './components/CampusScene.vue';
import ControlPanel from './components/ControlPanel.vue';
import HeatmapPanel from './components/HeatmapPanel.vue';
import InfoPanel from './components/InfoPanel.vue';
import RoutePlanner from './components/RoutePlanner.vue';
import UserCenter from './components/UserCenter.vue';
import { campusBuildings, categoryNames, recommendedRoutes } from './mock/campusData';
import { createCrowdSnapshot } from './mock/crowdData';
import { formatDistance, planSmartRoute, toMiniMapPoint, TRAVEL_MODES } from './utils/pathfinding';
import { loadUserData, persistUserData } from './utils/storage';

const activeCategory = ref('all');
const selectedBuildingId = ref(campusBuildings[0].id);
const focusedBuildingId = ref(campusBuildings[0].id);
const routeStartId = ref('gate');
const routeEndId = ref('library');
const routeWaypointIds = ref([]);
const routeMode = ref('walk');
const routeFocusKey = ref(0);
const cameraMode = ref('near');
const cameraFocusKey = ref(0);
const sceneMode = ref('day');
const cameraHeading = ref(45);
const panoramaMode = ref(false);
const flying = ref(false);
const activeStopIndex = ref(-1);
const heatmapVisible = ref(false);
const heatFilter = ref({ department: 'all', buildingId: 'all' });
const crowdSnapshot = ref({});
let crowdTimer;
let buildingSelectTimer;

const userData = loadUserData();
const favorites = ref(userData.favorites);
const savedRoutes = ref(userData.savedRoutes);
const history = ref(userData.history);

const selectedBuilding = computed(() => {
  return campusBuildings.find((building) => building.id === selectedBuildingId.value) || campusBuildings[0];
});

const filteredBuildings = computed(() => {
  if (activeCategory.value === 'all') {
    return campusBuildings;
  }

  return campusBuildings.filter((building) => building.category === activeCategory.value);
});

const routePlan = computed(() => {
  return planSmartRoute({
    startId: routeStartId.value,
    endId: routeEndId.value,
    waypointIds: routeWaypointIds.value,
    mode: routeMode.value
  }, campusBuildings);
});

const routeLabel = computed(() => {
  if (!routePlan.value.reachable) {
    return routePlan.value.message || '请选择路线';
  }

  return routePlan.value.stops.map((stop) => stop.name).join(' -> ');
});

const miniMapPolyline = computed(() => {
  if (!routePlan.value.reachable) {
    return '';
  }

  return routePlan.value.points
    .map(toMiniMapPoint)
    .map((point) => `${point.x},${point.y}`)
    .join(' ');
});

const categoryStats = computed(() => {
  return Object.entries(categoryNames).map(([key, label]) => ({
    key,
    label,
    count: campusBuildings.filter((building) => building.category === key).length
  }));
});

const crowdDetail = computed(() => {
  const info = crowdSnapshot.value[selectedBuildingId.value];
  if (!heatmapVisible.value || !info) {
    return null;
  }

  return {
    ...info,
    name: selectedBuilding.value.name
  };
});

const isFavorite = computed(() => favorites.value.includes(selectedBuildingId.value));

const trafficSeries = [46, 58, 51, 68, 62, 72, 64, 83, 78, 92, 74, 88];
const routeSeries = [18, 32, 44, 28, 52, 63];
const campusMetrics = computed(() => [
  { label: '建筑数量', value: campusBuildings.length, suffix: '处' },
  { label: '推荐路线', value: recommendedRoutes.length, suffix: '条' },
  { label: '在园人数', value: Object.values(crowdSnapshot.value).reduce((sum, item) => sum + item.people, 0), suffix: '人' },
  { label: '开放区域', value: 18, suffix: '个' }
]);
const serviceMeters = [
  { label: '教室使用率', value: 78 },
  { label: '自习座位', value: 64 },
  { label: '餐饮客流', value: 86 },
  { label: '运动场地', value: 57 }
];

const mapBuildings = computed(() => {
  return campusBuildings.map((building) => ({
    ...building,
    mapX: ((building.position[0] + 22) / 44) * 100,
    mapY: ((building.position[2] + 17) / 34) * 100
  }));
});

function handleBuildingSelect(building) {
  focusedBuildingId.value = building.id;
  cameraMode.value = 'near';

  window.clearTimeout(buildingSelectTimer);
  buildingSelectTimer = window.setTimeout(() => {
    selectedBuildingId.value = building.id;
    focusedBuildingId.value = building.id;
  }, 560);
}

function handleSearch(building) {
  if (!building) {
    return;
  }

  selectedBuildingId.value = building.id;
  focusedBuildingId.value = building.id;
}

function applyRecommendedRoute(recommendedRoute) {
  routeStartId.value = recommendedRoute.start;
  routeEndId.value = recommendedRoute.end;
  routeWaypointIds.value = [];
  selectedBuildingId.value = recommendedRoute.end;
  routeFocusKey.value += 1;
}

function applyCameraMode(mode) {
  cameraMode.value = mode;
  cameraFocusKey.value += 1;
}

function handleCameraState(state) {
  cameraHeading.value = state.heading;
}

function startRouteFlight() {
  if (!routePlan.value.reachable) {
    return;
  }

  activeStopIndex.value = 0;
  flying.value = true;
  recordHistory();
}

function stopRouteFlight() {
  flying.value = false;
}

function handleFlyProgress(stopIndex) {
  activeStopIndex.value = stopIndex;
}

function handleFlyEnd() {
  flying.value = false;
  activeStopIndex.value = -1;
}

function recordHistory() {
  history.value = [
    {
      id: `history-${Date.now()}`,
      time: Date.now(),
      start: routeStartId.value,
      end: routeEndId.value,
      waypoints: [...routeWaypointIds.value],
      mode: routeMode.value,
      totalDistance: routePlan.value.totalDistance
    },
    ...history.value
  ].slice(0, 20);
}

function saveCurrentRoute() {
  if (!routePlan.value.reachable) {
    return;
  }

  savedRoutes.value = [
    ...savedRoutes.value,
    {
      id: `route-${Date.now()}`,
      name: `自定义路线 ${savedRoutes.value.length + 1}`,
      start: routeStartId.value,
      end: routeEndId.value,
      waypoints: [...routeWaypointIds.value],
      mode: routeMode.value,
      totalDistance: routePlan.value.totalDistance
    }
  ];
}

function applySavedRoute(route) {
  routeStartId.value = route.start;
  routeEndId.value = route.end;
  routeWaypointIds.value = [...(route.waypoints || [])];
  routeMode.value = route.mode || 'walk';
  routeFocusKey.value += 1;
}

function removeSavedRoute(id) {
  savedRoutes.value = savedRoutes.value.filter((route) => route.id !== id);
}

function replayHistory(item) {
  applySavedRoute(item);
  // 等待路线状态 watcher 完成重置后再触发飞行，避免被覆盖
  nextTick(() => {
    activeStopIndex.value = 0;
    flying.value = true;
  });
}

function toggleFavorite(buildingId) {
  if (favorites.value.includes(buildingId)) {
    favorites.value = favorites.value.filter((id) => id !== buildingId);
  } else {
    favorites.value = [...favorites.value, buildingId];
  }
}

function clearHistory() {
  history.value = [];
}

watch([favorites, savedRoutes, history], () => {
  persistUserData({
    favorites: favorites.value,
    savedRoutes: savedRoutes.value,
    history: history.value
  });
}, { deep: true });

watch([routeStartId, routeEndId, routeWaypointIds, routeMode], () => {
  flying.value = false;
  activeStopIndex.value = -1;
});

onMounted(() => {
  crowdSnapshot.value = createCrowdSnapshot(campusBuildings);
  crowdTimer = window.setInterval(() => {
    crowdSnapshot.value = createCrowdSnapshot(campusBuildings);
  }, 5000);
});

onBeforeUnmount(() => {
  window.clearTimeout(buildingSelectTimer);
  window.clearInterval(crowdTimer);
});
</script>

<template>
  <main class="screen-shell" :class="{ 'panorama-mode': panoramaMode }">
    <CampusScene
      :buildings="campusBuildings"
      :active-category="activeCategory"
      :selected-building-id="selectedBuildingId"
      :focused-building-id="focusedBuildingId"
      :route-focus-key="routeFocusKey"
      :camera-mode="cameraMode"
      :camera-focus-key="cameraFocusKey"
      :scene-mode="sceneMode"
      :route-plan="routePlan"
      :flying="flying"
      :active-stop-index="activeStopIndex"
      :heatmap-visible="heatmapVisible"
      :crowd="crowdSnapshot"
      :heat-filter="heatFilter"
      @select-building="handleBuildingSelect"
      @camera-state="handleCameraState"
      @fly-progress="handleFlyProgress"
      @fly-end="handleFlyEnd"
    />

    <div class="hud-shade"></div>

    <button
      class="panorama-toggle"
      type="button"
      :aria-pressed="panoramaMode"
      @click="panoramaMode = !panoramaMode"
    >
      {{ panoramaMode ? '显示面板' : '全景模式' }}
    </button>

    <UserCenter
      :buildings="campusBuildings"
      :favorites="favorites"
      :saved-routes="savedRoutes"
      :history="history"
      @toggle-favorite="toggleFavorite"
      @apply-route="applySavedRoute"
      @replay="replayHistory"
      @remove-route="removeSavedRoute"
      @clear-history="clearHistory"
      @select-building="handleSearch"
    />

    <header class="screen-header">
      <div class="brand-mark">V</div>
      <div>
        <p>Virtual Campus</p>
        <h1>Three.js 3D在线虚拟校园导览平台</h1>
      </div>
      <div class="system-status">
        <span>WebGL 在线</span>
        <span>Three.js 场景同步</span>
        <strong>17:38</strong>
      </div>
    </header>

    <ControlPanel
      v-model:category="activeCategory"
      :buildings="campusBuildings"
      @search="handleSearch"
    />

    <aside class="left-hud">
      <RoutePlanner
        v-model:start-id="routeStartId"
        v-model:end-id="routeEndId"
        v-model:waypoint-ids="routeWaypointIds"
        v-model:mode="routeMode"
        :buildings="campusBuildings"
        :recommended-routes="recommendedRoutes"
        :plan="routePlan"
        :flying="flying"
        :active-stop-index="activeStopIndex"
        @fly="startRouteFlight"
        @stop-fly="stopRouteFlight"
        @save-route="saveCurrentRoute"
        @route-pick="applyRecommendedRoute"
      />

      <HeatmapPanel
        v-model:visible="heatmapVisible"
        v-model:filter="heatFilter"
        :buildings="campusBuildings"
        :crowd="crowdSnapshot"
      />

      <section class="glass-panel traffic-panel">
        <div class="panel-heading">
          <span>校园访问趋势</span>
          <b>人流/小时</b>
        </div>
        <div class="line-chart" aria-hidden="true">
          <i
            v-for="(value, index) in trafficSeries"
            :key="index"
            :style="{ height: `${value}%` }"
          ></i>
        </div>
        <div class="chart-scale">
          <span>08:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>22:00</span>
        </div>
      </section>

      <section class="glass-panel metric-panel">
        <div class="panel-heading">
          <span>校园概览</span>
          <b>Live Data</b>
        </div>
        <div class="metric-grid">
          <button v-for="item in campusMetrics" :key="item.label" type="button">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <em>{{ item.suffix }}</em>
          </button>
        </div>
      </section>

      <section class="glass-panel">
        <div class="panel-heading">
          <span>区域筛选</span>
          <b>{{ filteredBuildings.length }} 个显示</b>
        </div>
        <div class="category-list">
          <button
            v-for="item in categoryStats"
            :key="item.key"
            type="button"
            :class="{ active: activeCategory === item.key }"
            @click="activeCategory = item.key"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.count }}</strong>
          </button>
        </div>
      </section>
    </aside>

    <aside class="right-hud">
      <InfoPanel
        :building="selectedBuilding"
        :favorited="isFavorite"
        @toggle-favorite="toggleFavorite"
      />

      <section v-if="crowdDetail" class="glass-panel heat-detail-panel" aria-label="楼栋人流详情">
        <div class="panel-heading">
          <span>{{ crowdDetail.name }}</span>
          <b :style="{ color: crowdDetail.color }">{{ crowdDetail.levelLabel }}</b>
        </div>
        <dl class="heat-detail-list">
          <div>
            <dt>楼层数</dt>
            <dd>{{ crowdDetail.floors }} 层</dd>
          </div>
          <div>
            <dt>当前人数</dt>
            <dd>{{ crowdDetail.people }} / {{ crowdDetail.capacity }} 人</dd>
          </div>
          <div>
            <dt>预警信息</dt>
            <dd>{{ crowdDetail.warning }}</dd>
          </div>
        </dl>
      </section>

      <section class="glass-panel camera-panel">
        <div class="panel-heading">
          <span>镜头模式</span>
          <b>{{ selectedBuilding.name }}</b>
        </div>
        <div class="camera-actions">
          <button :class="{ active: cameraMode === 'near' }" type="button" @click="applyCameraMode('near')">近景</button>
          <button :class="{ active: cameraMode === 'top' }" type="button" @click="applyCameraMode('top')">俯视</button>
          <button :class="{ active: cameraMode === 'orbit' }" type="button" @click="applyCameraMode('orbit')">环绕</button>
        </div>
      </section>

      <section class="glass-panel scene-mode-panel">
        <div class="panel-heading">
          <span>场景氛围</span>
          <b>{{ sceneMode }}</b>
        </div>
        <div class="camera-actions">
          <button :class="{ active: sceneMode === 'day' }" type="button" @click="sceneMode = 'day'">白天</button>
          <button :class="{ active: sceneMode === 'night' }" type="button" @click="sceneMode = 'night'">夜景</button>
          <button :class="{ active: sceneMode === 'rain' }" type="button" @click="sceneMode = 'rain'">雨天</button>
        </div>
      </section>

      <section class="glass-panel">
        <div class="panel-heading">
          <span>当前路线</span>
          <b>{{ TRAVEL_MODES[routeMode].label }}</b>
        </div>
        <p class="route-title">{{ routeLabel }}</p>
        <p v-if="routePlan.reachable" class="route-title">
          全程 {{ formatDistance(routePlan.totalDistance) }} · {{ routePlan.stops.length }} 个站点
        </p>
        <div class="route-bars">
          <i
            v-for="(value, index) in routeSeries"
            :key="index"
            :style="{ height: `${value}%` }"
          ></i>
        </div>
      </section>

      <section class="glass-panel">
        <div class="panel-heading">
          <span>资源状态</span>
          <b>实时模拟</b>
        </div>
        <div class="meter-list">
          <label v-for="meter in serviceMeters" :key="meter.label">
            <span>{{ meter.label }}</span>
            <strong>{{ meter.value }}%</strong>
            <i><em :style="{ width: `${meter.value}%` }"></em></i>
          </label>
        </div>
      </section>
    </aside>

    <section class="mini-map glass-panel" aria-label="校园小地图">
      <div class="panel-heading">
        <span>小地图</span>
        <b>{{ selectedBuilding.name }}</b>
      </div>
      <div class="mini-map-canvas">
        <i class="map-road horizontal"></i>
        <i class="map-road vertical"></i>
        <svg class="mini-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline :points="miniMapPolyline"></polyline>
        </svg>
        <i class="camera-heading" :style="{ transform: `translate(-50%, -50%) rotate(${cameraHeading}deg)` }"></i>
        <button
          v-for="building in mapBuildings"
          :key="building.id"
          type="button"
          :class="{ active: selectedBuildingId === building.id }"
          :style="{ left: `${building.mapX}%`, top: `${building.mapY}%` }"
          :title="building.name"
          @click="handleBuildingSelect(building)"
        ></button>
      </div>
    </section>
  </main>
</template>

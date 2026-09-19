<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import CampusScene from './components/CampusScene.vue';
import ControlPanel from './components/ControlPanel.vue';
import InfoPanel from './components/InfoPanel.vue';
import HeatmapPanel from './components/HeatmapPanel.vue';
import HeatPopup from './components/HeatPopup.vue';
import PersonalCenter from './components/PersonalCenter.vue';
import { campusBuildings, categoryNames, recommendedRoutes } from './mock/campusData';
import { createCrowdSnapshot, getCrowdEntry } from './mock/crowdData';
import { planCampusRoute, toMiniMapPoint, MODE_LABEL } from './utils/pathfinding';
import { useProfile } from './composables/useProfile';

const {
  favoriteIds,
  savedRoutes,
  history,
  isFavorite,
  toggleFavorite,
  saveRoute,
  removeRoute,
  addHistory,
  removeHistory
} = useProfile();

const activeCategory = ref('all');
const selectedBuildingId = ref(campusBuildings[0].id);
const focusedBuildingId = ref(campusBuildings[0].id);
const routeStartId = ref('gate');
const routeEndId = ref('library');
const routeWaypointIds = ref([]);
const travelMode = ref('walk');
const routeFocusKey = ref(0);
const cameraMode = ref('near');
const cameraFocusKey = ref(0);
const sceneMode = ref('day');
const cameraHeading = ref(45);
const panoramaMode = ref(false);

const heatEnabled = ref(false);
const heatFaculty = ref('all');
const heatBuildingId = ref('');
const crowdSnapshot = ref(createCrowdSnapshot(campusBuildings));
let crowdTimer;

const tourActive = ref(false);
const tourPaused = ref(false);
const tourKey = ref(0);
const tourStopKey = ref(0);
const activeTourStop = ref(null);

const personalOpen = ref(false);
let buildingSelectTimer;

const selectedBuilding = computed(() => {
  return campusBuildings.find((building) => building.id === selectedBuildingId.value) || campusBuildings[0];
});

const selectedCrowdEntry = computed(() => getCrowdEntry(crowdSnapshot.value, selectedBuildingId.value));

const filteredBuildings = computed(() => {
  if (activeCategory.value === 'all') {
    return campusBuildings;
  }

  return campusBuildings.filter((building) => building.category === activeCategory.value);
});

const routeStops = computed(() => {
  const ids = [routeStartId.value, ...routeWaypointIds.value, routeEndId.value];
  const unique = ids.filter((id, index) => ids.indexOf(id) === index);
  return unique
    .map((id) => campusBuildings.find((building) => building.id === id))
    .filter(Boolean);
});

const routePlan = computed(() => {
  if (routeStops.value.length < 2) {
    return null;
  }

  return planCampusRoute(routeStops.value, travelMode.value);
});

const routeLabel = computed(() => {
  if (!routePlan.value) {
    return '请选择路线';
  }
  return routeStops.value.map((building) => building.name).join(' → ');
});

const routeBuildings = computed(() => {
  return {
    start: campusBuildings.find((building) => building.id === routeStartId.value),
    end: campusBuildings.find((building) => building.id === routeEndId.value)
  };
});

const miniMapRoutePoints = computed(() => {
  if (!routePlan.value?.reachable) {
    return [];
  }
  return routePlan.value.points.map(toMiniMapPoint);
});

const miniMapPolyline = computed(() => {
  return miniMapRoutePoints.value.map((point) => `${point.x},${point.y}`).join(' ');
});

const miniMapStopPoints = computed(() => {
  return routeStops.value.map((building) => ({
    id: building.id,
    x: ((building.position[0] + 22) / 44) * 100,
    y: ((building.position[2] + 17) / 34) * 100
  }));
});

const categoryStats = computed(() => {
  return Object.entries(categoryNames).map(([key, label]) => ({
    key,
    label,
    count: campusBuildings.filter((building) => building.category === key).length
  }));
});

const trafficSeries = [46, 58, 51, 68, 62, 72, 64, 83, 78, 92, 74, 88];
const routeSeries = [18, 32, 44, 28, 52, 63];
const campusMetrics = computed(() => [
  { label: '建筑数量', value: campusBuildings.length, suffix: '处' },
  { label: '推荐路线', value: recommendedRoutes.length, suffix: '条' },
  { label: '实时在校', value: crowdSnapshot.value.total.toLocaleString(), suffix: '人次' },
  { label: '开放区域', value: 18, suffix: '个' }
]);
const serviceMeters = [
  { label: '教室使用率', value: 78 },
  { label: '自习座位', value: 64 },
  { label: '餐饮客流', value: 86 },
  { label: '运动场地', value: 57 }
];

const activeRoute = computed(() => {
  return recommendedRoutes.find((item) => item.start === routeStartId.value && item.end === routeEndId.value)
    || recommendedRoutes[0];
});

const mapBuildings = computed(() => {
  return campusBuildings.map((building) => ({
    ...building,
    mapX: ((building.position[0] + 22) / 44) * 100,
    mapY: ((building.position[2] + 17) / 34) * 100
  }));
});

const favoriteBuildings = computed(() => {
  return favoriteIds.value
    .map((id) => campusBuildings.find((building) => building.id === id))
    .filter(Boolean);
});

const heatPopupBuilding = computed(() => {
  return campusBuildings.find((building) => building.id === heatBuildingId.value) || null;
});

const heatPopupEntry = computed(() => getCrowdEntry(crowdSnapshot.value, heatBuildingId.value));

function buildRouteRecord() {
  const plan = routePlan.value;
  if (!plan?.reachable) {
    return null;
  }

  return {
    name: `${routeBuildings.value.start?.name || '起点'} → ${routeBuildings.value.end?.name || '终点'}`,
    startId: routeStartId.value,
    endId: routeEndId.value,
    waypointIds: [...routeWaypointIds.value],
    mode: travelMode.value,
    distanceMeters: plan.distanceMeters,
    etaMinutes: plan.etaMinutes
  };
}

function handleBuildingSelect(building) {
  const previousBuildingId = selectedBuildingId.value;
  focusedBuildingId.value = building.id;
  cameraMode.value = 'near';

  if (previousBuildingId && previousBuildingId !== building.id) {
    routeStartId.value = previousBuildingId;
    routeEndId.value = building.id;
    routeWaypointIds.value = [];
  } else if (routeStartId.value !== building.id) {
    routeEndId.value = building.id;
  }

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
  stopTour();
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

function startTour() {
  if (!routePlan.value?.reachable) {
    return;
  }

  if (tourActive.value) {
    tourKey.value += 1;
    tourPaused.value = false;
    return;
  }

  tourActive.value = true;
  tourPaused.value = false;
  tourKey.value += 1;
  const record = buildRouteRecord();
  if (record) {
    addHistory(record);
  }
}

function toggleTourPause() {
  tourPaused.value = !tourPaused.value;
}

function stopTour() {
  tourActive.value = false;
  tourPaused.value = false;
  activeTourStop.value = null;
}

function handleTourStop(payload) {
  activeTourStop.value = payload;
  selectedBuildingId.value = payload.buildingId;
  tourStopKey.value += 1;
}

function handleTourEnd() {
  tourActive.value = false;
  tourPaused.value = false;
}

function handleSaveRoute() {
  const record = buildRouteRecord();
  if (record) {
    saveRoute(record);
    personalOpen.value = true;
  }
}

function applyRouteRecord(record) {
  stopTour();
  routeStartId.value = record.startId;
  routeEndId.value = record.endId;
  routeWaypointIds.value = [...(record.waypointIds || [])];
  travelMode.value = record.mode || 'walk';
  selectedBuildingId.value = record.endId;
  focusedBuildingId.value = record.endId;
}

function replayRoute(record) {
  personalOpen.value = false;
  applyRouteRecord(record);
  window.setTimeout(() => {
    routeFocusKey.value += 1;
    startTour();
  }, 120);
}

function locateBuilding(building) {
  personalOpen.value = false;
  selectedBuildingId.value = building.id;
  focusedBuildingId.value = building.id;
}

function handleHeatSelect(buildingId) {
  heatBuildingId.value = buildingId;
  selectedBuildingId.value = buildingId;
  focusedBuildingId.value = buildingId;
}

function handleHeatPick(buildingId) {
  if (!buildingId) {
    heatBuildingId.value = '';
    return;
  }

  handleHeatSelect(buildingId);
}

function handleHeatLocate() {
  if (heatBuildingId.value) {
    focusedBuildingId.value = heatBuildingId.value;
    cameraMode.value = 'near';
    cameraFocusKey.value += 1;
  }
}

watch(routePlan, (plan) => {
  if (tourActive.value && !plan?.reachable) {
    stopTour();
  }
}, { deep: false });

onMounted(() => {
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
      :tour-active="tourActive"
      :tour-paused="tourPaused"
      :tour-key="tourKey"
      :heat-enabled="heatEnabled"
      :crowd-snapshot="crowdSnapshot"
      :heat-faculty="heatFaculty"
      :heat-building-id="heatBuildingId"
      :favorite-ids="favoriteIds"
      @select-building="handleBuildingSelect"
      @camera-state="handleCameraState"
      @heat-select="handleHeatSelect"
      @tour-stop="handleTourStop"
      @tour-end="handleTourEnd"
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
    <button class="profile-toggle" type="button" @click="personalOpen = true">个人中心</button>

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
      v-model:start-id="routeStartId"
      v-model:end-id="routeEndId"
      v-model:waypoint-ids="routeWaypointIds"
      v-model:travel-mode="travelMode"
      :buildings="campusBuildings"
      :filtered-buildings="filteredBuildings"
      :recommended-routes="recommendedRoutes"
      :route-plan="routePlan"
      :tour-active="tourActive"
      :tour-paused="tourPaused"
      @search="handleSearch"
      @route-pick="applyRecommendedRoute"
      @tour-start="startTour"
      @tour-toggle-pause="toggleTourPause"
      @tour-stop="stopTour"
      @save-route="handleSaveRoute"
    />

    <aside class="left-hud">
      <HeatmapPanel
        v-model:enabled="heatEnabled"
        v-model:faculty="heatFaculty"
        v-model:building-id="heatBuildingId"
        :buildings="campusBuildings"
        :crowd-snapshot="crowdSnapshot"
        @pick="handleHeatPick"
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
        :crowd-entry="selectedCrowdEntry"
        :is-favorite="isFavorite(selectedBuildingId)"
        @toggle-favorite="toggleFavorite"
      />

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
          <span>当前路线 · {{ MODE_LABEL[travelMode] }}</span>
          <b>{{ activeRoute.name }}</b>
        </div>
        <p class="route-title">{{ routeLabel }}</p>
        <div v-if="routePlan?.reachable" class="route-stats-inline">
          <span>{{ routePlan.distanceMeters }} 米</span>
          <span>约 {{ routePlan.etaMinutes }} 分钟</span>
          <span>{{ Math.max(routePlan.stops.length - 2, 0) }} 个途经点</span>
        </div>
        <p v-else-if="routePlan?.unreachableLeg" class="route-warning compact">
          ⚠ {{ routePlan.unreachableLeg.reason }}
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
          <polyline
            v-if="miniMapPolyline"
            :points="miniMapPolyline"
            :class="{ bike: travelMode === 'bike' }"
          ></polyline>
        </svg>
        <i
          v-for="stop in miniMapStopPoints"
          :key="stop.id"
          class="map-stop"
          :style="{ left: `${stop.x}%`, top: `${stop.y}%` }"
        ></i>
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

    <HeatPopup
      :building="heatPopupBuilding"
      :entry="heatPopupEntry"
      @close="heatBuildingId = ''"
      @locate="handleHeatLocate"
    />

    <transition name="tour-hud">
      <section v-if="tourActive" class="tour-hud glass-panel">
        <div class="tour-hud-title">
          <span>路线飞行浏览中 · {{ MODE_LABEL[travelMode] }}</span>
          <button type="button" @click="toggleTourPause">{{ tourPaused ? '继续' : '暂停' }}</button>
          <button type="button" @click="stopTour">结束</button>
        </div>
        <p v-if="activeTourStop">
          <em>{{ activeTourStop.index + 1 }}/{{ routePlan.stops.length }}</em>
          正在经过：<strong>{{ activeTourStop.buildingName }}</strong>
        </p>
      </section>
    </transition>

    <PersonalCenter
      :open="personalOpen"
      :buildings="campusBuildings"
      :favorite-buildings="favoriteBuildings"
      :saved-routes="savedRoutes"
      :history="history"
      @close="personalOpen = false"
      @locate-building="locateBuilding"
      @replay-route="replayRoute"
      @remove-route="removeRoute"
      @remove-history="removeHistory"
    />
  </main>
</template>

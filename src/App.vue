<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import CampusScene from './components/CampusScene.vue';
import ControlPanel from './components/ControlPanel.vue';
import InfoPanel from './components/InfoPanel.vue';
import { campusBuildings, categoryNames, recommendedRoutes } from './mock/campusData';
import { findCampusPath, toMiniMapPoint } from './utils/pathfinding';
import { readAllStations } from './env/model.js';
import { evaluateMetric } from './env/environment.js';
import { useAlerts } from './env/useAlerts.js';
import { usePersistentState } from './env/usePersistentState.js';
import EnvironmentPanel from './components/env/EnvironmentPanel.vue';
import WeatherPanel from './components/env/WeatherPanel.vue';
import TimeAxisBar from './components/env/TimeAxisBar.vue';
import AlertCenter from './components/env/AlertCenter.vue';
import StationDetailCard from './components/env/StationDetailCard.vue';

const activeCategory = ref('all');
const selectedBuildingId = ref(campusBuildings[0].id);
const focusedBuildingId = ref(campusBuildings[0].id);
const routeStartId = ref('gate');
const routeEndId = ref('library');
const routeFocusKey = ref(0);
const cameraMode = ref('near');
const cameraFocusKey = ref(0);
const cameraHeading = ref(45);
const panoramaMode = ref(false);
let buildingSelectTimer;

const envPrefs = usePersistentState('campus-env-prefs-v1', {
  weather: 'sunny',
  timeHours: 12,
  region: 'all',
  metric: 'aqi',
  layerVisible: true
});
const weather = computed({
  get: () => envPrefs.value.weather,
  set: (value) => { envPrefs.value.weather = value; }
});
const timeHours = computed({
  get: () => envPrefs.value.timeHours,
  set: (value) => { envPrefs.value.timeHours = value; }
});
const monitorRegion = computed({
  get: () => envPrefs.value.region,
  set: (value) => { envPrefs.value.region = value; }
});
const monitorMetric = computed({
  get: () => envPrefs.value.metric,
  set: (value) => { envPrefs.value.metric = value; }
});
const layerVisible = computed({
  get: () => envPrefs.value.layerVisible,
  set: (value) => { envPrefs.value.layerVisible = value; }
});

const timePlaying = ref(false);
const selectedStationId = ref('');

const stationSnapshots = computed(() => readAllStations(timeHours.value, weather.value));

const clockText = computed(() => {
  const totalMinutes = Math.round(timeHours.value * 60);
  return `${String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
});

const weatherText = computed(() => ({ sunny: '晴', rain: '雨', fog: '雾', snow: '雪' }[weather.value]));

const { activeAlerts, pendingCount, handleAlert, undoAlert, handleAll } = useAlerts(
  stationSnapshots,
  clockText,
  weatherText
);

const visibleStationSnapshots = computed(() => {
  if (!layerVisible.value) {
    return [];
  }
  return stationSnapshots.value.filter(
    ({ station }) => monitorRegion.value === 'all' || station.region === monitorRegion.value
  );
});

const selectedStationSnapshot = computed(() => {
  if (!selectedStationId.value) {
    return null;
  }
  return stationSnapshots.value.find(({ station }) => station.id === selectedStationId.value) || null;
});

function handleStationSelect(stationId) {
  selectedStationId.value = stationId;
}

function closeStationCard() {
  selectedStationId.value = '';
}

function selectStationMetric(metricKey) {
  monitorMetric.value = metricKey;
}

function locateAlert(alert) {
  selectedStationId.value = alert.stationId;
  monitorRegion.value = 'all';
}

let timePlayTimer;

onMounted(() => {
  timePlayTimer = window.setInterval(() => {
    if (!timePlaying.value) {
      return;
    }
    timeHours.value = (timeHours.value + 0.1) % 24;
  }, 240);
});

watch(selectedStationId, (id) => {
  if (id && !layerVisible.value) {
    layerVisible.value = true;
  }
});

const selectedBuilding = computed(() => {
  return campusBuildings.find((building) => building.id === selectedBuildingId.value) || campusBuildings[0];
});

const filteredBuildings = computed(() => {
  if (activeCategory.value === 'all') {
    return campusBuildings;
  }

  return campusBuildings.filter((building) => building.category === activeCategory.value);
});

const route = computed(() => {
  if (!routeStartId.value || !routeEndId.value || routeStartId.value === routeEndId.value) {
    return null;
  }

  return {
    start: routeStartId.value,
    end: routeEndId.value
  };
});

const routeLabel = computed(() => {
  const start = campusBuildings.find((building) => building.id === routeStartId.value);
  const end = campusBuildings.find((building) => building.id === routeEndId.value);
  return start && end ? `${start.name} -> ${end.name}` : '请选择路线';
});

const routeBuildings = computed(() => {
  return {
    start: campusBuildings.find((building) => building.id === routeStartId.value),
    end: campusBuildings.find((building) => building.id === routeEndId.value)
  };
});

const miniMapRoutePoints = computed(() => {
  return findCampusPath(routeBuildings.value.start, routeBuildings.value.end).map(toMiniMapPoint);
});

const miniMapPolyline = computed(() => {
  return miniMapRoutePoints.value.map((point) => `${point.x},${point.y}`).join(' ');
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
  { label: '今日访问', value: 1286, suffix: '人次' },
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

const mapStations = computed(() => {
  return stationSnapshots.value.map(({ station, readings }) => {
    const result = evaluateMetric(monitorMetric.value, readings[monitorMetric.value]);
    return {
      id: station.id,
      name: station.name,
      region: station.region,
      levelLabel: result.levelLabel,
      color: result.color,
      exceeded: result.exceeded,
      mapX: ((station.position[0] + 22) / 44) * 100,
      mapY: ((station.position[2] + 17) / 34) * 100
    };
  });
});

function handleBuildingSelect(building) {
  const previousBuildingId = selectedBuildingId.value;
  focusedBuildingId.value = building.id;
  cameraMode.value = 'near';

  if (previousBuildingId && previousBuildingId !== building.id) {
    routeStartId.value = previousBuildingId;
    routeEndId.value = building.id;
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
  routeStartId.value = recommendedRoute.start;
  routeEndId.value = recommendedRoute.end;
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

onBeforeUnmount(() => {
  window.clearTimeout(buildingSelectTimer);
  window.clearInterval(timePlayTimer);
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
      :route="route"
      :weather="weather"
      :time-hours="timeHours"
      :layer-visible="layerVisible"
      :monitor-region="monitorRegion"
      :monitor-metric="monitorMetric"
      :station-data="stationSnapshots"
      :selected-station-id="selectedStationId"
      @select-building="handleBuildingSelect"
      @select-station="handleStationSelect"
      @camera-state="handleCameraState"
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

    <header class="screen-header">
      <div class="brand-mark">V</div>
      <div>
        <p>Virtual Campus</p>
        <h1>Three.js 3D在线虚拟校园导览平台</h1>
      </div>
      <div class="system-status">
        <span>WebGL 在线</span>
        <span>Three.js 场景同步</span>
        <span>{{ weatherText }} · 监测{{ stationSnapshots.length }}点</span>
        <strong>{{ clockText }}</strong>
      </div>
    </header>

    <AlertCenter
      :alerts="activeAlerts"
      :pending-count="pendingCount"
      :selected-station-id="selectedStationId"
      @handle="handleAlert"
      @undo="undoAlert"
      @handle-all="handleAll"
      @locate="locateAlert"
    />

    <ControlPanel
      v-model:category="activeCategory"
      v-model:start-id="routeStartId"
      v-model:end-id="routeEndId"
      :buildings="campusBuildings"
      :filtered-buildings="filteredBuildings"
      :recommended-routes="recommendedRoutes"
      @search="handleSearch"
      @route-pick="applyRecommendedRoute"
    />

    <aside class="left-hud">
      <EnvironmentPanel
        v-model:layer-visible="layerVisible"
        v-model:region="monitorRegion"
        v-model:metric="monitorMetric"
        :snapshots="stationSnapshots"
        :visible-count="visibleStationSnapshots.length"
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
      <InfoPanel :building="selectedBuilding" />

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

      <WeatherPanel v-model:weather="weather" :time-hours="timeHours" />

      <section class="glass-panel">
        <div class="panel-heading">
          <span>当前路线</span>
          <b>{{ activeRoute.name }}</b>
        </div>
        <p class="route-title">{{ routeLabel }}</p>
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
        <i
          v-for="item in mapStations"
          :key="item.id"
          class="map-station"
          :class="{ active: selectedStationId === item.id, hidden: !layerVisible || (monitorRegion !== 'all' && monitorRegion !== item.region) }"
          :style="{ left: `${item.mapX}%`, top: `${item.mapY}%`, '--station-color': item.color }"
          :title="`${item.name} ${item.levelLabel}`"
          @click="handleStationSelect(item.id)"
        ></i>
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

    <Transition name="station-pop">
      <StationDetailCard
        v-if="selectedStationSnapshot"
        :station="selectedStationSnapshot.station"
        :readings="selectedStationSnapshot.readings"
        :time-hours="timeHours"
        :weather="weather"
        :active-metric="monitorMetric"
        @close="closeStationCard"
        @select-metric="selectStationMetric"
      />
    </Transition>

    <TimeAxisBar
      v-model:time-hours="timeHours"
      v-model:playing="timePlaying"
    />
  </main>
</template>

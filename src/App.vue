<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import CampusScene from './components/CampusScene.vue';
import ControlPanel from './components/ControlPanel.vue';
import InfoPanel from './components/InfoPanel.vue';
import OpsDock from './components/OpsDock.vue';
import DeviceDetailCard from './components/DeviceDetailCard.vue';
import { campusBuildings, categoryNames, recommendedRoutes } from './mock/campusData';
import { findCampusPath, toMiniMapPoint } from './utils/pathfinding';
import {
  deviceState,
  visibleDeviceIds,
  selectedDevice,
  selectDevice,
  startDeviceTelemetry,
  stopDeviceTelemetry
} from './store/deviceStore';

const activeCategory = ref('all');
const selectedBuildingId = ref(campusBuildings[0].id);
const focusedBuildingId = ref(campusBuildings[0].id);
const routeStartId = ref('gate');
const routeEndId = ref('library');
const routeFocusKey = ref(0);
const cameraMode = ref('near');
const cameraFocusKey = ref(0);
const sceneMode = ref('day');
const cameraHeading = ref(45);
const panoramaMode = ref(false);
let buildingSelectTimer;

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

function handleDeviceSelect(device) {
  selectDevice(device);
}

onMounted(() => {
  startDeviceTelemetry();
});

onBeforeUnmount(() => {
  window.clearTimeout(buildingSelectTimer);
  stopDeviceTelemetry();
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
      :route="route"
      :devices="deviceState.devices"
      :device-layer-visible="deviceState.layerVisible"
      :visible-device-ids="[...visibleDeviceIds]"
      :selected-device-id="deviceState.selectedDeviceId"
      :device-focus-key="deviceState.deviceFocusKey"
      :saving-mode="deviceState.savingMode"
      @select-building="handleBuildingSelect"
      @select-device="handleDeviceSelect"
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
        <strong>17:38</strong>
      </div>
    </header>

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

    <DeviceDetailCard :device="selectedDevice" />
    <OpsDock />
  </main>
</template>

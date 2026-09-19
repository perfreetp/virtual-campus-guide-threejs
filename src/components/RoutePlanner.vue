<script setup>
import { computed, ref } from 'vue';
import { estimateMinutes, formatDistance, TRAVEL_MODES } from '../utils/pathfinding';

const props = defineProps({
  buildings: {
    type: Array,
    required: true
  },
  recommendedRoutes: {
    type: Array,
    default: () => []
  },
  startId: {
    type: String,
    required: true
  },
  endId: {
    type: String,
    required: true
  },
  waypointIds: {
    type: Array,
    default: () => []
  },
  mode: {
    type: String,
    default: 'walk'
  },
  plan: {
    type: Object,
    default: null
  },
  flying: {
    type: Boolean,
    default: false
  },
  activeStopIndex: {
    type: Number,
    default: -1
  }
});

const emit = defineEmits([
  'update:startId',
  'update:endId',
  'update:waypointIds',
  'update:mode',
  'fly',
  'stopFly',
  'saveRoute',
  'routePick'
]);

const waypointCandidate = ref('');

const buildingName = computed(() => {
  const map = new Map(props.buildings.map((building) => [building.id, building.name]));
  return (id) => map.get(id) || id;
});

const waypointOptions = computed(() => {
  return props.buildings.filter((building) => {
    return building.id !== props.startId
      && building.id !== props.endId
      && !props.waypointIds.includes(building.id);
  });
});

const totalMinutes = computed(() => {
  return props.plan?.reachable ? estimateMinutes(props.plan.totalDistance, props.mode) : 0;
});

function addWaypoint() {
  if (!waypointCandidate.value) {
    return;
  }
  emit('update:waypointIds', [...props.waypointIds, waypointCandidate.value]);
  waypointCandidate.value = '';
}

function removeWaypoint(id) {
  emit('update:waypointIds', props.waypointIds.filter((item) => item !== id));
}
</script>

<template>
  <section class="glass-panel route-planner" aria-label="智能路线规划">
    <div class="panel-heading">
      <span>智能路线规划</span>
      <b>{{ TRAVEL_MODES[mode].label }}模式</b>
    </div>

    <div class="mode-switch" role="group" aria-label="出行方式">
      <button
        v-for="(item, key) in TRAVEL_MODES"
        :key="key"
        type="button"
        :class="{ active: mode === key }"
        @click="emit('update:mode', key)"
      >
        {{ item.label }}
      </button>
    </div>

    <div class="route-selects">
      <label>
        <span>起点</span>
        <select :value="startId" @change="emit('update:startId', $event.target.value)">
          <option v-for="building in buildings" :key="building.id" :value="building.id">
            {{ building.name }}
          </option>
        </select>
      </label>
      <label>
        <span>终点</span>
        <select :value="endId" @change="emit('update:endId', $event.target.value)">
          <option v-for="building in buildings" :key="building.id" :value="building.id">
            {{ building.name }}
          </option>
        </select>
      </label>
    </div>

    <div class="waypoint-editor">
      <div class="waypoint-add">
        <select v-model="waypointCandidate" aria-label="选择途经点">
          <option value="" disabled>添加途经点…</option>
          <option v-for="building in waypointOptions" :key="building.id" :value="building.id">
            {{ building.name }}
          </option>
        </select>
        <button type="button" :disabled="!waypointCandidate" @click="addWaypoint">添加</button>
      </div>
      <div v-if="waypointIds.length" class="waypoint-chips">
        <span v-for="id in waypointIds" :key="id" class="waypoint-chip">
          {{ buildingName(id) }}
          <button type="button" :aria-label="`移除${buildingName(id)}`" @click="removeWaypoint(id)">×</button>
        </span>
      </div>
    </div>

    <p v-if="plan && !plan.reachable" class="route-message">{{ plan.message }}</p>

    <template v-if="plan?.reachable">
      <div class="route-summary">
        <strong>{{ formatDistance(plan.totalDistance) }}</strong>
        <span>预计 {{ totalMinutes }} 分钟 · {{ plan.stops.length }} 个站点</span>
      </div>
      <ol class="stop-list">
        <li
          v-for="(stop, index) in plan.stops"
          :key="stop.id"
          :class="{ active: index === activeStopIndex }"
        >
          <i :data-type="stop.type"></i>
          <span>{{ stop.name }}</span>
          <em>{{ index === 0 ? '出发' : formatDistance(stop.distanceFromStart) }}</em>
        </li>
      </ol>
    </template>

    <div class="planner-actions">
      <button
        v-if="!flying"
        type="button"
        class="primary"
        :disabled="!plan?.reachable"
        @click="emit('fly')"
      >
        飞行浏览
      </button>
      <button v-else type="button" class="primary" @click="emit('stopFly')">停止飞行</button>
      <button type="button" :disabled="!plan?.reachable" @click="emit('saveRoute')">保存路线</button>
    </div>

    <div v-if="recommendedRoutes.length" class="route-buttons">
      <button
        v-for="routeItem in recommendedRoutes"
        :key="routeItem.id"
        type="button"
        @click="emit('routePick', routeItem)"
      >
        {{ routeItem.name }}
      </button>
    </div>
  </section>
</template>

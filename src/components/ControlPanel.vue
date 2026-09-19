<script setup>
import { computed, ref } from 'vue';
import { categories } from '../mock/campusData';

const props = defineProps({
  buildings: {
    type: Array,
    required: true
  },
  filteredBuildings: {
    type: Array,
    required: true
  },
  recommendedRoutes: {
    type: Array,
    required: true
  },
  category: {
    type: String,
    required: true
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
  travelMode: {
    type: String,
    default: 'walk'
  },
  routePlan: {
    type: Object,
    default: null
  },
  tourActive: {
    type: Boolean,
    default: false
  },
  tourPaused: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'update:category',
  'update:startId',
  'update:endId',
  'update:waypointIds',
  'update:travelMode',
  'search',
  'routePick',
  'tour-start',
  'tour-toggle-pause',
  'tour-stop',
  'save-route'
]);

const searchKeyword = ref('');

const searchOptions = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return [];
  }

  return props.buildings.filter((building) => {
    return building.name.toLowerCase().includes(keyword) || building.intro.toLowerCase().includes(keyword);
  });
});

const waypointCandidates = computed(() => {
  const usedIds = new Set([props.startId, props.endId, ...props.waypointIds]);
  return props.buildings.filter((building) => !usedIds.has(building.id));
});

const waypointNames = computed(() => {
  return props.waypointIds
    .map((id) => props.buildings.find((building) => building.id === id)?.name)
    .filter(Boolean);
});

function handleSearchSubmit() {
  const keyword = searchKeyword.value.trim().toLowerCase();
  const matched = props.buildings.find((building) => {
    return building.name.toLowerCase().includes(keyword);
  }) || searchOptions.value[0];

  emit('search', matched);
}

function addWaypoint(event) {
  const id = event.target.value;
  event.target.value = '';
  if (!id || props.waypointIds.includes(id)) {
    return;
  }

  emit('update:waypointIds', [...props.waypointIds, id]);
}

function removeWaypoint(id) {
  emit('update:waypointIds', props.waypointIds.filter((item) => item !== id));
}
</script>

<template>
  <aside class="control-panel" aria-label="校园导览控制区">
    <div class="filter-row">
      <button
        v-for="item in categories"
        :key="item.value"
        class="chip"
        :class="{ active: category === item.value }"
        type="button"
        @click="emit('update:category', item.value)"
      >
        {{ item.label }}
      </button>
    </div>

    <form class="search-box" @submit.prevent="handleSearchSubmit">
      <label class="search-field">
        <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
          <circle cx="11" cy="11" r="6.2"></circle>
          <path d="m16 16 4.2 4.2"></path>
        </svg>
        <input
          v-model="searchKeyword"
          type="search"
          list="building-search-list"
          placeholder="搜索建筑 / 地点 / 功能"
          aria-label="搜索建筑"
        />
      </label>
      <button type="submit">定位</button>
      <datalist id="building-search-list">
        <option v-for="building in searchOptions" :key="building.id" :value="building.name" />
      </datalist>
    </form>

    <div class="route-box">
      <div class="mode-switch" role="tablist" aria-label="出行方式">
        <button
          type="button"
          :class="{ active: travelMode === 'walk' }"
          @click="emit('update:travelMode', 'walk')"
        >步行</button>
        <button
          type="button"
          :class="{ active: travelMode === 'bike' }"
          @click="emit('update:travelMode', 'bike')"
        >骑行</button>
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

      <div class="waypoint-row">
        <span class="waypoint-caption">途经点（按顺序经过）</span>
        <div v-if="waypointNames.length" class="waypoint-tags">
          <span v-for="(name, index) in waypointNames" :key="waypointIds[index]" class="waypoint-tag">
            <em>{{ index + 1 }}</em>{{ name }}
            <button type="button" aria-label="移除途经点" @click="removeWaypoint(waypointIds[index])">×</button>
          </span>
        </div>
        <select aria-label="添加途经点" @change="addWaypoint">
          <option value="">＋ 添加途经点</option>
          <option v-for="building in waypointCandidates" :key="building.id" :value="building.id">
            {{ building.name }}
          </option>
        </select>
      </div>

      <div v-if="routePlan?.reachable" class="route-summary" :class="travelMode">
        <div>
          <span>全程</span>
          <strong>{{ routePlan.distanceMeters }}</strong>
          <em>米</em>
        </div>
        <div>
          <span>预计用时</span>
          <strong>{{ routePlan.etaMinutes }}</strong>
          <em>分钟</em>
        </div>
        <div>
          <span>途经点</span>
          <strong>{{ Math.max(routePlan.stops.length - 2, 0) }}</strong>
          <em>个</em>
        </div>
      </div>

      <p v-else-if="routePlan?.unreachableLeg" class="route-warning" role="alert">
        <b>路径不可达</b>
        {{ routePlan.unreachableLeg.reason }}
      </p>

      <div class="tour-controls">
        <template v-if="!tourActive">
          <button
            class="tour-primary"
            type="button"
            :disabled="!routePlan?.reachable"
            @click="emit('tour-start')"
          >▶ 沿路线飞行浏览</button>
          <button
            type="button"
            :disabled="!routePlan?.reachable"
            @click="emit('save-route')"
          >收藏路线</button>
        </template>
        <template v-else>
          <button class="tour-primary" type="button" @click="emit('tour-toggle-pause')">
            {{ tourPaused ? '继续' : '暂停' }}
          </button>
          <button type="button" @click="emit('tour-stop')">结束浏览</button>
        </template>
      </div>

      <div class="route-buttons">
        <button
          v-for="routeItem in recommendedRoutes"
          :key="routeItem.id"
          type="button"
          @click="emit('routePick', routeItem)"
        >
          {{ routeItem.name }}
        </button>
      </div>
    </div>
  </aside>
</template>

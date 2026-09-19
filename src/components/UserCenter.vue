<script setup>
import { computed, ref } from 'vue';
import { formatDistance, TRAVEL_MODES } from '../utils/pathfinding';

const props = defineProps({
  buildings: {
    type: Array,
    required: true
  },
  favorites: {
    type: Array,
    default: () => []
  },
  savedRoutes: {
    type: Array,
    default: () => []
  },
  history: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['toggleFavorite', 'applyRoute', 'replay', 'removeRoute', 'clearHistory', 'selectBuilding']);

const open = ref(false);
const activeTab = ref('routes');

const tabs = [
  { key: 'routes', label: '我的路线' },
  { key: 'favorites', label: '收藏建筑' },
  { key: 'history', label: '导览记录' }
];

const buildingName = computed(() => {
  const map = new Map(props.buildings.map((building) => [building.id, building.name]));
  return (id) => map.get(id) || id;
});

const favoriteBuildings = computed(() => {
  return props.buildings.filter((building) => props.favorites.includes(building.id));
});

function routeTitle(route) {
  const stops = [route.start, ...(route.waypoints || []), route.end]
    .map((id) => buildingName.value(id));
  return stops.join(' → ');
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
</script>

<template>
  <div class="user-center">
    <button
      class="user-center-toggle"
      type="button"
      :aria-expanded="open"
      @click="open = !open"
    >
      个人中心
    </button>

    <section v-if="open" class="user-center-panel glass-panel" aria-label="个人中心">
      <div class="panel-heading">
        <span>个人中心</span>
        <b>本地持久化</b>
      </div>

      <div class="user-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="activeTab === 'routes'" class="user-list">
        <p v-if="!savedRoutes.length" class="user-empty">暂无保存的路线，可在路线规划中点击「保存路线」</p>
        <article v-for="route in savedRoutes" :key="route.id" class="user-item">
          <div>
            <strong>{{ route.name }}</strong>
            <span>{{ routeTitle(route) }}</span>
            <em>{{ TRAVEL_MODES[route.mode]?.label || '步行' }} · {{ formatDistance(route.totalDistance) }}</em>
          </div>
          <div class="user-item-actions">
            <button type="button" @click="emit('applyRoute', route)">应用</button>
            <button type="button" @click="emit('removeRoute', route.id)">删除</button>
          </div>
        </article>
      </div>

      <div v-else-if="activeTab === 'favorites'" class="user-list">
        <p v-if="!favoriteBuildings.length" class="user-empty">暂无收藏建筑，可在建筑信息面板点击「收藏」</p>
        <article v-for="building in favoriteBuildings" :key="building.id" class="user-item">
          <div>
            <strong>{{ building.name }}</strong>
            <span>{{ building.intro }}</span>
          </div>
          <div class="user-item-actions">
            <button type="button" @click="emit('selectBuilding', building)">定位</button>
            <button type="button" @click="emit('toggleFavorite', building.id)">取消</button>
          </div>
        </article>
      </div>

      <div v-else class="user-list">
        <p v-if="!history.length" class="user-empty">暂无导览记录，完成一次路线规划后自动记录</p>
        <article v-for="item in history" :key="item.id" class="user-item">
          <div>
            <strong>{{ routeTitle(item) }}</strong>
            <span>{{ formatTime(item.time) }} · {{ TRAVEL_MODES[item.mode]?.label || '步行' }} · {{ formatDistance(item.totalDistance) }}</span>
          </div>
          <div class="user-item-actions">
            <button type="button" @click="emit('replay', item)">回放</button>
          </div>
        </article>
        <button v-if="history.length" class="user-clear" type="button" @click="emit('clearHistory')">
          清空记录
        </button>
      </div>
    </section>
  </div>
</template>

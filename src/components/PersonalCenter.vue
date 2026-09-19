<script setup>
import { MODE_LABEL } from '../utils/pathfinding';

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  buildings: {
    type: Array,
    required: true
  },
  favoriteBuildings: {
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

const emit = defineEmits(['close', 'locate-building', 'replay-route', 'remove-route', 'remove-history']);

function buildingName(id) {
  return props.buildings.find((building) => building.id === id)?.name || '未知地点';
}

function routeText(route) {
  const names = [route.startId, ...(route.waypointIds || []), route.endId].map(buildingName);
  return names.join(' → ');
}

function formatTime(iso) {
  const date = new Date(iso);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
</script>

<template>
  <div v-if="open" class="personal-mask" @click.self="emit('close')">
    <aside class="personal-drawer glass-panel" role="dialog" aria-label="个人中心">
      <div class="personal-heading">
        <div>
          <p class="panel-label">个人中心</p>
          <h2>我的导览档案</h2>
        </div>
        <button type="button" aria-label="关闭个人中心" @click="emit('close')">×</button>
      </div>

      <div class="personal-summary">
        <div><strong>{{ savedRoutes.length }}</strong><span>保存路线</span></div>
        <div><strong>{{ favoriteBuildings.length }}</strong><span>收藏建筑</span></div>
        <div><strong>{{ history.length }}</strong><span>导览记录</span></div>
      </div>

      <section class="personal-section">
        <h3>保存的路线</h3>
        <p v-if="!savedRoutes.length" class="personal-empty">在导览面板规划路线后点击「收藏路线」即可保存。</p>
        <ul v-else class="personal-list">
          <li v-for="route in savedRoutes" :key="route.id">
            <div>
              <strong>{{ route.name || '自定义路线' }}</strong>
              <em>{{ routeText(route) }}</em>
              <span>{{ MODE_LABEL[route.mode] || '步行' }} · {{ route.distanceMeters }} 米 · 约 {{ route.etaMinutes }} 分钟</span>
            </div>
            <div class="personal-actions">
              <button type="button" @click="emit('replay-route', route)">回放</button>
              <button type="button" class="danger" @click="emit('remove-route', route.id)">删除</button>
            </div>
          </li>
        </ul>
      </section>

      <section class="personal-section">
        <h3>收藏的建筑</h3>
        <p v-if="!favoriteBuildings.length" class="personal-empty">在右侧建筑信息卡片点击星标即可收藏。</p>
        <ul v-else class="personal-list">
          <li v-for="building in favoriteBuildings" :key="building.id">
            <div>
              <strong>{{ building.name }}</strong>
              <em>{{ building.intro }}</em>
            </div>
            <div class="personal-actions">
              <button type="button" @click="emit('locate-building', building)">定位</button>
            </div>
          </li>
        </ul>
      </section>

      <section class="personal-section">
        <h3>最近导览记录</h3>
        <p v-if="!history.length" class="personal-empty">开始一次沿路线飞行浏览后，这里会保留导览记录。</p>
        <ul v-else class="personal-list">
          <li v-for="record in history" :key="record.id">
            <div>
              <strong>{{ routeText(record) }}</strong>
              <span>{{ MODE_LABEL[record.mode] || '步行' }} · {{ formatTime(record.createdAt) }}</span>
            </div>
            <div class="personal-actions">
              <button type="button" class="tour-primary" @click="emit('replay-route', record)">一键回放</button>
              <button type="button" class="danger" @click="emit('remove-history', record.id)">删除</button>
            </div>
          </li>
        </ul>
      </section>
    </aside>
  </div>
</template>

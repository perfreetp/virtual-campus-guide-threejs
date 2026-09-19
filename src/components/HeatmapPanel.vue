<script setup>
import { computed } from 'vue';
import { crowdLevels, departments } from '../mock/crowdData';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  buildings: {
    type: Array,
    required: true
  },
  crowd: {
    type: Object,
    default: () => ({})
  },
  filter: {
    type: Object,
    default: () => ({ department: 'all', buildingId: 'all' })
  }
});

const emit = defineEmits(['update:visible', 'update:filter']);

const filteredBuildings = computed(() => {
  return props.buildings.filter((building) => {
    const info = props.crowd[building.id];
    if (!info) {
      return false;
    }
    return props.filter.department === 'all' || info.department === props.filter.department;
  });
});

const summary = computed(() => {
  const list = Object.values(props.crowd);
  return {
    total: list.reduce((sum, item) => sum + item.people, 0),
    warning: list.filter((item) => item.level === 'warning').length,
    busy: list.filter((item) => item.level === 'busy').length
  };
});

function updateFilter(key, value) {
  emit('update:filter', { ...props.filter, [key]: value });
}
</script>

<template>
  <section class="glass-panel heatmap-panel" aria-label="实时人流热力">
    <div class="panel-heading">
      <span>实时人流热力</span>
      <b>{{ visible ? '已开启' : '已关闭' }}</b>
    </div>

    <div class="mode-switch">
      <button type="button" :class="{ active: visible }" @click="emit('update:visible', true)">热力图</button>
      <button type="button" :class="{ active: !visible }" @click="emit('update:visible', false)">关闭</button>
    </div>

    <template v-if="visible">
      <div class="heat-summary">
        <div>
          <span>在园人数</span>
          <strong>{{ summary.total }}</strong>
        </div>
        <div>
          <span>较拥挤</span>
          <strong>{{ summary.busy }}</strong>
        </div>
        <div>
          <span>预警楼栋</span>
          <strong :class="{ danger: summary.warning > 0 }">{{ summary.warning }}</strong>
        </div>
      </div>

      <div class="route-selects">
        <label>
          <span>院系筛选</span>
          <select :value="filter.department" @change="updateFilter('department', $event.target.value)">
            <option v-for="item in departments" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
        <label>
          <span>楼栋筛选</span>
          <select :value="filter.buildingId" @change="updateFilter('buildingId', $event.target.value)">
            <option value="all">全部楼栋</option>
            <option v-for="building in filteredBuildings" :key="building.id" :value="building.id">
              {{ building.name }}
            </option>
          </select>
        </label>
      </div>

      <div class="heat-legend">
        <span v-for="level in crowdLevels" :key="level.key">
          <i :style="{ background: level.color }"></i>{{ level.label }}
        </span>
      </div>

      <p class="heat-hint">点击场景中的热力柱可查看楼栋人流详情</p>
    </template>
  </section>
</template>

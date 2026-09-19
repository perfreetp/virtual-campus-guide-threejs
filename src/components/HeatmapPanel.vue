<script setup>
import { computed } from 'vue';
import { faculties } from '../mock/campusData';
import { getHeatLevel, getWarningText, heatLevels } from '../utils/heatmap';

const props = defineProps({
  enabled: {
    type: Boolean,
    default: false
  },
  faculty: {
    type: String,
    default: 'all'
  },
  buildingId: {
    type: String,
    default: ''
  },
  buildings: {
    type: Array,
    required: true
  },
  crowdSnapshot: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:enabled', 'update:faculty', 'update:buildingId', 'pick']);

const buildingOptions = computed(() => {
  return props.buildings
    .filter((building) => props.faculty === 'all' || building.faculty === props.faculty)
    .map((building) => {
      const entry = props.crowdSnapshot?.entries.find((item) => item.id === building.id);
      return { ...building, density: entry?.density ?? 0 };
    })
    .sort((a, b) => b.density - a.density);
});

const warningCount = computed(() => {
  return props.crowdSnapshot?.entries.filter((entry) => entry.warning).length || 0;
});

const snapshotTime = computed(() => {
  if (!props.crowdSnapshot?.time) {
    return '';
  }

  const date = new Date(props.crowdSnapshot.time);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
});

function selectBuilding(id) {
  emit('update:buildingId', id);
  emit('pick', id);
}
</script>

<template>
  <section class="glass-panel heat-panel">
    <div class="panel-heading">
      <span>实时人流热力</span>
      <label class="heat-switch">
        <input
          type="checkbox"
          :checked="enabled"
          @change="emit('update:enabled', $event.target.checked)"
        />
        <i></i>
      </label>
    </div>

    <template v-if="enabled">
      <div class="heat-meta">
        <b>{{ warningCount }}</b><span>个楼栋触发预警</span>
        <em v-if="snapshotTime">{{ snapshotTime }} 刷新</em>
      </div>

      <div class="heat-filters">
        <select :value="faculty" @change="emit('update:faculty', $event.target.value)">
          <option v-for="item in faculties" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <select :value="buildingId" @change="selectBuilding($event.target.value)">
          <option value="">全部楼栋</option>
          <option v-for="building in buildingOptions" :key="building.id" :value="building.id">
            {{ building.name }} · {{ Math.round(building.density * 100) }}%
          </option>
        </select>
      </div>

      <ul class="heat-rank">
        <li v-for="building in buildingOptions.slice(0, 5)" :key="building.id">
          <button
            type="button"
            :class="{ active: buildingId === building.id }"
            @click="selectBuilding(building.id)"
          >
            <span>{{ building.name }}</span>
            <i :style="{ width: `${Math.round(building.density * 100)}%`, background: getHeatLevel(building.density).color }"></i>
            <strong :style="{ color: getHeatLevel(building.density).color }">{{ Math.round(building.density * 100) }}%</strong>
          </button>
        </li>
      </ul>

      <div class="heat-legend">
        <span v-for="level in heatLevels" :key="level.label">
          <i :style="{ background: level.color }"></i>{{ level.label }}
        </span>
      </div>
      <p class="heat-tip">点击地面热区可查看楼栋楼层、人数与预警信息</p>
    </template>
  </section>
</template>

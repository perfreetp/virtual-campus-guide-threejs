<script setup>
import { computed } from 'vue';
import TrendChart from './TrendChart.vue';
import { useDeviceMonitor } from '../composables/useDeviceMonitor';
import { campusBuildings } from '../mock/campusData';
import { deviceTypes } from '../mock/deviceData';

const {
  energy,
  energyFilter,
  energyBuildingIds,
  savedEnergy,
  energyAppliedAt,
  applyEnergy,
  cancelEnergy,
  isScopeEnergyOn,
  ALL_BUILDINGS
} = useDeviceMonitor();

const dimensionEntries = [
  { value: 'building', label: '楼栋' },
  { value: 'type', label: '类型' }
];
const rangeEntries = [
  { value: 'today', label: '当日' },
  { value: 'week', label: '近7天' }
];

const selectorOptions = computed(() => {
  return energyFilter.dimension === 'building'
    ? [{ id: 'all', name: '全校' }, ...campusBuildings]
    : [{ id: 'all', name: '全部类型' }, ...deviceTypes.map((item) => ({ id: item.value, name: item.label }))];
});

const currentEntry = computed(() => {
  const source = energyFilter.dimension === 'building' ? energy.byBuilding : energy.byType;
  if (energyFilter.target === 'all') {
    return null;
  }
  return source[energyFilter.target] || null;
});

const ranking = computed(() => {
  const source = energyFilter.dimension === 'building' ? energy.byBuilding : energy.byType;
  return Object.values(source)
    .slice()
    .sort((a, b) => (energyFilter.range === 'today' ? b.today - a.today : b.weekTotal - a.weekTotal))
    .slice(0, 5);
});

const chartValues = computed(() => {
  if (energyFilter.range === 'today') {
    if (currentEntry.value) {
      return [currentEntry.value.today];
    }
    return Object.values(
      energyFilter.dimension === 'building' ? energy.byBuilding : energy.byType
    ).map((item) => item.today);
  }
  if (currentEntry.value) {
    return currentEntry.value.week;
  }
  return energy.weekLabels.map((_, index) => {
    const source = energyFilter.dimension === 'building' ? energy.byBuilding : energy.byType;
    return round1(Object.values(source).reduce((sum, item) => sum + item.week[index], 0));
  });
});

const chartLabels = computed(() => {
  if (energyFilter.range === 'today') {
    if (currentEntry.value) {
      return [currentEntry.value.name];
    }
    return Object.values(
      energyFilter.dimension === 'building' ? energy.byBuilding : energy.byType
    ).map((item) => item.name);
  }
  return energy.weekLabels;
});

function round1(value) {
  return Math.round(value * 10) / 10;
}

function selectDimension(value) {
  energyFilter.dimension = value;
  energyFilter.target = 'all';
}

const overviewTotal = computed(() => {
  const source = energyFilter.dimension === 'building' ? energy.byBuilding : energy.byType;
  return Object.values(source).reduce(
    (sum, item) => sum + (energyFilter.range === 'today' ? item.today : item.weekTotal),
    0
  );
});

const displayTotal = computed(() => {
  if (currentEntry.value) {
    return energyFilter.range === 'today' ? currentEntry.value.today : currentEntry.value.weekTotal;
  }
  return round1(overviewTotal.value);
});

const targetEnergyOn = computed(() => {
  if (energyFilter.target === 'all') {
    return energyBuildingIds.value.has(ALL_BUILDINGS);
  }
  return energyBuildingIds.value.has(ALL_BUILDINGS) || energyBuildingIds.value.has(energyFilter.target);
});

function dispatchEnergy() {
  if (energyFilter.target === 'all') {
    applyEnergy(ALL_BUILDINGS);
  } else {
    applyEnergy(energyFilter.target);
  }
}

function undoEnergy() {
  if (energyFilter.target === 'all') {
    cancelEnergy(ALL_BUILDINGS);
  } else {
    cancelEnergy(energyFilter.target);
  }
}

const appliedText = computed(() => {
  if (!energyAppliedAt.value) {
    return '';
  }
  const date = new Date(energyAppliedAt.value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} 下发`;
});
</script>

<template>
  <section class="glass-panel energy-panel">
    <div class="panel-heading">
      <span>能耗统计</span>
      <b>单位 kWh</b>
    </div>

    <div class="energy-switch-row">
      <div class="energy-segment">
        <button
          v-for="item in dimensionEntries"
          :key="item.value"
          type="button"
          :class="{ active: energyFilter.dimension === item.value }"
          @click="selectDimension(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
      <div class="energy-segment">
        <button
          v-for="item in rangeEntries"
          :key="item.value"
          type="button"
          :class="{ active: energyFilter.range === item.value }"
          @click="energyFilter.range = item.value"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <select class="energy-target" :value="energyFilter.target" @change="energyFilter.target = $event.target.value">
      <option v-for="item in selectorOptions" :key="item.id" :value="item.id">{{ item.name }}</option>
    </select>

    <div class="energy-summary">
      <label>
        <span>{{ currentEntry ? currentEntry.name : '全校总用电' }} · {{ energyFilter.range === 'today' ? '当日' : '近7天' }}</span>
        <strong>{{ displayTotal.toFixed(1) }}<em>kWh</em></strong>
      </label>
      <div class="energy-saved">
        <span>节能模式累计</span>
        <strong>-{{ savedEnergy.toFixed(1) }} <em>kWh</em></strong>
      </div>
    </div>

    <TrendChart
      :labels="chartLabels"
      :values="chartValues"
      :variant="energyFilter.range === 'today' ? 'bar' : 'line'"
      :color="energyFilter.dimension === 'type' ? '#4fe7a4' : '#35e9ff'"
      :height="energyFilter.range === 'today' ? 96 : 112"
      unit=" kWh"
    />

    <ul class="energy-ranking">
      <li v-for="(item, index) in ranking" :key="item.id">
        <i>{{ index + 1 }}</i>
        <span>{{ item.name }}</span>
        <em>{{ (energyFilter.range === 'today' ? item.today : item.weekTotal).toFixed(1) }}</em>
        <b v-if="isScopeEnergyOn(item.id)" class="energy-flag">节能</b>
      </li>
    </ul>

    <div class="energy-dispatch">
      <button
        v-if="!targetEnergyOn"
        type="button"
        class="energy-apply"
        @click="dispatchEnergy"
      >
        一键下发节能模式
      </button>
      <div v-else class="energy-feedback">
        <i></i>
        <div>
          <strong>节能模式已生效</strong>
          <small v-if="appliedText">{{ appliedText }} · 设备降功率运行</small>
        </div>
        <button type="button" @click="undoEnergy">取消</button>
      </div>
    </div>
  </section>
</template>

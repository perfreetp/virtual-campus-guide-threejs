<script setup>
import { computed } from 'vue';
import { campusBuildings } from '../mock/campusData';
import { deviceTypeList, deviceTypeNames, deviceTypeMeta } from '../mock/deviceData';
import {
  deviceState,
  energyScopedDevices,
  energyTodayBars,
  energyWeekBars,
  energyTodayTotal,
  energyWeekTotal,
  livePowerTotal,
  setEnergyFilters,
  toggleSavingMode
} from '../store/deviceStore';

const todayLabels = ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'];
const weekLabels = computed(() => {
  const labels = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 86400000);
    labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
  }
  return labels;
});

const todayMax = computed(() => Math.max(...energyTodayBars.value, 1));
const weekMax = computed(() => Math.max(...energyWeekBars.value, 1));

const savingMinutes = computed(() => {
  if (!deviceState.savingMode || !deviceState.savingActivatedAt) {
    return 0;
  }
  return Math.max(1, Math.round((Date.now() - deviceState.savingActivatedAt) / 60000));
});

const typeBreakdown = computed(() => {
  return Object.keys(deviceTypeNames)
    .map((type) => {
      const devices = energyScopedDevices.value.filter((device) => device.type === type);
      const total = devices.reduce((sum, device) => sum + device.weekSeries[6], 0)
        * (deviceState.savingMode ? 0.72 : 1);
      return {
        type,
        label: deviceTypeNames[type],
        color: deviceTypeMeta[type].color,
        count: devices.length,
        total: Math.round(total * 10) / 10
      };
    })
    .filter((item) => item.count > 0);
});
</script>

<template>
  <div class="ops-body energy-body">
    <div class="ops-filters">
      <select
        :value="deviceState.energyFilters.buildingId"
        @change="setEnergyFilters({ buildingId: $event.target.value })"
        aria-label="按楼栋统计能耗"
      >
        <option value="all">全部楼栋</option>
        <option v-for="building in campusBuildings" :key="building.id" :value="building.id">
          {{ building.name }}
        </option>
      </select>
      <div class="ops-type-row">
        <button
          v-for="item in deviceTypeList"
          :key="item.value"
          type="button"
          :class="{ active: deviceState.energyFilters.deviceType === item.value }"
          @click="setEnergyFilters({ deviceType: item.value })"
        >
          {{ item.label }}
        </button>
      </div>
      <button
        type="button"
        class="saving-button"
        :class="{ active: deviceState.savingMode }"
        @click="toggleSavingMode"
      >
        {{ deviceState.savingMode ? '退出节能模式' : '一键下发节能模式' }}
      </button>
    </div>

    <div class="energy-stats">
      <div>
        <span>实时功率</span>
        <strong>{{ livePowerTotal }}</strong>
        <em>kW</em>
      </div>
      <div>
        <span>当日用电</span>
        <strong>{{ energyTodayTotal }}</strong>
        <em>kWh</em>
      </div>
      <div>
        <span>近七天用电</span>
        <strong>{{ energyWeekTotal }}</strong>
        <em>kWh</em>
      </div>
    </div>

    <p v-if="deviceState.savingMode" class="saving-tip">
      节能模式已下发，当前设备限功率运行，已持续 {{ savingMinutes }} 分钟，预计节电约 28%
    </p>

    <div class="energy-chart-block">
      <div class="energy-chart-head">
        <span>当日分时用电</span>
        <b>kWh / 2小时</b>
      </div>
      <div class="energy-bars">
        <i
          v-for="(value, index) in energyTodayBars"
          :key="index"
          :style="{ height: `${Math.max(4, (value / todayMax) * 100)}%` }"
          :title="`${todayLabels[index]}:00 ${value} kWh`"
        ></i>
      </div>
      <div class="energy-scale">
        <span v-for="label in todayLabels" :key="label">{{ label }}</span>
      </div>
    </div>

    <div class="energy-chart-block">
      <div class="energy-chart-head">
        <span>近七天用电</span>
        <b>kWh / 天</b>
      </div>
      <div class="energy-bars week">
        <i
          v-for="(value, index) in energyWeekBars"
          :key="index"
          :class="{ today: index === 6 }"
          :style="{ height: `${Math.max(4, (value / weekMax) * 100)}%` }"
          :title="`${weekLabels[index]} ${value} kWh`"
        ></i>
      </div>
      <div class="energy-scale week">
        <span v-for="label in weekLabels" :key="label">{{ label }}</span>
      </div>
    </div>

    <div class="energy-breakdown">
      <span v-for="item in typeBreakdown" :key="item.type">
        <i :style="{ background: item.color }"></i>
        {{ item.label }} {{ item.total }} kWh
      </span>
    </div>
  </div>
</template>

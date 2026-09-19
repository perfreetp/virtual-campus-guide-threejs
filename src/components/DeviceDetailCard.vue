<script setup>
import { computed } from 'vue';
import TrendChart from './TrendChart.vue';
import { useDeviceMonitor } from '../composables/useDeviceMonitor';
import { deviceTypeMap } from '../mock/deviceData';

const {
  selectedDevice,
  unhandledAlarms,
  isEnergyDevice,
  selectDevice,
  handleAlarm
} = useDeviceMonitor();

const spec = computed(() => (selectedDevice.value ? deviceTypeMap[selectedDevice.value.type] : null));
const hourLabels = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`);

const deviceAlarm = computed(() => {
  if (!selectedDevice.value) {
    return null;
  }
  return unhandledAlarms.value.find((alarm) => alarm.deviceId === selectedDevice.value.id && alarm.active) || null;
});

const energyOn = computed(() => {
  return selectedDevice.value ? isEnergyDevice(selectedDevice.value) : false;
});

function closeCard() {
  selectDevice('');
}
</script>

<template>
  <section v-if="selectedDevice" class="device-detail glass-panel">
    <header class="device-detail-head">
      <i class="device-detail-type" :style="{ background: spec.color }"></i>
      <div>
        <p>{{ selectedDevice.buildingName }} · {{ spec.label }}设备</p>
        <h3>{{ selectedDevice.name }}</h3>
      </div>
      <button type="button" class="device-close" @click="closeCard">×</button>
    </header>

    <div class="device-status-row">
      <b :class="selectedDevice.isFault ? 'fault' : 'ok'">
        {{ selectedDevice.isFault ? '故障告警' : '运行正常' }}
      </b>
      <span v-if="energyOn && !selectedDevice.isFault" class="energy-badge">节能模式运行中</span>
    </div>

    <div class="device-metrics">
      <label>
        <span>{{ spec.metrics.temperature.label }}</span>
        <strong :class="{ fault: selectedDevice.isFault }">
          {{ selectedDevice.metrics.temperature }}<em>{{ spec.metrics.temperature.unit }}</em>
        </strong>
      </label>
      <label>
        <span>{{ spec.metrics.power.label }}</span>
        <strong :class="{ fault: selectedDevice.isFault }">
          {{ selectedDevice.metrics.power.toFixed(2) }}<em>{{ spec.metrics.power.unit }}</em>
        </strong>
      </label>
      <label>
        <span>{{ spec.metrics.runtime.label }}</span>
        <strong>{{ selectedDevice.metrics.runtime }}<em>{{ spec.metrics.runtime.unit }}</em></strong>
      </label>
      <label>
        <span>{{ spec.metrics.extra.label }}</span>
        <strong>{{ selectedDevice.metrics.extra }}<em>{{ spec.metrics.extra.unit }}</em></strong>
      </label>
    </div>

    <div class="device-chart-head">
      <span>近 24 小时功率曲线</span>
      <b>kW · 实时</b>
    </div>
    <TrendChart
      :labels="hourLabels"
      :values="selectedDevice.powerSeries"
      :color="selectedDevice.isFault ? '#ff6b6b' : spec.color"
      :height="118"
      unit=" kW"
    />

    <div v-if="deviceAlarm" class="device-alarm-box">
      <p>{{ deviceAlarm.message }}</p>
      <button type="button" @click="handleAlarm(deviceAlarm.id)">标记已处理</button>
    </div>
  </section>
</template>

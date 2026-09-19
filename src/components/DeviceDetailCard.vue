<script setup>
import { computed, ref } from 'vue';
import { deviceTypeMeta, deviceTypeNames } from '../mock/deviceData';
import { deviceState, getDeviceStatus, selectDevice } from '../store/deviceStore';

const props = defineProps({
  device: {
    type: Object,
    default: null
  }
});

const chartMetric = ref('power');

const statusName = computed(() => {
  const status = getDeviceStatus(props.device);
  return status === 'fault' ? '故障告警' : status === 'standby' ? '待机' : '运行中';
});

const metrics = computed(() => [
  { label: '实时温度', value: props.device.temperature, unit: '℃' },
  { label: '实时功率', value: props.device.power, unit: 'kW' },
  { label: '额定功率', value: props.device.ratedPower, unit: 'kW' },
  { label: '累计运行', value: props.device.runHours, unit: 'h' }
]);

const chartSeries = computed(() => {
  return chartMetric.value === 'power' ? props.device.powerSeries : props.device.temperatureSeries;
});

const chartPoints = computed(() => {
  const values = chartSeries.value;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 0.1);
  return values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 86 - ((value - min) / span) * 74;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
});

const chartLine = computed(() => chartPoints.value.join(' '));
const chartArea = computed(() => `0,92 ${chartPoints.value.join(' ')} 100,92`);

const chartRange = computed(() => {
  const values = chartSeries.value;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    max: Math.round(max * 10) / 10,
    min: Math.round(min * 10) / 10,
    average: Math.round(average * 10) / 10,
    unit: chartMetric.value === 'power' ? 'kW' : '℃'
  };
});
</script>

<template>
  <transition name="detail-pop">
    <section v-if="device" class="device-detail glass-panel">
      <button class="detail-close" type="button" aria-label="关闭设备详情" @click="selectDevice(null)">×</button>
      <div class="detail-heading">
        <span class="detail-dot" :style="{ background: deviceTypeMeta[device.type].color }"></span>
        <div>
          <p>
            <strong>{{ device.name }}</strong>
            <em>{{ deviceTypeNames[device.type] }}</em>
            <b :class="getDeviceStatus(device)">{{ statusName }}</b>
          </p>
          <span class="detail-location">{{ device.buildingName }} · 编号 {{ device.id.toUpperCase() }}</span>
        </div>
      </div>

      <div class="detail-metrics">
        <div v-for="item in metrics" :key="item.label">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <em>{{ item.unit }}</em>
        </div>
      </div>

      <p v-if="device.status === 'fault'" class="detail-fault">
        {{ device.faultAt }} · {{ device.faultMessage }}
      </p>
      <p v-else-if="deviceState.savingMode" class="detail-saving">
        节能模式运行中：限功率策略已生效
      </p>

      <div class="detail-chart-head">
        <span>近 24 小时曲线</span>
        <div class="detail-chart-switch">
          <button
            type="button"
            :class="{ active: chartMetric === 'power' }"
            @click="chartMetric = 'power'"
          >功率</button>
          <button
            type="button"
            :class="{ active: chartMetric === 'temperature' }"
            @click="chartMetric = 'temperature'"
          >温度</button>
        </div>
      </div>
      <svg class="detail-chart" viewBox="0 0 100 92" preserveAspectRatio="none" aria-hidden="true">
        <polygon class="detail-chart-area" :points="chartArea"></polygon>
        <polyline class="detail-chart-line" :points="chartLine"></polyline>
      </svg>
      <div class="detail-chart-foot">
        <span>最高 {{ chartRange.max }}{{ chartRange.unit }}</span>
        <span>平均 {{ chartRange.average }}{{ chartRange.unit }}</span>
        <span>最低 {{ chartRange.min }}{{ chartRange.unit }}</span>
      </div>

      <div class="detail-meta">
        <span>投用日期 {{ device.installDate }}</span>
        <span>本次在线 {{ device.onlineHours }}h</span>
        <span>今日用电 {{ device.todayEnergy }} kWh</span>
      </div>
    </section>
  </transition>
</template>

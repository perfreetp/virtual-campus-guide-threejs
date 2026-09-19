<script setup>
import { computed, ref, watch } from 'vue';
import { categoryNames } from '../mock/campusData';
import { levelColors, levelNames, metricLimits, metricNames, metricUnits } from '../mock/environmentData';
import { formatHour, getTrend, metricKeys } from '../utils/environment';

const props = defineProps({
  monitor: {
    type: Object,
    required: true
  },
  hour: {
    type: Number,
    required: true
  },
  activeMetric: {
    type: String,
    default: 'all'
  }
});

const emit = defineEmits(['close']);

const localMetric = ref('');

const chartMetric = computed(() => {
  if (localMetric.value) {
    return localMetric.value;
  }
  return props.activeMetric === 'all' ? 'air' : props.activeMetric;
});

watch(
  () => props.monitor.id,
  () => {
    localMetric.value = '';
  }
);

const trend = computed(() => getTrend(props.monitor, chartMetric.value, props.hour));

const chartPath = computed(() => {
  const samples = trend.value;
  const values = samples.map((sample) => sample.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 100;
  const height = 42;
  return samples
    .map((sample, index) => {
      const x = (index / (samples.length - 1)) * width;
      const y = height - ((sample.value - min) / range) * (height - 6) - 3;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
});

const chartRange = computed(() => {
  const values = trend.value.map((sample) => sample.value);
  return { min: Math.min(...values), max: Math.max(...values) };
});

const trendStartLabel = computed(() => formatHour(trend.value[0]?.hour ?? 0));
const trendEndLabel = computed(() => formatHour(trend.value.at(-1)?.hour ?? 0));

const metricRows = computed(() => {
  return metricKeys.map((metric) => {
    const data = props.monitor.metrics[metric];
    return {
      key: metric,
      name: metricNames[metric],
      unit: metricUnits[metric],
      limit: metricLimits[metric],
      value: data.value,
      level: data.level,
      levelName: levelNames[data.level],
      color: levelColors[data.level]
    };
  });
});

const activeRow = computed(() => metricRows.value.find((row) => row.key === chartMetric.value));
</script>

<template>
  <section class="monitor-detail glass-panel" aria-label="监测点详情">
    <div class="panel-heading">
      <span>{{ monitor.name }}</span>
      <button class="detail-close" type="button" aria-label="关闭详情" @click="emit('close')">×</button>
    </div>
    <p class="detail-sub">
      {{ categoryNames[monitor.category] }} · {{ formatHour(hour) }} 实时数据
    </p>

    <div class="detail-metrics">
      <button
        v-for="row in metricRows"
        :key="row.key"
        type="button"
        :class="{ active: chartMetric === row.key }"
        @click="localMetric = row.key"
      >
        <span>{{ row.name }}</span>
        <strong :style="{ color: row.color }">{{ row.value }}<em>{{ row.unit }}</em></strong>
        <i :style="{ background: row.color }">{{ row.levelName }}</i>
      </button>
    </div>

    <div class="detail-chart">
      <div class="chart-head">
        <span>{{ activeRow.name }}变化曲线</span>
        <b>限值 {{ activeRow.limit }}{{ activeRow.unit }}</b>
      </div>
      <svg viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true">
        <path :d="chartPath" :style="{ stroke: activeRow.color }"></path>
      </svg>
      <div class="chart-scale">
        <span>{{ trendStartLabel }}</span>
        <span>近6小时 · {{ chartRange.min }} ~ {{ chartRange.max }}{{ activeRow.unit }}</span>
        <span>{{ trendEndLabel }}</span>
      </div>
    </div>
  </section>
</template>

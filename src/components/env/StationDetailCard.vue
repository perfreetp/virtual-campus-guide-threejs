<script setup>
import { computed } from 'vue';
import {
  evaluateMetric,
  formatMetric,
  metricsMeta,
  metricKeys,
  regionNames
} from '../../env/environment.js';
import { stationHistory, weatherNames } from '../../env/model.js';
import MetricTrendChart from './MetricTrendChart.vue';

const props = defineProps({
  station: {
    type: Object,
    required: true
  },
  readings: {
    type: Object,
    required: true
  },
  timeHours: {
    type: Number,
    required: true
  },
  weather: {
    type: String,
    required: true
  },
  activeMetric: {
    type: String,
    default: 'aqi'
  }
});

const emit = defineEmits(['close', 'selectMetric']);

const currentMetrics = computed(() =>
  metricKeys.map((key) => evaluateMetric(key, props.readings[key]))
);

const current = computed(() => currentMetrics.value.find((item) => item.key === props.activeMetric));

const history = computed(() =>
  stationHistory(props.station, props.timeHours, props.weather, 12).map((point) => ({
    label: point.label,
    value: point.data[props.activeMetric]
  }))
);

const chartLabels = computed(() => {
  const first = history.value[0]?.label;
  const last = history.value.at(-1)?.label;
  return { first, last };
});

const meta = computed(() => metricsMeta[props.activeMetric]);
const latestText = computed(() => formatMetric(props.activeMetric, props.readings[props.activeMetric]));
const chartLimit = computed(() => (['aqi', 'noise'].includes(props.activeMetric) ? meta.value.limit : null));
</script>

<template>
  <section class="station-card glass-panel" role="dialog" :aria-label="`${station.name}监测详情`">
    <div class="station-card-head">
      <div>
        <p class="panel-label">环境监测点</p>
        <h3>{{ station.name }}</h3>
        <span class="station-region">{{ regionNames[station.region] }}</span>
      </div>
      <button class="station-close" type="button" aria-label="关闭监测详情" @click="emit('close')">✕</button>
    </div>

    <div class="station-metrics">
      <button
        v-for="item in currentMetrics"
        :key="item.key"
        type="button"
        :class="{ active: activeMetric === item.key }"
        @click="emit('selectMetric', item.key)"
      >
        <span>{{ item.label }}</span>
        <strong :style="{ color: item.color }">{{ formatMetric(item.key, item.value) }}</strong>
        <em :style="{ background: item.color }">{{ item.levelLabel }}</em>
      </button>
    </div>

    <div class="station-trend">
      <div class="station-trend-head">
        <span>{{ current.levelLabel }} · {{ meta.label }}</span>
        <b :style="{ color: current.color }">{{ latestText }}</b>
      </div>
      <MetricTrendChart
        :points="history"
        :color="current.color"
        :limit="chartLimit"
      />
      <div class="station-trend-scale">
        <span>近12小时 · {{ weatherNames[weather] }}</span>
        <span>{{ chartLabels.first }} / {{ chartLabels.last }}</span>
      </div>
    </div>
  </section>
</template>

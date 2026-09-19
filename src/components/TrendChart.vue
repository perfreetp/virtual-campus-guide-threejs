<script setup>
import { computed } from 'vue';

const props = defineProps({
  labels: {
    type: Array,
    required: true
  },
  values: {
    type: Array,
    required: true
  },
  variant: {
    type: String,
    default: 'line'
  },
  color: {
    type: String,
    default: '#35e9ff'
  },
  height: {
    type: Number,
    default: 120
  },
  unit: {
    type: String,
    default: ''
  },
  maxValue: {
    type: Number,
    default: 0
  }
});

const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 100;
const gradientId = `chart-gradient-${Math.random().toString(36).slice(2, 9)}`;

const max = computed(() => {
  const peak = Math.max(...props.values, 0);
  return props.maxValue || peak * 1.18 || 1;
});

const linePath = computed(() => {
  return props.values.map((value, index) => {
    const x = (index / Math.max(1, props.values.length - 1)) * VIEW_WIDTH;
    const y = VIEW_HEIGHT - (value / max.value) * 88 - 6;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
});

const areaPath = computed(() => {
  return `${linePath.value} L ${VIEW_WIDTH} ${VIEW_HEIGHT} L 0 ${VIEW_HEIGHT} Z`;
});

const points = computed(() => {
  return props.values.map((value, index) => {
    const x = (index / Math.max(1, props.values.length - 1)) * VIEW_WIDTH;
    const y = VIEW_HEIGHT - (value / max.value) * 88 - 6;
    return { x: x.toFixed(2), y: y.toFixed(2) };
  });
});

const barWidth = computed(() => (VIEW_WIDTH / Math.max(1, props.values.length)) * 0.62);

function formatTick(value) {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}万`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(0);
}

const displayLabels = computed(() => {
  const maxLabels = 8;
  if (props.labels.length <= maxLabels) {
    return props.labels;
  }
  const step = Math.ceil(props.labels.length / maxLabels);
  return props.labels.map((label, index) => (index % step === 0 ? label : ''));
});
</script>

<template>
  <div class="trend-chart">
    <div class="trend-chart-frame" :style="{ height: `${height}px` }">
      <span class="trend-chart-tick top">{{ formatTick(max) }}{{ unit }}</span>
      <span class="trend-chart-tick bottom">0</span>
      <svg
        class="trend-chart-svg"
        :viewBox="`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="color" stop-opacity="0.42" />
            <stop offset="100%" :stop-color="color" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <template v-if="variant === 'line'">
          <path :d="areaPath" :fill="`url(#${gradientId})`" stroke="none" />
          <path
            :d="linePath"
            fill="none"
            :stroke="color"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
            class="trend-chart-line"
          />
          <circle
            v-for="(point, index) in points"
            :key="index"
            :cx="point.x"
            :cy="point.y"
            r="2.2"
            :fill="color"
            vector-effect="non-scaling-stroke"
          />
        </template>

        <template v-else>
          <rect
            v-for="(value, index) in values"
            :key="index"
            :x="index * (VIEW_WIDTH / Math.max(1, values.length)) + (VIEW_WIDTH / Math.max(1, values.length) - barWidth) / 2"
            :y="VIEW_HEIGHT - (value / max) * 88 - 6"
            :width="barWidth"
            :height="(value / max) * 88 + 6"
            :fill="color"
            opacity="0.82"
            rx="2"
          />
        </template>
      </svg>
    </div>
    <div class="trend-chart-labels">
      <span v-for="(label, index) in displayLabels" :key="index">{{ label }}</span>
    </div>
  </div>
</template>

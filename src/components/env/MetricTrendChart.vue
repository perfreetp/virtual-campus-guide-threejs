<script setup>
import { computed } from 'vue';

const props = defineProps({
  points: {
    type: Array,
    required: true
  },
  color: {
    type: String,
    default: '#38e7ff'
  },
  limit: {
    type: Number,
    default: null
  }
});

const width = 232;
const height = 64;
const padding = 6;

const geometry = computed(() => {
  const values = props.points.map((point) => point.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (props.limit !== null) {
    min = Math.min(min, props.limit);
    max = Math.max(max, props.limit);
  }
  if (max - min < 0.001) {
    max += 1;
    min -= 1;
  }
  const span = max - min;
  const coordinates = values.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(1, values.length - 1);
    const y = height - padding - ((value - min) / span) * (height - padding * 2);
    return { x, y, value };
  });
  const line = coordinates.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const area = `${line} L${coordinates.at(-1).x.toFixed(1)},${height - padding} L${coordinates[0].x.toFixed(1)},${height - padding} Z`;
  const limitY = props.limit === null
    ? null
    : height - padding - ((props.limit - min) / span) * (height - padding * 2);
  return { coordinates, line, area, limitY, min: Math.round(min), max: Math.round(max) };
});

const gradientId = `trend-${Math.random().toString(36).slice(2, 9)}`;
</script>

<template>
  <div class="trend-chart">
    <svg :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.42" />
          <stop offset="100%" :stop-color="color" stop-opacity="0.02" />
        </linearGradient>
      </defs>
      <line
        v-if="geometry.limitY !== null"
        x1="0"
        :x2="width"
        :y1="geometry.limitY"
        :y2="geometry.limitY"
        stroke="#ff7a6b"
        stroke-width="1"
        stroke-dasharray="4 3"
      />
      <path :d="geometry.area" :fill="`url(#${gradientId})`" stroke="none" />
      <path
        :d="geometry.line"
        fill="none"
        :stroke="color"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <circle
        v-for="(point, index) in geometry.coordinates"
        :key="index"
        :cx="point.x"
        :cy="point.y"
        :r="index === geometry.coordinates.length - 1 ? 3.2 : 0"
        :fill="color"
      />
    </svg>
  </div>
</template>

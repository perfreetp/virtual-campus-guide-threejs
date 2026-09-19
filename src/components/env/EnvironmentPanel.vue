<script setup>
import { computed } from 'vue';
import { environmentRegions, evaluateMetric, metricsMeta, metricKeys } from '../../env/environment.js';

const props = defineProps({
  layerVisible: {
    type: Boolean,
    default: true
  },
  region: {
    type: String,
    required: true
  },
  metric: {
    type: String,
    required: true
  },
  snapshots: {
    type: Array,
    required: true
  },
  visibleCount: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['update:layerVisible', 'update:region', 'update:metric']);

const averages = computed(() => {
  if (!props.snapshots.length) {
    return [];
  }
  return metricKeys.map((key) => {
    const total = props.snapshots.reduce((sum, item) => sum + item.readings[key], 0);
    const value = total / props.snapshots.length;
    return { ...evaluateMetric(key, value), value };
  });
});

const exceedCount = computed(() => {
  const set = new Set();
  props.snapshots.forEach(({ station, readings }) => {
    if (metricKeys.some((key) => evaluateMetric(key, readings[key]).exceeded)) {
      set.add(station.id);
    }
  });
  return set.size;
});
</script>

<template>
  <section class="glass-panel env-panel">
    <div class="panel-heading">
      <span>环境监测图层</span>
      <label class="env-switch">
        <input
          type="checkbox"
          :checked="layerVisible"
          @change="emit('update:layerVisible', $event.target.checked)"
        />
        <i>{{ layerVisible ? '开启' : '关闭' }}</i>
      </label>
    </div>

    <div class="env-region-row">
      <button
        v-for="item in environmentRegions"
        :key="item.key"
        type="button"
        :class="{ active: region === item.key }"
        :disabled="!layerVisible"
        @click="emit('update:region', item.key)"
      >
        {{ item.label.replace('区域', '') }}
      </button>
    </div>

    <div class="env-metric-row">
      <button
        v-for="key in metricKeys"
        :key="key"
        type="button"
        :class="{ active: metric === key }"
        :disabled="!layerVisible"
        @click="emit('update:metric', key)"
      >
        {{ metricsMeta[key].short }}
      </button>
    </div>

    <div class="env-average">
      <div v-for="item in averages" :key="item.key" :class="{ dim: metric !== item.key }">
        <span>{{ item.label }}</span>
        <strong :style="{ color: item.color }">
          {{ item.value.toFixed(metricsMeta[item.key].decimals) }}<em>{{ item.unit }}</em>
        </strong>
        <i :style="{ background: item.color }">{{ item.levelLabel }}</i>
      </div>
    </div>

    <p class="env-summary">
      显示 <b>{{ layerVisible ? visibleCount : 0 }}</b> / {{ snapshots.length }} 个监测点，
      <b :class="{ warning: exceedCount > 0 }">{{ exceedCount }}</b> 个点位存在超标
    </p>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { facultyNames } from '../mock/campusData';
import { getHeatLevel, getWarningText } from '../utils/heatmap';

const props = defineProps({
  building: {
    type: Object,
    default: null
  },
  entry: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'locate']);

const level = computed(() => getHeatLevel(props.entry?.density ?? 0));
const warningText = computed(() => getWarningText(props.entry));
const updatedTime = computed(() => {
  if (!props.entry) {
    return '';
  }
  return '实时模拟数据 · 每 5 秒刷新';
});
</script>

<template>
  <section v-if="building && entry" class="heat-popup glass-panel" role="dialog" aria-label="楼栋人流详情">
    <button class="heat-popup-close" type="button" aria-label="关闭" @click="emit('close')">×</button>
    <div class="panel-heading">
      <span>{{ building.name }}</span>
      <b :style="{ color: level.color }">{{ level.label }}</b>
    </div>
    <p class="heat-popup-faculty">{{ facultyNames[building.faculty] || '校园公共' }}</p>
    <div class="heat-popup-grid">
      <div>
        <span>楼层</span>
        <strong>{{ building.floors }} 层</strong>
      </div>
      <div>
        <span>当前人数</span>
        <strong>{{ entry.people }} 人</strong>
      </div>
      <div>
        <span>承载容量</span>
        <strong>{{ entry.capacity }} 人</strong>
      </div>
      <div>
        <span>人流密度</span>
        <strong :style="{ color: level.color }">{{ Math.round(entry.density * 100) }}%</strong>
      </div>
    </div>
    <p class="heat-popup-warning" :class="entry.warning">
      {{ entry.warning ? '⚠ ' : '✓ ' }}{{ warningText }}
    </p>
    <div class="heat-popup-actions">
      <button type="button" @click="emit('locate', building)">镜头定位</button>
      <button type="button" @click="emit('close')">知道了</button>
    </div>
    <em class="heat-popup-time">{{ updatedTime }}</em>
  </section>
</template>

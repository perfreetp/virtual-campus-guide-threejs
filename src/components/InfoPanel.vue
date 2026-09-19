<script setup>
import { computed } from 'vue';
import { categoryNames, facultyNames } from '../mock/campusData';
import { getHeatLevel, getWarningText } from '../utils/heatmap';

const props = defineProps({
  building: {
    type: Object,
    required: true
  },
  crowdEntry: {
    type: Object,
    default: null
  },
  isFavorite: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggleFavorite']);

const heatLevel = computed(() => getHeatLevel(props.crowdEntry?.density ?? 0));
const warningText = computed(() => getWarningText(props.crowdEntry));
</script>

<template>
  <aside class="info-panel">
    <div class="info-accent"></div>
    <div class="info-heading-row">
      <p class="panel-label">建筑信息</p>
      <button
        type="button"
        class="favorite-btn"
        :class="{ active: isFavorite }"
        :aria-pressed="isFavorite"
        :title="isFavorite ? '取消收藏' : '收藏建筑'"
        @click="emit('toggleFavorite', building.id)"
      >{{ isFavorite ? '★ 已收藏' : '☆ 收藏' }}</button>
    </div>
    <h2>{{ building.name }}</h2>
    <span class="category-pill">{{ categoryNames[building.category] }}</span>
    <span class="category-pill faculty-pill">{{ facultyNames[building.faculty] || '校园公共' }}</span>

    <dl>
      <div>
        <dt>简介</dt>
        <dd>{{ building.intro }}</dd>
      </div>
      <div>
        <dt>开放时间</dt>
        <dd>{{ building.openTime }}</dd>
      </div>
      <div>
        <dt>功能说明</dt>
        <dd>{{ building.functionDesc }}</dd>
      </div>
      <div v-if="crowdEntry" class="info-crowd">
        <dt>实时人流 · {{ building.floors }} 层</dt>
        <dd>
          <div class="info-crowd-row">
            <span>{{ crowdEntry.people }} 人 / 容量 {{ crowdEntry.capacity }}</span>
            <strong :style="{ color: heatLevel.color }">{{ Math.round(crowdEntry.density * 100) }}%</strong>
          </div>
          <i><em :style="{ width: `${Math.round(crowdEntry.density * 100)}%`, background: heatLevel.color }"></em></i>
          <p class="info-warning" :class="crowdEntry.warning">{{ warningText }}</p>
        </dd>
      </div>
    </dl>
  </aside>
</template>

<script setup>
import { categoryNames } from '../mock/campusData';

defineProps({
  building: {
    type: Object,
    required: true
  },
  favorited: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggleFavorite']);
</script>

<template>
  <aside class="info-panel">
    <div class="info-accent"></div>
    <p class="panel-label">建筑信息</p>
    <div class="info-title-row">
      <h2>{{ building.name }}</h2>
      <button
        class="favorite-btn"
        type="button"
        :class="{ active: favorited }"
        :aria-pressed="favorited"
        @click="emit('toggleFavorite', building.id)"
      >
        {{ favorited ? '已收藏' : '收藏' }}
      </button>
    </div>
    <span class="category-pill">{{ categoryNames[building.category] }}</span>

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
    </dl>
  </aside>
</template>

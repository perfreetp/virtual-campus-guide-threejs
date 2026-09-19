<script setup>
import { weatherOptions } from '../../env/model.js';

defineProps({
  weather: {
    type: String,
    required: true
  },
  timeHours: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['update:weather']);
</script>

<template>
  <section class="glass-panel weather-panel">
    <div class="panel-heading">
      <span>天气系统</span>
      <b>光照 · 能见度 · 湿滑</b>
    </div>
    <div class="weather-grid">
      <button
        v-for="item in weatherOptions"
        :key="item.key"
        type="button"
        :class="{ active: weather === item.key }"
        @click="emit('update:weather', item.key)"
      >
        <i aria-hidden="true">{{ item.icon }}</i>
        <span>{{ item.label }}</span>
      </button>
    </div>
  </section>
</template>

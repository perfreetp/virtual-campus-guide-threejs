<script setup>
import { weatherOptions } from '../mock/environmentData';
import { formatHour } from '../utils/environment';

defineProps({
  weather: {
    type: String,
    required: true
  },
  timeOfDay: {
    type: Number,
    required: true
  },
  playing: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:weather', 'update:timeOfDay', 'togglePlay']);

const hourMarks = [0, 3, 6, 9, 12, 15, 18, 21, 24];

function handleTimeInput(event) {
  emit('update:timeOfDay', Number(event.target.value));
}
</script>

<template>
  <section class="env-bar glass-panel" aria-label="天气与时间控制">
    <div class="weather-switch">
      <button
        v-for="option in weatherOptions"
        :key="option.value"
        type="button"
        :class="{ active: weather === option.value }"
        @click="emit('update:weather', option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="time-axis">
      <button
        class="time-play"
        type="button"
        :aria-pressed="playing"
        :title="playing ? '暂停昼夜循环' : '播放昼夜循环'"
        @click="emit('togglePlay')"
      >
        {{ playing ? '❚❚' : '▶' }}
      </button>
      <div class="time-slider">
        <input
          type="range"
          min="0"
          max="24"
          step="0.25"
          :value="timeOfDay"
          aria-label="拖动查看一天不同时刻"
          @input="handleTimeInput"
        />
        <div class="time-marks">
          <span v-for="mark in hourMarks" :key="mark">{{ String(mark).padStart(2, '0') }}</span>
        </div>
      </div>
      <strong class="time-now">{{ formatHour(timeOfDay) }}</strong>
    </div>
  </section>
</template>

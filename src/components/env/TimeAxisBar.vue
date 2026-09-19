<script setup>
import { computed } from 'vue';

const props = defineProps({
  timeHours: {
    type: Number,
    required: true
  },
  playing: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:timeHours', 'update:playing']);

const clockText = computed(() => {
  const totalMinutes = Math.round(props.timeHours * 60);
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

const phaseText = computed(() => {
  const hour = props.timeHours;
  if (hour >= 5 && hour < 8) {
    return '清晨日出';
  }
  if (hour >= 8 && hour < 17) {
    return '日间光照';
  }
  if (hour >= 17 && hour < 19.5) {
    return '黄昏时分';
  }
  return '夜间亮灯';
});

const ticks = [0, 3, 6, 9, 12, 15, 18, 21, 24];

function onInput(event) {
  emit('update:timeHours', Number(event.target.value));
}
</script>

<template>
  <section class="time-axis glass-panel">
    <button
      class="time-play"
      type="button"
      :aria-pressed="playing"
      @click="emit('update:playing', !playing)"
    >
      {{ playing ? '❚❚' : '▶' }}
    </button>
    <div class="time-readout">
      <strong>{{ clockText }}</strong>
      <span>{{ phaseText }}</span>
    </div>
    <div class="time-slider-wrap">
      <input
        class="time-slider"
        type="range"
        min="0"
        max="23.9"
        step="0.1"
        :value="timeHours"
        aria-label="昼夜时间轴"
        @input="onInput"
      />
      <div class="time-ticks" aria-hidden="true">
        <span v-for="tick in ticks" :key="tick" :style="{ left: `${(tick / 24) * 100}%` }">
          {{ String(tick === 24 ? 0 : tick).padStart(2, '0') }}
        </span>
      </div>
    </div>
  </section>
</template>

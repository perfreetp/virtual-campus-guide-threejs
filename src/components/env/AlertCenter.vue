<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  alerts: {
    type: Array,
    required: true
  },
  pendingCount: {
    type: Number,
    default: 0
  },
  selectedStationId: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['handle', 'undo', 'handleAll', 'locate']);

const open = ref(false);
const tab = ref('pending');

const visibleAlerts = computed(() =>
  tab.value === 'pending'
    ? props.alerts.filter((alert) => !alert.handled)
    : props.alerts.filter((alert) => alert.handled)
);
</script>

<template>
  <div class="alert-center" :class="{ open }">
    <button
      class="alert-entry"
      type="button"
      :class="{ attention: pendingCount > 0 }"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="alert-bell" aria-hidden="true">⚠</span>
      <span>环境告警</span>
      <i v-if="pendingCount > 0" class="alert-badge">{{ pendingCount > 99 ? '99+' : pendingCount }}</i>
    </button>

    <div v-if="open" class="alert-dropdown glass-panel">
      <div class="alert-dropdown-head">
        <button
          type="button"
          :class="{ active: tab === 'pending' }"
          @click="tab = 'pending'"
        >
          待处理 {{ pendingCount }}
        </button>
        <button
          type="button"
          :class="{ active: tab === 'handled' }"
          @click="tab = 'handled'"
        >
          已处理
        </button>
        <button
          v-if="pendingCount > 0"
          class="alert-handle-all"
          type="button"
          @click="emit('handleAll')"
        >
          全部处理
        </button>
      </div>

      <div class="alert-list">
        <p v-if="!visibleAlerts.length" class="alert-empty">
          {{ tab === 'pending' ? '当前没有超标告警，环境状态良好' : '暂无已处理的告警记录' }}
        </p>
        <article
          v-for="alert in visibleAlerts"
          :key="alert.key"
          class="alert-item"
          :class="{ handled: alert.handled }"
        >
          <i class="alert-dot" :style="{ background: alert.color }"></i>
          <div class="alert-body">
            <div class="alert-title">
              <strong>{{ alert.stationName }}</strong>
              <span>{{ alert.regionLabel }}</span>
            </div>
            <p>
              {{ alert.metricLabel }}
              <b :style="{ color: alert.color }">{{ alert.value }}{{ alert.unit }}</b>
              （{{ alert.levelLabel }}）
            </p>
            <small>{{ alert.timeLabel }} · {{ alert.weatherLabel }}</small>
          </div>
          <div class="alert-actions">
            <button
              type="button"
              class="alert-locate"
              :class="{ active: selectedStationId === alert.stationId }"
              @click="emit('locate', alert)"
            >
              定位
            </button>
            <button
              v-if="!alert.handled"
              type="button"
              class="alert-confirm"
              @click="emit('handle', alert.key)"
            >
              处理
            </button>
            <button
              v-else
              type="button"
              class="alert-undo"
              @click="emit('undo', alert.key)"
            >
              撤销
            </button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

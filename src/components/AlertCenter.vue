<script setup>
import { computed } from 'vue';
import { categoryNames } from '../mock/campusData';
import { formatHour } from '../utils/environment';

const props = defineProps({
  alerts: {
    type: Array,
    required: true
  },
  handledIds: {
    type: Array,
    required: true
  },
  hour: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['handle', 'handleAll', 'locate', 'close']);

const handledSet = computed(() => new Set(props.handledIds));

const sortedAlerts = computed(() => {
  return [...props.alerts].sort((a, b) => {
    return Number(handledSet.value.has(a.id)) - Number(handledSet.value.has(b.id));
  });
});

const pendingCount = computed(() => {
  return props.alerts.filter((alert) => !handledSet.value.has(alert.id)).length;
});
</script>

<template>
  <section class="alert-center glass-panel" aria-label="环境告警中心">
    <div class="panel-heading">
      <span>环境告警中心</span>
      <b>{{ formatHour(hour) }} · {{ pendingCount }} 条未处理</b>
      <button class="detail-close" type="button" aria-label="关闭告警中心" @click="emit('close')">×</button>
    </div>

    <div v-if="alerts.length" class="alert-actions">
      <button type="button" :disabled="pendingCount === 0" @click="emit('handleAll')">
        全部处理
      </button>
    </div>

    <p v-if="!alerts.length" class="alert-empty">当前无超标告警，校园环境运行正常。</p>

    <ul v-else class="alert-list">
      <li
        v-for="alert in sortedAlerts"
        :key="alert.id"
        :class="{ handled: handledSet.has(alert.id) }"
      >
        <i :style="{ background: alert.color }"></i>
        <div>
          <strong>{{ alert.pointName }} · {{ alert.metricName }}超标</strong>
          <span>
            {{ categoryNames[alert.category] }} · 当前 {{ alert.value }}{{ alert.unit }} / 限值 {{ alert.limit }}{{ alert.unit }}
          </span>
        </div>
        <div class="alert-buttons">
          <button type="button" @click="emit('locate', alert.pointId)">定位</button>
          <button
            type="button"
            :disabled="handledSet.has(alert.id)"
            @click="emit('handle', alert.id)"
          >
            {{ handledSet.has(alert.id) ? '已处理' : '处理' }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

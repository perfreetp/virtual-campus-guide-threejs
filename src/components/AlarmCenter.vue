<script setup>
import { computed, ref } from 'vue';
import { useDeviceMonitor } from '../composables/useDeviceMonitor';

const expanded = ref(true);
const { alarms, unhandledAlarms, selectDevice, handleAlarm, formatAlarmTime } = useDeviceMonitor();

const activeAlarmList = computed(() => alarms.value.filter((alarm) => !alarm.handled).slice(0, 8));
const handledAlarmList = computed(() => alarms.value.filter((alarm) => alarm.handled).slice(0, 2));

const typeClass = {
  elevator: 'type-elevator',
  ac: 'type-ac',
  light: 'type-light',
  pump: 'type-pump'
};
</script>

<template>
  <section class="glass-panel alarm-center">
    <button type="button" class="alarm-heading" @click="expanded = !expanded">
      <span>告警中心</span>
      <b class="alarm-badge" :class="{ zero: unhandledAlarms.length === 0 }">
        {{ unhandledAlarms.length }}
      </b>
      <i class="alarm-caret" :class="{ open: expanded }"></i>
    </button>

    <div v-show="expanded" class="alarm-body">
      <p v-if="!alarms.length" class="alarm-empty">当前没有告警，设备运行平稳</p>
      <ul v-else class="alarm-list">
        <li
          v-for="alarm in alarms.slice(0, 8)"
          :key="alarm.id"
          :class="{ done: alarm.handled, recovered: !alarm.active && !alarm.handled }"
        >
          <i class="alarm-dot" :class="typeClass[alarm.type]"></i>
          <button type="button" class="alarm-main" @click="selectDevice(alarm.deviceId)">
            <strong>
              {{ alarm.deviceName }}
              <em>{{ alarm.typeName }} · {{ alarm.buildingName }}</em>
            </strong>
            <small>{{ alarm.message }}</small>
            <span class="alarm-time">{{ formatAlarmTime(alarm.createdAt) }}</span>
          </button>
          <div class="alarm-state">
            <b v-if="!alarm.active" class="state-recovered">已恢复</b>
            <b v-else class="state-live">告警中</b>
            <button type="button" @click="handleAlarm(alarm.id)">处理</button>
          </div>
        </li>
      </ul>

      <ul v-if="handledAlarmList.length" class="alarm-list alarm-list-done">
        <li v-for="alarm in handledAlarmList" :key="alarm.id" class="done">
          <i class="alarm-dot" :class="typeClass[alarm.type]"></i>
          <button type="button" class="alarm-main" @click="selectDevice(alarm.deviceId)">
            <strong>
              {{ alarm.deviceName }}
              <em>{{ alarm.typeName }} · {{ alarm.buildingName }}</em>
            </strong>
            <small>{{ alarm.message }}</small>
            <span class="alarm-time">{{ formatAlarmTime(alarm.createdAt) }}</span>
          </button>
          <div class="alarm-state">
            <b class="state-done">已处理</b>
          </div>
        </li>
      </ul>
      <p v-if="unhandledAlarms.length > 8" class="alarm-more">仅展示最近 8 条未处理，共 {{ unhandledAlarms.length }} 条待处理</p>
    </div>
  </section>
</template>

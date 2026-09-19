<script setup>
import { deviceTypeNames } from '../mock/deviceData';
import { deviceAlerts, locateAlert, markAlertHandled } from '../store/deviceStore';
</script>

<template>
  <div class="ops-body">
    <p class="ops-summary">
      异常设备自动生成告警，共 <strong>{{ deviceAlerts.length }}</strong> 条，未处理
      <strong :class="{ danger: deviceAlerts.some((item) => !item.handled) }">
        {{ deviceAlerts.filter((item) => !item.handled).length }}
      </strong> 条
    </p>

    <div class="alert-list">
      <article
        v-for="alert in deviceAlerts"
        :key="alert.id"
        class="alert-row"
        :class="[alert.faultLevel, { handled: alert.handled }]"
      >
        <div class="alert-main" @click="locateAlert(alert.id)">
          <i class="alert-level-dot"></i>
          <div>
            <p>
              <strong>{{ alert.name }}</strong>
              <em>{{ deviceTypeNames[alert.type] }}</em>
              <span class="alert-time">{{ alert.faultAt }}</span>
            </p>
            <p class="alert-message">{{ alert.faultMessage }}</p>
          </div>
        </div>
        <button
          type="button"
          class="alert-action"
          :disabled="alert.handled"
          @click="markAlertHandled(alert.id)"
        >
          {{ alert.handled ? '已处理' : '标记已处理' }}
        </button>
      </article>
      <p v-if="!deviceAlerts.length" class="ops-empty">当前没有设备告警，系统运行平稳</p>
    </div>
  </div>
</template>

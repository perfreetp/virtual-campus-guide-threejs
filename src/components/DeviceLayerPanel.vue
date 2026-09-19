<script setup>
import { computed } from 'vue';
import { campusBuildings } from '../mock/campusData';
import { deviceTypeList, deviceTypeMeta, deviceTypeNames, deviceStatusNames } from '../mock/deviceData';
import {
  deviceState,
  visibleDevices,
  getDeviceStatus,
  selectDevice,
  setDeviceFilters
} from '../store/deviceStore';

const faultCount = computed(() => visibleDevices.value.filter((device) => device.status === 'fault').length);
</script>

<template>
  <div class="ops-body">
    <div class="ops-filters">
      <select
        :value="deviceState.deviceFilters.buildingId"
        @change="setDeviceFilters({ buildingId: $event.target.value })"
        aria-label="按楼栋筛选设备"
      >
        <option value="all">全部楼栋</option>
        <option v-for="building in campusBuildings" :key="building.id" :value="building.id">
          {{ building.name }}
        </option>
      </select>
      <div class="ops-type-row">
        <button
          v-for="item in deviceTypeList"
          :key="item.value"
          type="button"
          :class="{ active: deviceState.deviceFilters.deviceType === item.value }"
          @click="setDeviceFilters({ deviceType: item.value })"
        >
          {{ item.label }}
        </button>
      </div>
      <button
        class="fault-toggle"
        type="button"
        :class="{ active: deviceState.deviceFilters.onlyFault }"
        @click="setDeviceFilters({ onlyFault: !deviceState.deviceFilters.onlyFault })"
      >
        只看异常
        <b v-if="faultCount">{{ faultCount }}</b>
      </button>
    </div>

    <p class="ops-summary">
      共 <strong>{{ visibleDevices.length }}</strong> 台设备在线，异常
      <strong :class="{ danger: faultCount > 0 }">{{ faultCount }}</strong> 台
    </p>

    <div class="device-list">
      <button
        v-for="device in visibleDevices"
        :key="device.id"
        type="button"
        class="device-row"
        :class="{
          active: deviceState.selectedDeviceId === device.id,
          fault: device.status === 'fault'
        }"
        @click="selectDevice(device)"
      >
        <i class="device-dot" :style="{ background: deviceTypeMeta[device.type].color }"></i>
        <span class="device-name">{{ device.name }}</span>
        <em
          class="device-status"
          :class="getDeviceStatus(device)"
        >{{ deviceStatusNames[getDeviceStatus(device)] }}</em>
      </button>
      <p v-if="!visibleDevices.length" class="ops-empty">当前筛选条件下暂无设备</p>
    </div>
  </div>
</template>

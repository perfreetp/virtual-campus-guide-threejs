<script setup>
import { useDeviceMonitor } from '../composables/useDeviceMonitor';
import { deviceTypes } from '../mock/deviceData';

const {
  campusBuildings,
  deviceLayerOn,
  filters,
  filteredDevices,
  selectedDeviceId,
  deviceStats,
  setFilter,
  resetFilters,
  selectDevice
} = useDeviceMonitor();

const typeColor = Object.fromEntries(deviceTypes.map((item) => [item.value, item.color]));
</script>

<template>
  <section class="glass-panel device-layer-panel">
    <div class="panel-heading">
      <span>设备图层</span>
      <label class="layer-switch">
        <input v-model="deviceLayerOn" type="checkbox" />
        <i></i>
        <b>{{ deviceLayerOn ? '已开启' : '已关闭' }}</b>
      </label>
    </div>

    <label class="device-select">
      <span>楼栋</span>
      <select :value="filters.building" @change="setFilter('building', $event.target.value)">
        <option value="all">全部楼栋</option>
        <option v-for="building in campusBuildings" :key="building.id" :value="building.id">
          {{ building.name }}
        </option>
      </select>
    </label>

    <div class="device-type-row">
      <button
        type="button"
        :class="{ active: filters.type === 'all' }"
        @click="setFilter('type', 'all')"
      >
        全部
      </button>
      <button
        v-for="item in deviceTypes"
        :key="item.value"
        type="button"
        :class="{ active: filters.type === item.value }"
        @click="setFilter('type', item.value)"
      >
        <i :style="{ background: item.color }"></i>{{ item.label }}
      </button>
    </div>

    <div class="device-tool-row">
      <button
        type="button"
        class="abnormal-toggle"
        :class="{ active: filters.abnormalOnly }"
        @click="setFilter('abnormalOnly', !filters.abnormalOnly)"
      >
        <i></i>仅看异常
      </button>
      <button type="button" class="filter-reset" @click="resetFilters">重置</button>
      <strong>
        <em>{{ filteredDevices.length }}</em>/<span>{{ deviceStats.total }}</span>
      </strong>
    </div>

    <ul class="device-list" :class="{ disabled: !deviceLayerOn }">
      <li v-if="!filteredDevices.length" class="device-empty">当前筛选暂无设备</li>
      <li v-for="device in filteredDevices" :key="device.id">
        <button
          type="button"
          :class="{ active: selectedDeviceId === device.id, fault: device.isFault }"
          @click="selectDevice(device.id)"
        >
          <i class="device-dot" :style="{ background: typeColor[device.type] }"></i>
          <span class="device-meta">
            <em>{{ device.name }}</em>
            <small>{{ device.buildingName }}</small>
          </span>
          <b v-if="device.isFault">异常</b>
          <b class="device-ok" v-else>正常</b>
        </button>
      </li>
    </ul>
  </section>
</template>

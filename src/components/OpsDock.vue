<script setup>
import { ref } from 'vue';
import DeviceLayerPanel from './DeviceLayerPanel.vue';
import EnergyPanel from './EnergyPanel.vue';
import AlertPanel from './AlertPanel.vue';
import { deviceState, toggleDeviceLayer, unhandledAlertCount } from '../store/deviceStore';

const activeTab = ref('device');
const tabs = [
  { key: 'device', label: '设备图层' },
  { key: 'energy', label: '能耗统计' },
  { key: 'alert', label: '告警中心' }
];
</script>

<template>
  <section class="ops-dock glass-panel" aria-label="校园设备运维中心">
    <header class="ops-header">
      <div class="ops-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <b v-if="tab.key === 'alert' && unhandledAlertCount" class="alert-badge">
            {{ unhandledAlertCount }}
          </b>
        </button>
      </div>
      <button
        type="button"
        class="layer-toggle"
        :class="{ off: !deviceState.layerVisible }"
        @click="toggleDeviceLayer"
      >
        {{ deviceState.layerVisible ? '隐藏设备图层' : '显示设备图层' }}
      </button>
    </header>

    <DeviceLayerPanel v-show="activeTab === 'device'" />
    <EnergyPanel v-show="activeTab === 'energy'" />
    <AlertPanel v-show="activeTab === 'alert'" />
  </section>
</template>

import { computed, reactive } from 'vue';
import { campusDevices } from '../mock/deviceData';

const STORAGE_KEY = 'campus-device-ops-v1';
export const SAVING_FACTOR = 0.72;

function loadPersistedState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

const persisted = loadPersistedState();
const validDeviceIds = new Set(campusDevices.map((device) => device.id));

export const deviceState = reactive({
  devices: campusDevices,
  deviceFilters: {
    buildingId: 'all',
    deviceType: 'all',
    onlyFault: false,
    ...(persisted.deviceFilters || {})
  },
  energyFilters: {
    buildingId: 'all',
    deviceType: 'all',
    ...(persisted.energyFilters || {})
  },
  layerVisible: persisted.layerVisible !== false,
  savingMode: Boolean(persisted.savingMode),
  savingActivatedAt: persisted.savingActivatedAt || 0,
  handledAlertIds: Array.isArray(persisted.handledAlertIds)
    ? persisted.handledAlertIds.filter((id) => validDeviceIds.has(id))
    : [],
  selectedDeviceId: '',
  deviceFocusKey: 0
});

function persistState() {
  const snapshot = {
    deviceFilters: deviceState.deviceFilters,
    energyFilters: deviceState.energyFilters,
    layerVisible: deviceState.layerVisible,
    savingMode: deviceState.savingMode,
    savingActivatedAt: deviceState.savingActivatedAt,
    handledAlertIds: deviceState.handledAlertIds
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export const deviceMap = computed(() => {
  return new Map(deviceState.devices.map((device) => [device.id, device]));
});

export function getDeviceStatus(device) {
  if (device.status === 'fault') {
    return 'fault';
  }
  return device.power < device.ratedPower * 0.14 ? 'standby' : 'running';
}

export const visibleDevices = computed(() => {
  const filters = deviceState.deviceFilters;
  return deviceState.devices.filter((device) => {
    if (filters.buildingId !== 'all' && device.buildingId !== filters.buildingId) {
      return false;
    }
    if (filters.deviceType !== 'all' && device.type !== filters.deviceType) {
      return false;
    }
    if (filters.onlyFault && device.status !== 'fault') {
      return false;
    }
    return true;
  });
});

export const visibleDeviceIds = computed(() => new Set(visibleDevices.value.map((device) => device.id)));

export const selectedDevice = computed(() => {
  return deviceMap.value.get(deviceState.selectedDeviceId) || null;
});

export const deviceAlerts = computed(() => {
  return deviceState.devices
    .filter((device) => device.status === 'fault')
    .map((device) => ({
      ...device,
      handled: deviceState.handledAlertIds.includes(device.id)
    }))
    .sort((a, b) => {
      if (a.handled !== b.handled) {
        return a.handled ? 1 : -1;
      }
      return faultMinute(b.faultAt) - faultMinute(a.faultAt);
    });
});

export const unhandledAlertCount = computed(() => {
  return deviceAlerts.value.filter((alert) => !alert.handled).length;
});

function faultMinute(faultAt) {
  const matched = String(faultAt).match(/(\d{2}):(\d{2})/);
  return matched ? Number(matched[1]) * 60 + Number(matched[2]) : 0;
}

function matchEnergyFilters(device) {
  const filters = deviceState.energyFilters;
  if (filters.buildingId !== 'all' && device.buildingId !== filters.buildingId) {
    return false;
  }
  if (filters.deviceType !== 'all' && device.type !== filters.deviceType) {
    return false;
  }
  return true;
}

export const energyScopedDevices = computed(() => {
  return deviceState.devices.filter(matchEnergyFilters);
});

export const energyTodayBars = computed(() => {
  return Array.from({ length: 12 }, (_, index) => {
    const total = energyScopedDevices.value.reduce((sum, device) => {
      return sum + device.powerSeries[index * 2] + device.powerSeries[index * 2 + 1];
    }, 0);
    return Math.round(total * 0.2 * (deviceState.savingMode ? SAVING_FACTOR : 1) * 10) / 10;
  });
});

export const energyWeekBars = computed(() => {
  return Array.from({ length: 7 }, (_, index) => {
    const total = energyScopedDevices.value.reduce((sum, device) => sum + device.weekSeries[index], 0);
    return Math.round(total * (deviceState.savingMode ? SAVING_FACTOR : 1) * 10) / 10;
  });
});

export const energyTodayTotal = computed(() => {
  return Math.round(energyTodayBars.value.reduce((sum, value) => sum + value, 0) * 10) / 10;
});

export const energyWeekTotal = computed(() => {
  return Math.round(energyWeekBars.value.reduce((sum, value) => sum + value, 0) * 10) / 10;
});

export const livePowerTotal = computed(() => {
  const total = energyScopedDevices.value.reduce((sum, device) => sum + device.power, 0);
  return Math.round(total * (deviceState.savingMode ? SAVING_FACTOR : 1) * 10) / 10;
});

export function setDeviceFilters(patch) {
  Object.assign(deviceState.deviceFilters, patch);
  persistState();
}

export function setEnergyFilters(patch) {
  Object.assign(deviceState.energyFilters, patch);
  persistState();
}

export function toggleDeviceLayer() {
  deviceState.layerVisible = !deviceState.layerVisible;
  persistState();
}

export function selectDevice(device) {
  deviceState.selectedDeviceId = device?.id || '';
  if (device) {
    if (!deviceState.layerVisible) {
      deviceState.layerVisible = true;
    }
    deviceState.deviceFocusKey += 1;
    persistState();
  }
}

export function markAlertHandled(deviceId) {
  if (!deviceState.handledAlertIds.includes(deviceId)) {
    deviceState.handledAlertIds.push(deviceId);
    persistState();
  }
}

export function locateAlert(deviceId) {
  const device = deviceMap.value.get(deviceId);
  if (!device) {
    return;
  }
  selectDevice(device);
}

export function toggleSavingMode() {
  deviceState.savingMode = !deviceState.savingMode;
  deviceState.savingActivatedAt = deviceState.savingMode ? Date.now() : 0;
  persistState();
}

let telemetryTimer = null;

function jitter(base, range, offset) {
  return base + ((Date.now() / 1000 + offset * 13) % (range * 2) - range);
}

function tickDeviceTelemetry() {
  deviceState.devices.forEach((device, index) => {
    if (device.status === 'fault') {
      if (device.type === 'pump' && device.faultLevel === 'critical') {
        device.power = Math.round(device.ratedPower * (1.16 + ((Date.now() / 2000 + index) % 0.08)) * 10) / 10;
      }
      return;
    }

    const hour = new Date().getHours();
    let nextPower = device.powerSeries[hour];
    nextPower += jitter(0, 0.12, index);
    if (deviceState.savingMode && nextPower > device.ratedPower * 0.14) {
      nextPower *= SAVING_FACTOR;
    }
    device.power = Math.max(0, Math.round(nextPower * 10) / 10);

    let nextTemperature = device.temperatureSeries[hour] + jitter(0, 0.25, index + 7);
    if (deviceState.savingMode && device.type !== 'ac') {
      nextTemperature -= 1.2;
    }
    device.temperature = Math.round(nextTemperature * 10) / 10;
    device.runHours = Math.round((device.runHours + 3 / 3600) * 10) / 10;
    device.onlineHours += 1;
  });
}

export function startDeviceTelemetry() {
  if (telemetryTimer || typeof window === 'undefined') {
    return;
  }
  telemetryTimer = window.setInterval(tickDeviceTelemetry, 3000);
}

export function stopDeviceTelemetry() {
  if (!telemetryTimer) {
    return;
  }
  window.clearInterval(telemetryTimer);
  telemetryTimer = null;
}

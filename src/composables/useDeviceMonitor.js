import { computed, reactive, ref } from 'vue';
import { campusBuildings } from '../mock/campusData';
import { campusDevices, deviceTypeMap, deviceTypeNames, energySnapshot, formatAlarmTime } from '../mock/deviceData';

const FILTER_STORAGE_KEY = 'campus-device-filters';
const ENERGY_STORAGE_KEY = 'campus-energy-buildings';
const ALARM_STORAGE_KEY = 'campus-alarm-handled';

const ALL_BUILDINGS = '__all__';

function loadJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch (error) {
    return fallback;
  }
}

function loadArray(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

const devices = reactive(structuredClone(campusDevices));
const energy = reactive(structuredClone(energySnapshot));

const deviceLayerOn = ref(true);
const filters = reactive(
  loadJson(FILTER_STORAGE_KEY, {
    building: 'all',
    type: 'all',
    abnormalOnly: false
  })
);
const energyFilter = reactive({
  dimension: 'building',
  range: 'today',
  target: 'all'
});

const selectedDeviceId = ref('');
const focusDeviceKey = ref(0);
const energyBuildingIds = ref(new Set(loadArray(ENERGY_STORAGE_KEY)));
const energyVersion = ref(0);
const handledAlarmIds = ref(new Set(loadArray(ALARM_STORAGE_KEY)));
const savedEnergy = ref(0);
const energyAppliedAt = ref(0);
const alarmFeed = ref([]);

const deviceBases = new Map();
devices.forEach((device) => {
  deviceBases.set(device.id, {
    power: device.metrics.power,
    temperature: device.metrics.temperature,
    extra: device.metrics.extra,
    powerOrigin: device.metrics.power,
    temperatureOrigin: device.metrics.temperature,
    extraOrigin: device.metrics.extra,
    epoch: 0
  });
});

function persistFilters() {
  window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
}

function persistEnergy() {
  window.localStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify([...energyBuildingIds.value]));
}

function persistHandled() {
  window.localStorage.setItem(ALARM_STORAGE_KEY, JSON.stringify([...handledAlarmIds.value]));
}

function createAlarmEntry(device, createdAt) {
  const base = deviceBases.get(device.id);
  return reactive({
    id: `${device.id}#${base.epoch}`,
    deviceId: device.id,
    deviceName: device.name,
    buildingId: device.buildingId,
    buildingName: device.buildingName,
    type: device.type,
    typeName: deviceTypeNames[device.type],
    message: device.faultMessage,
    createdAt,
    handled: handledAlarmIds.value.has(`${device.id}#${base.epoch}`),
    active: true
  });
}

devices.forEach((device) => {
  if (device.isFault) {
    alarmFeed.value.push(createAlarmEntry(device, device.alarmAt));
  }
});
alarmFeed.value.sort((a, b) => b.createdAt - a.createdAt);

const faultMessages = {
  elevator: ['电梯门锁回路异常，停层保护已触发', '电梯主机温升过高，已自动降频', '电梯平层传感器信号丢失'],
  ac: ['空调压缩机过载告警', '空调回风温度持续偏高', '冷媒压力异常，制冷效率下降'],
  light: ['照明回路漏电保护动作', '驱动电源温度超限，亮度异常', '照明回路电流波动过大'],
  pump: ['水泵轴承温度超限', '出口压力低于阈值，疑似空转', '水泵电机过载保护告警']
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isEnergyDevice(device) {
  return energyBuildingIds.value.has(ALL_BUILDINGS) || energyBuildingIds.value.has(device.buildingId);
}

const filteredDevices = computed(() => {
  return devices.filter((device) => {
    if (filters.building !== 'all' && device.buildingId !== filters.building) {
      return false;
    }
    if (filters.type !== 'all' && device.type !== filters.type) {
      return false;
    }
    if (filters.abnormalOnly && !device.isFault) {
      return false;
    }
    return true;
  });
});

const selectedDevice = computed(() => {
  return devices.find((device) => device.id === selectedDeviceId.value) || null;
});

const unhandledAlarms = computed(() => alarmFeed.value.filter((alarm) => !alarm.handled));

const alarms = computed(() => {
  return [...alarmFeed.value].sort((a, b) => {
    if (a.handled !== b.handled) {
      return a.handled ? 1 : -1;
    }
    return b.createdAt - a.createdAt;
  });
});

const deviceStats = computed(() => {
  const total = devices.length;
  const fault = devices.filter((device) => device.isFault).length;
  const energyOn = energyBuildingIds.value.size > 0;
  const online = total - fault;
  return { total, fault, online, energyOn };
});

function setFilter(key, value) {
  filters[key] = value;
  persistFilters();
}

function resetFilters() {
  filters.building = 'all';
  filters.type = 'all';
  filters.abnormalOnly = false;
  persistFilters();
}

function selectDevice(deviceId) {
  if (!deviceId) {
    selectedDeviceId.value = '';
    return;
  }
  selectedDeviceId.value = deviceId;
  focusDeviceKey.value += 1;
}

function applyEnergy(target) {
  if (target === ALL_BUILDINGS) {
    energyBuildingIds.value = new Set([ALL_BUILDINGS, ...campusBuildings.map((building) => building.id)]);
  } else {
    energyBuildingIds.value = new Set([...energyBuildingIds.value, target]);
  }
  energyAppliedAt.value = Date.now();
  energyVersion.value += 1;
  persistEnergy();
}

function cancelEnergy(target) {
  if (target === ALL_BUILDINGS) {
    energyBuildingIds.value = new Set();
  } else {
    const next = new Set(energyBuildingIds.value);
    next.delete(target);
    if (next.size === campusBuildings.length + 1) {
      next.clear();
    }
    energyBuildingIds.value = next;
  }
  energyVersion.value += 1;
  persistEnergy();
}

function handleAlarm(alarmId) {
  const alarm = alarmFeed.value.find((item) => item.id === alarmId);
  if (alarm) {
    alarm.handled = true;
  }
  handledAlarmIds.value = new Set(handledAlarmIds.value).add(alarmId);
  persistHandled();
}

function raiseFault(device) {
  const base = deviceBases.get(device.id);
  base.epoch += 1;
  device.isFault = true;
  device.faultMessage = faultMessages[device.type][base.epoch % faultMessages[device.type].length];
  device.alarmAt = Date.now();
  const entry = createAlarmEntry(device, device.alarmAt);
  alarmFeed.value.unshift(entry);
  if (alarmFeed.value.length > 60) {
    alarmFeed.value.length = 60;
  }
}

function clearFault(device) {
  device.isFault = false;
  device.faultMessage = '';
  const entry = alarmFeed.value.find((alarm) => alarm.deviceId === device.id && alarm.active);
  if (entry) {
    entry.active = false;
  }
}

function shiftDeviceStatus() {
  const faultyDevices = devices.filter((device) => device.isFault);
  const roll = Math.random();
  if (roll < 0.55 && faultyDevices.length > 0) {
    const device = faultyDevices[Math.floor(Math.random() * faultyDevices.length)];
    clearFault(device);
    return;
  }

  if (roll > 0.72 && faultyDevices.length < 16) {
    const healthy = devices.filter((device) => !device.isFault);
    const candidate = healthy[Math.floor(Math.random() * healthy.length)];
    if (candidate) {
      raiseFault(candidate);
    }
  }
}

function tickDeviceMetrics() {
  devices.forEach((device) => {
    const base = deviceBases.get(device.id);
    const spec = deviceTypeMap[device.type].metrics;
    base.power = clamp(base.power * (1 + (Math.random() - 0.5) * 0.08), spec.power.min * 0.6, spec.power.max * 1.25);
    base.temperature = clamp(base.temperature + (Math.random() - 0.5) * 0.7, spec.temperature.min - 2, spec.temperature.max + 2);
    base.extra = clamp(base.extra * (1 + (Math.random() - 0.5) * 0.05), spec.extra.min * 0.7, spec.extra.max * 1.2);
    device.metrics.runtime += Math.random() < 0.3 ? 1 : 0;

    if (device.isFault) {
      device.metrics.power = round(spec.power.fault * (0.94 + Math.random() * 0.12));
      device.metrics.temperature = round(spec.temperature.fault + (Math.random() - 0.5) * 1.4, 1);
      device.metrics.extra = round(
        spec.extra.fault ?? base.extraOrigin * (spec.extra.faultMultiplier ?? 1) + (Math.random() - 0.5) * 0.1,
        device.type === 'light' ? 0 : 2
      );
    } else {
      const saving = isEnergyDevice(device);
      device.metrics.power = round(base.power * (saving ? 0.55 : 1), 2);
      device.metrics.temperature = round(base.temperature, 1);
      device.metrics.extra = round(
        base.extra * (saving && device.type === 'light' ? 0.5 : 1),
        device.type === 'light' ? 0 : 2
      );
    }

    device.powerSeries.push(device.metrics.power);
    device.powerSeries.shift();
  });
}

function accumulateEnergy() {
  devices.forEach((device) => {
    const saving = isEnergyDevice(device) && !device.isFault;
    const buildingEntry = energy.byBuilding[device.buildingId];
    const typeEntry = energy.byType[device.type];
    if (!buildingEntry || !typeEntry) {
      return;
    }
    const baseUsage = deviceBases.get(device.id).power * 0.25;
    const effectiveUsage = device.isFault ? baseUsage * 1.12 : baseUsage * (saving ? 0.55 : 1);
    buildingEntry.today = round(buildingEntry.today + effectiveUsage, 1);
    typeEntry.today = round(typeEntry.today + effectiveUsage, 1);
    if (saving) {
      savedEnergy.value = round(savedEnergy.value + (baseUsage - effectiveUsage), 1);
    }
  });
}

let timer = null;

function startSimulation() {
  if (timer || typeof window === 'undefined') {
    return;
  }
  timer = window.setInterval(() => {
    tickDeviceMetrics();
    accumulateEnergy();
    if (Math.random() < 0.45) {
      shiftDeviceStatus();
    }
  }, 3000);
}

function isScopeEnergyOn(scopeId) {
  if (scopeId === 'all') {
    return energyBuildingIds.value.has(ALL_BUILDINGS);
  }
  if (campusBuildings.some((building) => building.id === scopeId)) {
    return energyBuildingIds.value.has(ALL_BUILDINGS) || energyBuildingIds.value.has(scopeId);
  }
  return devices.some((device) => device.type === scopeId && isEnergyDevice(device));
}

export function useDeviceMonitor() {
  return {
    campusBuildings,
    devices,
    energy,
    deviceLayerOn,
    filters,
    energyFilter,
    selectedDeviceId,
    selectedDevice,
    focusDeviceKey,
    filteredDevices,
    energyBuildingIds,
    energyVersion,
    alarms,
    unhandledAlarms,
    deviceStats,
    savedEnergy,
    energyAppliedAt,
    setFilter,
    resetFilters,
    selectDevice,
    applyEnergy,
    cancelEnergy,
    isEnergyDevice,
    isScopeEnergyOn,
    handleAlarm,
    startSimulation,
    formatAlarmTime,
    ALL_BUILDINGS
  };
}

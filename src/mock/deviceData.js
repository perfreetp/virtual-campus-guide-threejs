import { campusBuildings } from './campusData';

export const deviceTypes = [
  {
    value: 'elevator',
    label: '电梯',
    color: '#39d8ff',
    unit: '台',
    metrics: {
      temperature: { label: '轿厢温度', min: 22, max: 27, unit: '℃', fault: 36 },
      power: { label: '实时功率', min: 2.4, max: 7.8, unit: 'kW', fault: 12.6 },
      runtime: { label: '运行时长', min: 3200, max: 18600, unit: 'h' },
      extra: { label: '今日启停', min: 120, max: 460, unit: '次', faultMultiplier: 2.4 }
    }
  },
  {
    value: 'ac',
    label: '空调',
    color: '#4fe7a4',
    unit: '台',
    metrics: {
      temperature: { label: '出风温度', min: 14, max: 20, unit: '℃', fault: 6 },
      power: { label: '实时功率', min: 1.6, max: 6.2, unit: 'kW', fault: 10.8 },
      runtime: { label: '运行时长', min: 1800, max: 12400, unit: 'h' },
      extra: { label: '回风温度', min: 21, max: 27, unit: '℃', fault: 34 }
    }
  },
  {
    value: 'light',
    label: '照明',
    color: '#ffd866',
    unit: '组',
    metrics: {
      temperature: { label: '回路温度', min: 26, max: 38, unit: '℃', fault: 66 },
      power: { label: '实时功率', min: 0.8, max: 3.4, unit: 'kW', fault: 5.9 },
      runtime: { label: '运行时长', min: 900, max: 7600, unit: 'h' },
      extra: { label: '亮度', min: 62, max: 96, unit: '%', faultMultiplier: 0.35 }
    }
  },
  {
    value: 'pump',
    label: '水泵',
    color: '#7c8cff',
    unit: '台',
    metrics: {
      temperature: { label: '轴承温度', min: 30, max: 46, unit: '℃', fault: 72 },
      power: { label: '实时功率', min: 2.2, max: 8.6, unit: 'kW', fault: 14.2 },
      runtime: { label: '运行时长', min: 2600, max: 15800, unit: 'h' },
      extra: { label: '出口压力', min: 0.32, max: 0.68, unit: 'MPa', fault: 0.08 }
    }
  }
];

export const deviceTypeMap = deviceTypes.reduce((map, item) => {
  map[item.value] = item;
  return map;
}, {});

export const deviceTypeNames = deviceTypes.reduce((map, item) => {
  map[item.value] = item.label;
  return map;
}, {});

const typeFaultMessages = {
  elevator: ['电梯门锁回路异常，停层保护已触发', '电梯主机温升过高，已自动降频', '电梯平层传感器信号丢失'],
  ac: ['空调压缩机过载告警', '空调回风温度持续偏高', '冷媒压力异常，制冷效率下降'],
  light: ['照明回路漏电保护动作', '驱动电源温度超限，亮度异常', '照明回路电流波动过大'],
  pump: ['水泵轴承温度超限', '出口压力低于阈值，疑似空转', '水泵电机过载保护告警']
};

const deviceNamePrefix = {
  elevator: '电梯',
  ac: '空调机组',
  light: '照明回路',
  pump: '水泵'
};

function hashCode(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

const categoryDevicePlan = {
  teaching: { elevator: 3, ac: 3, light: 4, pump: 2 },
  life: { elevator: 2, ac: 2, light: 3, pump: 2 },
  sports: { elevator: 1, ac: 2, light: 2, pump: 2 },
  service: { elevator: 2, ac: 2, light: 3, pump: 2 }
};

const shapePlanOverride = {
  gate: { elevator: 0, ac: 1, light: 2, pump: 0 },
  playground: { elevator: 0, ac: 0, light: 2, pump: 1 },
  pool: { elevator: 0, ac: 2, light: 2, pump: 2 },
  clocktower: { elevator: 1, ac: 1, light: 2, pump: 0 }
};

function devicePlanFor(building) {
  return shapePlanOverride[building.shape] || categoryDevicePlan[building.category] || categoryDevicePlan.service;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function jitter(rand, value, ratio = 0.06) {
  return value * (1 + (rand() * 2 - 1) * ratio);
}

function buildSeries(rand, basePower, length = 24) {
  const hourlyWeight = [
    0.42, 0.38, 0.36, 0.34, 0.35, 0.4,
    0.62, 0.82, 0.96, 1.0, 0.94, 0.86,
    0.78, 0.9, 0.98, 1.0, 0.92, 0.78,
    0.66, 0.72, 0.6, 0.52, 0.46, 0.42
  ];
  return hourlyWeight.slice(0, length).map((weight) => round(Math.max(0.1, jitter(rand, basePower * weight, 0.08)), 2));
}

function createDevice(building, type, index, rand) {
  const spec = deviceTypeMap[type];
  const metricsSpec = spec.metrics;
  const isFault = rand() < 0.14;
  const width = building.size[0];
  const depth = building.size[2];
  const height = building.size[1];
  const slots = [
    [-0.28, -0.22],
    [0.26, -0.26],
    [-0.24, 0.24],
    [0.28, 0.18],
    [0.0, 0.0],
    [0.0, -0.34],
    [0.0, 0.34]
  ];
  const slot = slots[(index + type.length) % slots.length];
  const isGroundDevice = type === 'light' || building.shape === 'playground' || building.shape === 'gate';
  const offset = [
    slot[0] * Math.max(1.2, width - 1.2) + (rand() - 0.5) * 0.5,
    isGroundDevice ? 0 : height + 0.5 + rand() * 0.35,
    slot[1] * Math.max(1.2, depth - 1.2) + (rand() - 0.5) * 0.5
  ];
  const powerBase = isFault ? metricsSpec.power.fault : rand() * (metricsSpec.power.max - metricsSpec.power.min) + metricsSpec.power.min;
  const id = `${building.id}-${type}-${index + 1}`;
  const alarmTime = new Date();
  alarmTime.setHours(7 + Math.floor(rand() * 11), Math.floor(rand() * 60), 0, 0);

  return {
    id,
    name: `${deviceNamePrefix[type]} ${String(index + 1).padStart(2, '0')}`,
    type,
    buildingId: building.id,
    buildingName: building.name,
    offset,
    isFault,
    faultMessage: isFault ? pick(rand, typeFaultMessages[type]) : '',
    alarmAt: isFault ? alarmTime.getTime() : 0,
    metrics: {
      temperature: round(
        isFault ? jitter(rand, metricsSpec.temperature.fault, 0.04) : rand() * (metricsSpec.temperature.max - metricsSpec.temperature.min) + metricsSpec.temperature.min,
        1
      ),
      power: round(powerBase, 2),
      runtime: Math.floor(rand() * (metricsSpec.runtime.max - metricsSpec.runtime.min) + metricsSpec.runtime.min),
      extra: round(
        isFault
          ? (metricsSpec.extra.fault ?? jitter(rand, metricsSpec.extra.max, 0.2) * (metricsSpec.extra.faultMultiplier ?? 1))
          : rand() * (metricsSpec.extra.max - metricsSpec.extra.min) + metricsSpec.extra.min,
        type === 'light' ? 0 : 2
      )
    },
    powerSeries: buildSeries(rand, powerBase)
  };
}

function createBuildingDevices(building) {
  const plan = devicePlanFor(building);
  const devices = [];
  deviceTypes.forEach((typeItem) => {
    const count = plan[typeItem.value] || 0;
    for (let index = 0; index < count; index += 1) {
      const rand = mulberry32(hashCode(`${building.id}-${typeItem.value}-${index}`));
      devices.push(createDevice(building, typeItem.value, index, rand));
    }
  });
  return devices;
}

export const campusDevices = campusBuildings.reduce((list, building) => {
  list.push(...createBuildingDevices(building));
  return list;
}, []);

const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function createEnergySnapshot(devices) {
  const byBuilding = {};
  const byType = {};
  campusBuildings.forEach((building) => {
    byBuilding[building.id] = {
      id: building.id,
      name: building.name,
      today: 0,
      week: [],
      weekTotal: 0
    };
  });
  deviceTypes.forEach((typeItem) => {
    byType[typeItem.value] = {
      id: typeItem.value,
      name: typeItem.label,
      today: 0,
      week: [],
      weekTotal: 0
    };
  });

  const weekFactor = [0.92, 0.98, 1.04, 0.96, 1.0, 0.62, 0.58];
  devices.forEach((device) => {
    const rand = mulberry32(hashCode(device.id + '-energy'));
    const dailyBase = device.powerSeries.reduce((sum, value) => sum + value, 0) * 0.62;
    const today = round(dailyBase * (device.isFault ? 1.18 : 1), 1);
    const week = weekFactor.map((factor, dayIndex) => {
      const value = dailyBase * factor * (0.92 + rand() * 0.16) * (device.isFault ? 1.1 : 1);
      return round(value, 1);
    });
    byBuilding[device.buildingId].today += today;
    byType[device.type].today += today;
    week.forEach((value, dayIndex) => {
      byBuilding[device.buildingId].week[dayIndex] = round((byBuilding[device.buildingId].week[dayIndex] || 0) + value, 1);
      byType[device.type].week[dayIndex] = round((byType[device.type].week[dayIndex] || 0) + value, 1);
    });
  });

  Object.values(byBuilding).forEach((item) => {
    item.today = round(item.today, 1);
    item.weekTotal = round(item.week.reduce((sum, value) => sum + value, 0), 1);
  });
  Object.values(byType).forEach((item) => {
    item.today = round(item.today, 1);
    item.weekTotal = round(item.week.reduce((sum, value) => sum + value, 0), 1);
  });

  return {
    byBuilding,
    byType,
    weekLabels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    hourLabels: Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`)
  };
}

export const energySnapshot = createEnergySnapshot(campusDevices);

export function formatAlarmTime(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const prefix =
    date.toDateString() === today.toDateString()
      ? '今天'
      : dayNames[date.getDay()];
  return `${prefix} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

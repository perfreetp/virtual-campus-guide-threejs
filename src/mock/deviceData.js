// 校园设备图层 mock 数据：电梯 / 空调 / 照明 / 水泵
import { campusBuildings } from './campusData';

export const deviceTypeNames = {
  elevator: '电梯',
  ac: '空调',
  lighting: '照明',
  pump: '水泵'
};

export const deviceTypeList = [
  { value: 'all', label: '全部' },
  { value: 'elevator', label: '电梯' },
  { value: 'ac', label: '空调' },
  { value: 'lighting', label: '照明' },
  { value: 'pump', label: '水泵' }
];

export const deviceStatusNames = {
  running: '运行中',
  standby: '待机',
  fault: '故障'
};

export const deviceTypeMeta = {
  elevator: {
    label: '电梯',
    color: '#46e2ff',
    unit: 'kW',
    ratedRange: [5.6, 15.2],
    tempRange: [33, 47],
    profile: [0.18, 0.12, 0.1, 0.1, 0.16, 0.42, 0.72, 0.84, 0.66, 0.52, 0.6, 0.7, 0.62, 0.54, 0.58, 0.66, 0.52, 0.46, 0.4, 0.34, 0.3, 0.26, 0.22, 0.18],
    faults: [
      { level: 'critical', message: '主机电流过载，电梯已紧急停靠' },
      { level: 'warning', message: '轿厢门机异常，开关门超时' }
    ]
  },
  ac: {
    label: '空调',
    color: '#37b6ff',
    unit: 'kW',
    ratedRange: [2.4, 9.8],
    tempRange: [19, 28],
    profile: [0.3, 0.28, 0.32, 0.36, 0.44, 0.62, 0.82, 0.92, 0.96, 0.9, 0.84, 0.88, 0.92, 0.9, 0.86, 0.84, 0.78, 0.66, 0.56, 0.5, 0.46, 0.4, 0.36, 0.32],
    faults: [
      { level: 'critical', message: '压缩机高压保护，制冷中断' },
      { level: 'warning', message: '回风温度持续偏高，请检查滤网' }
    ]
  },
  lighting: {
    label: '照明',
    color: '#ffd76a',
    unit: 'kW',
    ratedRange: [0.8, 4.6],
    tempRange: [30, 48],
    profile: [0.95, 0.9, 0.7, 0.34, 0.16, 0.12, 0.2, 0.42, 0.6, 0.52, 0.44, 0.4, 0.42, 0.4, 0.44, 0.48, 0.56, 0.72, 0.9, 1, 1, 0.98, 0.96, 0.94],
    faults: [
      { level: 'warning', message: '回路漏电，部分灯具熄灭' },
      { level: 'critical', message: '照明回路短路，开关已跳闸' }
    ]
  },
  pump: {
    label: '水泵',
    color: '#49f0b6',
    unit: 'kW',
    ratedRange: [3.2, 11.5],
    tempRange: [28, 44],
    profile: [0.62, 0.58, 0.66, 0.74, 0.9, 0.86, 0.82, 0.8, 0.78, 0.74, 0.76, 0.8, 0.78, 0.74, 0.72, 0.76, 0.82, 0.88, 0.92, 0.86, 0.78, 0.7, 0.64, 0.6],
    faults: [
      { level: 'critical', message: '出水压力骤降，泵体疑似气蚀' },
      { level: 'warning', message: '轴承振动超标，建议安排检修' }
    ]
  }
};

const zoneLabels = {
  elevator: ['东梯', '西梯', '客梯', '消防梯'],
  ac: ['1号主机', '2号主机', '末端机组', '新风空调'],
  lighting: ['公共照明', '走廊照明', '室外照明', '应急照明'],
  pump: ['生活给水泵', '消防稳压泵', '中水循环泵', '排污泵']
};

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function seededValue(seed, min, max) {
  return min + (seed / 4294967296) * (max - min);
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function buildingDevicePlan(building) {
  const height = building.size[1];
  const plan = { elevator: 0, ac: 0, lighting: 0, pump: 0 };

  if (building.shape === 'gate') {
    plan.lighting = 1;
    return plan;
  }

  if (building.shape === 'playground') {
    plan.lighting = 2;
    plan.pump = 1;
    return plan;
  }

  if (building.shape === 'dome') {
    plan.ac = 2;
    plan.lighting = 2;
    plan.pump = 1;
    return plan;
  }

  if (building.shape === 'pool') {
    plan.ac = 1;
    plan.lighting = 2;
    plan.pump = 2;
    return plan;
  }

  plan.elevator = height >= 5.5 ? 2 : height >= 3.4 ? 1 : 0;
  plan.lighting = height >= 5 ? 2 : 1;
  plan.ac = height < 1 ? 0 : building.category === 'life' || building.category === 'sports' ? 2 : 2;

  if (building.id === 'solar-hub') {
    plan.ac = 2;
    plan.pump = 1;
  }

  if (building.category === 'life' || ['canteen', 'gym', 'solar-hub'].includes(building.id)) {
    plan.pump = Math.max(plan.pump, 1);
  }

  return plan;
}

function deviceAnchor(building, type, index) {
  const [width, height, depth] = building.size;
  const halfX = Math.max(width / 2 - 0.5, 0.5);
  const halfZ = Math.max(depth / 2 - 0.5, 0.4);

  if (building.shape === 'gate') {
    return { x: (index - 0.5) * 3.4, y: 2.4, z: 0 };
  }

  if (building.shape === 'playground') {
    const offsets = [
      { x: -width * 0.34, z: -depth * 0.3 },
      { x: width * 0.34, z: -depth * 0.3 },
      { x: 0, z: depth * 0.28 }
    ];
    return { x: offsets[index].x, y: 0.4, z: offsets[index].z };
  }

  if (building.shape === 'dome') {
    if (type === 'ac') {
      return { x: index ? halfX + 0.7 : -halfX - 0.7, y: 0.35, z: halfZ };
    }
    if (type === 'lighting') {
      return { x: index ? halfX : -halfX, y: height * 0.72, z: index ? -halfZ : halfZ };
    }
    return { x: halfX, y: 0.35, z: -halfZ };
  }

  if (type === 'elevator') {
    return { x: index ? halfX : -halfX, y: 0.05, z: halfZ };
  }

  if (type === 'ac') {
    return {
      x: (index % 2 ? 0.32 : -0.32) * width,
      y: height + 0.22,
      z: index % 3 === 2 ? 0 : (index % 2 ? halfZ * 0.7 : -halfZ * 0.7)
    };
  }

  if (type === 'lighting') {
    return {
      x: index ? halfX : -halfX,
      y: height >= 5 ? height * 0.72 : height + 0.34,
      z: index ? -halfZ : halfZ
    };
  }

  if (type === 'pump') {
    return { x: -halfX, y: 0.05, z: -halfZ + index * 0.75 };
  }

  return { x: 0, y: 0, z: 0 };
}

function buildPowerSeries(seed, rated, profile) {
  return profile.map((factor, hour) => {
    const noise = 0.92 + ((seed + hour * 97) % 17) / 100;
    return round1(rated * factor * noise);
  });
}

function buildTempSeries(seed, type, meta, hour) {
  const [minTemp, maxTemp] = meta.tempRange;
  const base = (seed % 100) / 100 * (maxTemp - minTemp) + minTemp;
  if (type === 'ac') {
    return round1(base + Math.sin(((hour - 9) / 24) * Math.PI * 2) * 1.6 + ((seed + hour) % 5 - 2) * 0.12);
  }
  const wave = type === 'lighting'
    ? Math.sin(((hour - 19) / 24) * Math.PI * 2) * 2.2
    : Math.sin((hour / 24) * Math.PI * 2) * 1.1;
  return round1(base + wave + ((seed + hour * 3) % 7 - 3) * 0.18);
}

function buildDevices() {
  const devices = [];
  let sequence = 0;

  campusBuildings.forEach((building) => {
    const plan = buildingDevicePlan(building);
    Object.entries(plan).forEach(([type, count]) => {
      for (let index = 0; index < count; index += 1) {
        sequence += 1;
        const id = `dev-${String(sequence).padStart(3, '0')}`;
        const meta = deviceTypeMeta[type];
        const seed = hashString(`${building.id}-${type}-${index}`);
        const rated = round1(seededValue((seed * 7 + 13) % 4294967296, meta.ratedRange[0], meta.ratedRange[1]));
        const powerSeries = buildPowerSeries(seed, rated, meta.profile);
        const temperatureSeries = Array.from({ length: 24 }, (_, hour) => buildTempSeries(seed, type, meta, hour));
        const todayEnergy = round1(powerSeries.reduce((sum, value) => sum + value, 0) * 0.2);
        const weekFactors = [0.86, 0.94, 1.02, 0.9, 1.08, 0.98, 1];
        const weekSeries = weekFactors.map((factor, dayIndex) => {
          return round1(todayEnergy * factor * (0.94 + ((seed + dayIndex * 31) % 13) / 100));
        });
        weekSeries[6] = todayEnergy;
        const anchor = deviceAnchor(building, type, index);

        devices.push({
          id,
          name: `${building.name}-${zoneLabels[type][index % zoneLabels[type].length]}`,
          type,
          buildingId: building.id,
          buildingName: building.name,
          position: [
            building.position[0] + anchor.x,
            anchor.y,
            building.position[2] + anchor.z
          ],
          ratedPower: rated,
          power: powerSeries.at(-1),
          temperature: temperatureSeries.at(-1),
          powerSeries,
          temperatureSeries,
          todayEnergy,
          weekSeries,
          runHours: 420 + (seed % 17600),
          onlineHours: (seed % 72) + 1,
          installDate: `202${1 + (seed % 4)}-0${1 + (seed % 9)}-${10 + (seed % 18)}`,
          status: 'running'
        });
      }
    });
  });

  applyFaults(devices);
  return devices;
}

function applyFaults(devices) {
  const faultIds = [];
  const taken = new Set();
  const targetCount = Math.max(4, Math.round(devices.length * 0.125));

  Object.keys(deviceTypeMeta).forEach((type, typeIndex) => {
    const candidates = devices.filter((device) => device.type === type);
    const picked = candidates[hashString(type) % candidates.length];
    faultIds.push({ id: picked.id, level: typeIndex % 2 ? 'warning' : 'critical' });
    taken.add(picked.id);
  });

  devices.forEach((device) => {
    if (taken.has(device.id) || faultIds.length >= targetCount) {
      return;
    }
    const score = hashString(`${device.id}-fault`);
    if (score % 8 === 0) {
      faultIds.push({ id: device.id, level: score % 16 === 0 ? 'critical' : 'warning' });
      taken.add(device.id);
    }
  });

  let guard = 0;
  while (faultIds.length < targetCount && guard < 100) {
    guard += 1;
    const candidate = devices[hashString(`extra-${faultIds.length}-${guard}`) % devices.length];
    if (!taken.has(candidate.id)) {
      faultIds.push({ id: candidate.id, level: 'warning' });
      taken.add(candidate.id);
    }
  }

  faultIds.forEach((faultRef, index) => {
    const device = devices.find((item) => item.id === faultRef.id);
    const meta = deviceTypeMeta[device.type];
    const fault = meta.faults.find((item) => item.level === faultRef.level) || meta.faults[0];
    device.status = 'fault';
    device.faultLevel = fault.level;
    device.faultMessage = fault.message;
    device.faultAt = buildFaultTime(index);

    if (device.type === 'ac') {
      device.temperature = round1(device.temperature + 5.5);
      device.temperatureSeries = device.temperatureSeries.map((value, hour) => round1(value + (hour >= 17 ? 5.5 : 2.2)));
      device.powerSeries = device.powerSeries.map((value, hour) => round1(value * (hour >= 17 ? 0.18 : 0.62)));
    } else if (device.type === 'lighting') {
      device.powerSeries = device.powerSeries.map((value, hour) => round1(value * (hour >= 19 ? 0.22 : 0.4)));
    } else if (fault.level === 'critical') {
      if (device.type === 'elevator') {
        device.powerSeries = device.powerSeries.map((value, hour) => round1(value + (hour >= 20 ? device.ratedPower * 0.92 : 0)));
      } else {
        device.powerSeries = device.powerSeries.map((value, hour) => round1(value * (hour >= 20 ? 0.06 : 0.35)));
        if (device.type === 'pump') {
          device.power = round1(device.ratedPower * 1.18);
        }
      }
    } else {
      device.powerSeries = device.powerSeries.map((value) => round1(value * 0.5));
      if (device.type === 'pump') {
        device.temperature = round1(device.temperature + 6);
      }
    }

    device.power = device.powerSeries.at(-1);
    device.temperature = round1(device.temperature);
    device.todayEnergy = round1(device.powerSeries.reduce((sum, value) => sum + value, 0) * 0.2);
    device.weekSeries[6] = device.todayEnergy;
  });
}

function buildFaultTime(index) {
  const hour = String(7 + (index * 3) % 14).padStart(2, '0');
  const minute = String((index * 17) % 60).padStart(2, '0');
  return `今日 ${hour}:${minute}`;
}

export const campusDevices = buildDevices();

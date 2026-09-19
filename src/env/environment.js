export const environmentRegions = [
  { key: 'all', label: '全部区域' },
  { key: 'teaching', label: '教学区' },
  { key: 'life', label: '生活区' },
  { key: 'sports', label: '运动区' },
  { key: 'service', label: '服务区' }
];

export const regionNames = {
  teaching: '教学区',
  life: '生活区',
  sports: '运动区',
  service: '服务区'
};

export const metricsMeta = {
  aqi: {
    key: 'aqi',
    label: '空气质量',
    short: '空气',
    unit: 'AQI',
    decimals: 0,
    levels: [
      { max: 50, label: '优', color: '#2ecc71' },
      { max: 100, label: '良', color: '#f1c40f' },
      { max: 150, label: '轻度污染', color: '#e67e22' },
      { max: 200, label: '中度污染', color: '#e74c3c' },
      { max: 300, label: '重度污染', color: '#9b59b6' },
      { max: Infinity, label: '严重污染', color: '#7d1734' }
    ],
    limit: 100,
    limitLabel: 'AQI > 100'
  },
  temperature: {
    key: 'temperature',
    label: '温度',
    short: '温度',
    unit: '℃',
    decimals: 1,
    levels: [
      { max: 4.9, label: '寒冷', color: '#3498db' },
      { max: 9.9, label: '偏冷', color: '#5dade2' },
      { max: 17.9, label: '凉爽', color: '#58d68d' },
      { max: 25.9, label: '舒适', color: '#2ecc71' },
      { max: 31.9, label: '闷热', color: '#f39c12' },
      { max: Infinity, label: '高温', color: '#e74c3c' }
    ],
    limit: 32,
    lowLimit: 5,
    limitLabel: '< 5℃ 或 > 32℃'
  },
  humidity: {
    key: 'humidity',
    label: '湿度',
    short: '湿度',
    unit: '%',
    decimals: 0,
    levels: [
      { max: 29, label: '干燥', color: '#e67e22' },
      { max: 39, label: '偏干', color: '#f1c40f' },
      { max: 59, label: '舒适', color: '#2ecc71' },
      { max: 79, label: '清爽', color: '#58d68d' },
      { max: 89, label: '潮湿', color: '#5dade2' },
      { max: Infinity, label: '过湿', color: '#2980b9' }
    ],
    limit: 80,
    lowLimit: 30,
    limitLabel: '< 30% 或 > 80%'
  },
  noise: {
    key: 'noise',
    label: '噪音',
    short: '噪音',
    unit: 'dB',
    decimals: 0,
    levels: [
      { max: 39, label: '安静', color: '#2ecc71' },
      { max: 54, label: '宁静', color: '#58d68d' },
      { max: 69, label: '正常', color: '#f1c40f' },
      { max: 79, label: '嘈杂', color: '#e67e22' },
      { max: Infinity, label: '扰民', color: '#e74c3c' }
    ],
    limit: 70,
    limitLabel: '噪音 > 70dB'
  }
};

export const metricKeys = ['aqi', 'temperature', 'humidity', 'noise'];

export function evaluateMetric(metricKey, value) {
  const meta = metricsMeta[metricKey];
  const level = meta.levels.find((item) => value <= item.max) || meta.levels.at(-1);
  let exceeded = false;
  if (metricKey === 'temperature') {
    exceeded = value > meta.limit || value < meta.lowLimit;
  } else if (metricKey === 'humidity') {
    exceeded = value > meta.limit || value < meta.lowLimit;
  } else {
    exceeded = value > meta.limit;
  }
  return {
    key: metricKey,
    label: meta.label,
    unit: meta.unit,
    value,
    levelLabel: level.label,
    color: exceeded && level.color === '#f1c40f' ? '#e67e22' : level.color,
    exceeded
  };
}

export function formatMetric(metricKey, value) {
  return `${Number(value).toFixed(metricsMeta[metricKey].decimals)}${metricsMeta[metricKey].unit}`;
}

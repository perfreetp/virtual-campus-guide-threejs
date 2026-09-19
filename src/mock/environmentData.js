export const metricNames = {
  air: '空气质量',
  temperature: '温度',
  humidity: '湿度',
  noise: '噪音'
};

export const metricUnits = {
  air: 'AQI',
  temperature: '°C',
  humidity: '%RH',
  noise: 'dB'
};

export const metricLimits = {
  air: 100,
  temperature: 35,
  humidity: 80,
  noise: 60
};

export const levelNames = ['优', '良', '轻度', '超标'];

export const levelColors = ['#35e08c', '#ffd54a', '#ff9f43', '#ff5252'];

export const weatherOptions = [
  { label: '晴天', value: 'sunny' },
  { label: '雨天', value: 'rain' },
  { label: '雾天', value: 'fog' },
  { label: '雪天', value: 'snow' }
];

export const monitorPoints = [
  { id: 'mon-gate', name: '校门广场站', category: 'service', position: [-13.2, 0, 8.2], base: { air: 62, temperature: 0.4, humidity: 4, noise: 8 } },
  { id: 'mon-teaching', name: '明德教学区站', category: 'teaching', position: [-4.4, 0, -0.6], base: { air: 48, temperature: 0, humidity: 0, noise: 2 } },
  { id: 'mon-library', name: '图书馆湖畔站', category: 'teaching', position: [5.6, 0, -1.2], base: { air: 42, temperature: -0.6, humidity: 6, noise: -8 } },
  { id: 'mon-lab', name: '实验中心站', category: 'teaching', position: [10.4, 0, -6.8], base: { air: 78, temperature: 0.8, humidity: -4, noise: 4 } },
  { id: 'mon-academy', name: '格物学院站', category: 'teaching', position: [-13.4, 0, -5.6], base: { air: 55, temperature: -0.2, humidity: 2, noise: -4 } },
  { id: 'mon-solar', name: '光伏楼站', category: 'teaching', position: [7.2, 0, -11.2], base: { air: 46, temperature: 1.2, humidity: -6, noise: -6 } },
  { id: 'mon-dorm', name: '宿舍北区站', category: 'life', position: [9.4, 0, 5.4], base: { air: 58, temperature: 0.2, humidity: 3, noise: 0 } },
  { id: 'mon-canteen', name: '食堂广场站', category: 'life', position: [1.2, 0, 7.6], base: { air: 118, temperature: 3.5, humidity: 8, noise: 10 } },
  { id: 'mon-market', name: '商业街站', category: 'life', position: [-6.2, 0, 6.8], base: { air: 70, temperature: 0.6, humidity: 2, noise: 6 } },
  { id: 'mon-playground', name: '操场东站', category: 'sports', position: [-6.4, 0, -8.8], base: { air: 44, temperature: 0.8, humidity: -2, noise: 12 } },
  { id: 'mon-gym', name: '体育馆站', category: 'sports', position: [-14.6, 0, 3.1], base: { air: 50, temperature: -0.4, humidity: 0, noise: 3 } },
  { id: 'mon-parking', name: '停车楼站', category: 'service', position: [16.6, 0, 4.4], base: { air: 138, temperature: 4.0, humidity: -8, noise: 9 } }
];

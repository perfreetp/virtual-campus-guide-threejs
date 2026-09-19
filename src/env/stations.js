export const monitorStations = [
  {
    id: 'st-gate',
    name: '校门广场站',
    region: 'service',
    position: [-12.6, 0, 11.2],
    bias: { aqi: 14, temperature: 0.3, humidity: -3, noise: 4 }
  },
  {
    id: 'st-teaching',
    name: '明德教学楼站',
    region: 'teaching',
    position: [-5.2, 0, 0.6],
    bias: { aqi: -6, temperature: 0.2, humidity: 1, noise: 1 }
  },
  {
    id: 'st-library',
    name: '图书馆站',
    region: 'teaching',
    position: [7.8, 0, -3.5],
    bias: { aqi: -8, temperature: 0, noise: 2, noiseExtra: 0 }
  },
  {
    id: 'st-lab',
    name: '实验中心站',
    region: 'teaching',
    position: [14.6, 0, -10.8],
    bias: { aqi: 6, temperature: 0.4, humidity: -1, noise: -1 }
  },
  {
    id: 'st-academy',
    name: '格物学院站',
    region: 'teaching',
    position: [-17.6, 0, -5.2],
    bias: { aqi: -4, temperature: -0.2, humidity: 2, noise: -3 }
  },
  {
    id: 'st-dorm-north',
    name: '北区宿舍站',
    region: 'life',
    position: [13.6, 0, 9.8],
    bias: { aqi: -2, temperature: 0.1, humidity: 0, noise: 3 }
  },
  {
    id: 'st-canteen',
    name: '蓝湾食堂站',
    region: 'life',
    position: [3.3, 0, 11.6],
    bias: { aqi: 2, temperature: 0.5, humidity: 4, noise: 13 }
  },
  {
    id: 'st-market',
    name: '商业街站',
    region: 'life',
    position: [-9.8, 0, 8.6],
    bias: { aqi: 3, temperature: 0.2, humidity: 1, noise: 8 }
  },
  {
    id: 'st-playground',
    name: '操场站',
    region: 'sports',
    position: [-12.4, 0, -12.2],
    bias: { aqi: -10, temperature: -0.3, humidity: 3, noise: -5 }
  },
  {
    id: 'st-gym',
    name: '体育馆站',
    region: 'sports',
    position: [-18.6, 0, 3.8],
    bias: { aqi: -6, temperature: 0, humidity: 1, noise: 5 }
  },
  {
    id: 'st-lake',
    name: '映月湖站',
    region: 'life',
    position: [5.2, 0, 5.4],
    bias: { aqi: -12, temperature: -0.5, humidity: 10, noise: -8 }
  },
  {
    id: 'st-admin',
    name: '行政中心站',
    region: 'service',
    position: [8.2, 0, 6.8],
    bias: { aqi: -2, temperature: 0.1, humidity: 0, noise: -1 }
  }
];

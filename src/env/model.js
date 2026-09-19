import { monitorStations } from './stations.js';

export const weatherOptions = [
  { key: 'sunny', label: '晴', icon: '☀' },
  { key: 'rain', label: '雨', icon: '☔' },
  { key: 'fog', label: '雾', icon: '≈' },
  { key: 'snow', label: '雪', icon: '❄' }
];

export const weatherNames = {
  sunny: '晴',
  rain: '雨',
  fog: '雾',
  snow: '雪'
};

const weatherEffects = {
  sunny: { temperature: 0, humidity: 0, aqi: 0, noise: 0 },
  rain: { temperature: -3.2, humidity: 26, aqi: -26, noise: -6 },
  fog: { temperature: -1.1, humidity: 13, aqi: 25, noise: -8 },
  snow: { temperature: -10.5, humidity: 5, aqi: 7, noise: -7 }
};

const stationNoisePeaks = {
  'st-canteen': [{ hour: 12.1, width: 1.15, amp: 17 }, { hour: 17.8, width: 1.2, amp: 12 }],
  'st-market': [{ hour: 12.3, width: 1.3, amp: 8 }, { hour: 18.6, width: 1.4, amp: 11 }],
  'st-playground': [{ hour: 10.2, width: 1.3, amp: 12 }, { hour: 16.1, width: 1.4, amp: 13 }],
  'st-gym': [{ hour: 15.8, width: 1.6, amp: 9 }, { hour: 19.2, width: 1.3, amp: 8 }],
  'st-gate': [{ hour: 7.6, width: 1.1, amp: 9 }, { hour: 17.4, width: 1.2, amp: 8 }]
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function gaussian(hour, center, width) {
  const delta = ((hour - center + 24 + 12) % 24) - 12;
  return Math.exp(-(delta * delta) / (2 * width * width));
}

function hashNoise(stationId, hour, salt) {
  let hash = 2166136261;
  const source = `${stationId}-${hour}-${salt}`;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 500 - 1;
}

function temperatureCurve(hour) {
  return 19.5 + 6.5 * Math.cos((2 * Math.PI * (hour - 14)) / 24);
}

function humidityCurve(hour) {
  return 57 + 20 * Math.cos((2 * Math.PI * (hour - 5)) / 24);
}

function aqiCurve(hour) {
  const rush = 26 * Math.max(gaussian(hour, 8, 2.1), gaussian(hour, 19, 2.4));
  const nightDiffusion = -8 * (gaussian(hour, 3, 3) + gaussian(hour, 14, 3)) / 2;
  return 70 + rush + nightDiffusion;
}

function noiseCurve(hour) {
  const activity = Math.max(
    gaussian(hour, 10, 2.6),
    gaussian(hour, 15, 2.8),
    gaussian(hour, 20, 2.2)
  );
  const night = Math.max(gaussian(hour, 3, 2.2), gaussian(hour, 23.5, 1.4));
  return 43 + 15 * activity - 13 * night;
}

export function sampleStationAt(station, hour, weather) {
  const roundedHour = Math.floor(((hour % 24) + 24) % 24);
  const effect = weatherEffects[weather] || weatherEffects.sunny;
  const bias = station.bias || {};
  const peaks = stationNoisePeaks[station.id] || [];
  const peakNoise = peaks.reduce((sum, peak) => sum + gaussian(hour, peak.hour, peak.width) * peak.amp, 0);

  const temperature = clamp(
    temperatureCurve(hour) + effect.temperature + (bias.temperature || 0) + hashNoise(station.id, roundedHour, 't') * 0.6,
    -18,
    42
  );
  const humidity = clamp(
    humidityCurve(hour) + effect.humidity + (bias.humidity || 0) + hashNoise(station.id, roundedHour, 'h') * 3.5,
    8,
    100
  );
  const aqi = Math.round(
    clamp(
      aqiCurve(hour) + effect.aqi + (bias.aqi || 0) + hashNoise(station.id, roundedHour, 'a') * 4.5,
      12,
      420
    )
  );
  const noise = clamp(
    noiseCurve(hour) + effect.noise + peakNoise + (bias.noise || 0) + hashNoise(station.id, roundedHour, 'n') * 3,
    22,
    110
  );

  return {
    aqi,
    temperature: Number(temperature.toFixed(1)),
    humidity: Math.round(humidity),
    noise: Math.round(noise)
  };
}

export function readStation(station, timeHours, weather) {
  const current = ((timeHours % 24) + 24) % 24;
  const fromHour = Math.floor(current);
  const toHour = (fromHour + 1) % 24;
  const fraction = current - fromHour;
  const before = sampleStationAt(station, fromHour, weather);
  const after = sampleStationAt(station, toHour, weather);
  const result = {};
  Object.keys(before).forEach((key) => {
    result[key] = before[key] + (after[key] - before[key]) * fraction;
  });
  return result;
}

export function readAllStations(timeHours, weather) {
  return monitorStations.map((station) => ({
    station,
    readings: readStation(station, timeHours, weather)
  }));
}

export function stationHistory(station, timeHours, weather, count = 12) {
  const current = ((timeHours % 24) + 24) % 24;
  const points = [];
  for (let offset = count - 1; offset >= 1; offset -= 1) {
    const hour = Math.floor(current) - offset;
    points.push({
      label: `${((hour + 2400) % 24 + 24) % 24}:00`,
      data: sampleStationAt(station, hour, weather)
    });
  }
  points.push({
    label: '现在',
    data: readStation(station, current, weather)
  });
  return points;
}

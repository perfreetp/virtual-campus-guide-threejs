import { levelColors, levelNames, metricLimits, metricNames, metricUnits } from '../mock/environmentData';

export const metricKeys = Object.keys(metricNames);

function hashSeed(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function smoothNoise(seed, hour) {
  const base = Math.floor(hour);
  const fraction = hour - base;
  const a = hashSeed(`${seed}@${base}`);
  const b = hashSeed(`${seed}@${base + 1}`);
  const t = fraction * fraction * (3 - 2 * fraction);
  return (a + (b - a) * t) * 2 - 1;
}

function dailyWave(hour, peakHour) {
  return Math.sin(((hour - peakHour) / 24) * Math.PI * 2);
}

function rushWave(hour) {
  const morning = Math.exp(-Math.pow(hour - 8, 2) / 3.2);
  const evening = Math.exp(-Math.pow(hour - 18, 2) / 3.2);
  return morning + evening;
}

export function getMetricValue(point, metric, hour) {
  const noise = smoothNoise(`${point.id}:${metric}`, hour);
  if (metric === 'air') {
    const value = point.base.air + rushWave(hour) * 22 + dailyWave(hour, 22) * 6 + noise * 7;
    return Math.max(12, Math.round(value));
  }
  if (metric === 'temperature') {
    const value = 23 + point.base.temperature + dailyWave(hour, 9) * 9 + noise * 0.9;
    return Math.round(value * 10) / 10;
  }
  if (metric === 'humidity') {
    const value = 58 + point.base.humidity - dailyWave(hour, 9) * 13 + noise * 3.5;
    return Math.round(Math.min(96, Math.max(22, value)));
  }
  const dayActivity = hour >= 7 && hour <= 21 ? 1 : 0.25;
  const value = 42 + point.base.noise + dayActivity * 10 + rushWave(hour) * 9 + noise * 3;
  return Math.round(Math.max(28, value));
}

export function getMetricLevel(metric, value) {
  if (metric === 'air') {
    if (value > 150) return 3;
    if (value > 100) return 2;
    if (value > 50) return 1;
    return 0;
  }
  if (metric === 'temperature') {
    if (value >= metricLimits.temperature || value <= 0) return 3;
    if (value >= 32 || value <= 6) return 2;
    if (value >= 28 || value <= 12) return 1;
    return 0;
  }
  if (metric === 'humidity') {
    if (value > metricLimits.humidity || value < 25) return 3;
    if (value > 72 || value < 32) return 2;
    if (value > 65 || value < 38) return 1;
    return 0;
  }
  if (value > 70) return 3;
  if (value > metricLimits.noise) return 2;
  if (value > 50) return 1;
  return 0;
}

export function getPointSnapshot(point, hour) {
  const metrics = {};
  let worstLevel = 0;
  metricKeys.forEach((metric) => {
    const value = getMetricValue(point, metric, hour);
    const level = getMetricLevel(metric, value);
    metrics[metric] = { value, level };
    worstLevel = Math.max(worstLevel, level);
  });
  return { ...point, hour, metrics, worstLevel, overLimit: worstLevel >= 3 };
}

export function getTrend(point, metric, hour, span = 6, step = 0.5) {
  const samples = [];
  const count = Math.round(span / step);
  for (let index = count; index >= 0; index -= 1) {
    const sampleHour = (hour - index * step + 48) % 24;
    samples.push({
      hour: sampleHour,
      value: getMetricValue(point, metric, sampleHour)
    });
  }
  return samples;
}

export function buildAlerts(snapshots) {
  const alerts = [];
  snapshots.forEach((snapshot) => {
    metricKeys.forEach((metric) => {
      const data = snapshot.metrics[metric];
      if (data.level >= 3) {
        alerts.push({
          id: `${snapshot.id}:${metric}`,
          pointId: snapshot.id,
          pointName: snapshot.name,
          category: snapshot.category,
          metric,
          metricName: metricNames[metric],
          value: data.value,
          unit: metricUnits[metric],
          limit: metricLimits[metric],
          level: data.level,
          levelName: levelNames[data.level],
          color: levelColors[data.level]
        });
      }
    });
  });
  return alerts;
}

export function formatHour(hour) {
  const normalized = ((hour % 24) + 24) % 24;
  const h = Math.floor(normalized);
  const m = Math.round((normalized - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

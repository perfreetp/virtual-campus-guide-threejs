import { computed, ref } from 'vue';
import { evaluateMetric, metricKeys, metricsMeta, regionNames } from './environment.js';

const STORAGE_KEY = 'campus-env-alert-handled-v1';

function loadHandled() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

const handledKeys = ref(loadHandled());

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...handledKeys.value]));
  } catch {
    // ignore storage errors
  }
}

function buildAlertKey(stationId, metricKey) {
  return `${stationId}::${metricKey}`;
}

export function useAlerts(snapshots, timeLabel, weatherLabel) {
  const activeAlerts = computed(() => {
    const list = [];
    snapshots.value.forEach(({ station, readings }) => {
      metricKeys.forEach((metricKey) => {
        const result = evaluateMetric(metricKey, readings[metricKey]);
        if (!result.exceeded) {
          return;
        }
        const key = buildAlertKey(station.id, metricKey);
        list.push({
          key,
          stationId: station.id,
          stationName: station.name,
          region: station.region,
          regionLabel: regionNames[station.region],
          metricKey,
          metricLabel: metricsMeta[metricKey].label,
          unit: metricsMeta[metricKey].unit,
          value: readings[metricKey],
          levelLabel: result.levelLabel,
          color: result.color,
          timeLabel: timeLabel.value,
          weatherLabel: weatherLabel.value,
          handled: handledKeys.value.has(key)
        });
      });
    });
    list.sort((a, b) => Number(a.handled) - Number(b.handled) || b.value - a.value);
    return list;
  });

  const pendingAlerts = computed(() => activeAlerts.value.filter((alert) => !alert.handled));
  const pendingCount = computed(() => pendingAlerts.value.length);

  function handleAlert(key) {
    if (!handledKeys.value.has(key)) {
      handledKeys.value = new Set(handledKeys.value).add(key);
      persist();
    }
  }

  function undoAlert(key) {
    if (handledKeys.value.has(key)) {
      const next = new Set(handledKeys.value);
      next.delete(key);
      handledKeys.value = next;
      persist();
    }
  }

  function handleAll() {
    const next = new Set(handledKeys.value);
    pendingAlerts.value.forEach((alert) => next.add(alert.key));
    handledKeys.value = next;
    persist();
  }

  return {
    activeAlerts,
    pendingAlerts,
    pendingCount,
    handleAlert,
    undoAlert,
    handleAll
  };
}

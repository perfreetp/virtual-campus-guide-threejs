import { computed, ref, watch } from 'vue';
import { loadProfile, saveProfile } from '../utils/storage';

const stored = loadProfile() || {};
const favoriteIds = ref(Array.isArray(stored.favoriteIds) ? stored.favoriteIds : []);
const savedRoutes = ref(Array.isArray(stored.savedRoutes) ? stored.savedRoutes : []);
const history = ref(Array.isArray(stored.history) ? stored.history : []);
let initialized = false;

function persist() {
  saveProfile({
    favoriteIds: favoriteIds.value,
    savedRoutes: savedRoutes.value,
    history: history.value
  });
}

if (typeof window !== 'undefined') {
  watch([favoriteIds, savedRoutes, history], persist, { deep: true });
  initialized = true;
}

function isFavorite(buildingId) {
  return favoriteIds.value.includes(buildingId);
}

function toggleFavorite(buildingId) {
  if (!buildingId) {
    return;
  }

  if (isFavorite(buildingId)) {
    favoriteIds.value = favoriteIds.value.filter((id) => id !== buildingId);
  } else {
    favoriteIds.value = [buildingId, ...favoriteIds.value];
  }
}

function saveRoute(routeRecord) {
  const record = {
    id: `route-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...routeRecord
  };
  savedRoutes.value = [record, ...savedRoutes.value].slice(0, 30);
  return record;
}

function removeRoute(routeId) {
  savedRoutes.value = savedRoutes.value.filter((route) => route.id !== routeId);
}

function addHistory(record) {
  const signature = [
    record.startId,
    ...(record.waypointIds || []),
    record.endId,
    record.mode
  ].join('>');
  history.value = history.value.filter((item) => item.signature !== signature);
  history.value = [
    {
      id: `history-${Date.now()}`,
      createdAt: new Date().toISOString(),
      signature,
      ...record
    },
    ...history.value
  ].slice(0, 30);
}

function removeHistory(historyId) {
  history.value = history.value.filter((item) => item.id !== historyId);
}

export function useProfile() {
  return {
    favoriteIds: computed(() => favoriteIds.value),
    savedRoutes: computed(() => savedRoutes.value),
    history: computed(() => history.value),
    initialized,
    isFavorite,
    toggleFavorite,
    saveRoute,
    removeRoute,
    addHistory,
    removeHistory
  };
}

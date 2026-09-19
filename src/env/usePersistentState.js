import { ref, watch } from 'vue';

export function usePersistentState(storageKey, defaultValue) {
  let initial = defaultValue;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      initial = typeof defaultValue === 'object' && defaultValue !== null
        ? { ...defaultValue, ...parsed }
        : parsed;
    }
  } catch {
    // fall back to default value
  }

  const state = ref(initial);
  watch(
    state,
    (value) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
        // ignore storage errors
      }
    },
    { deep: true }
  );
  return state;
}

const STORAGE_KEY = 'virtual-campus-user-center';

const fallbackData = {
  favorites: [],
  savedRoutes: [],
  history: []
};

function readStore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...fallbackData };
    }
    const parsed = JSON.parse(raw);
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      savedRoutes: Array.isArray(parsed.savedRoutes) ? parsed.savedRoutes : [],
      history: Array.isArray(parsed.history) ? parsed.history : []
    };
  } catch (error) {
    return { ...fallbackData };
  }
}

function writeStore(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    // 本地存储不可用时静默降级，页面功能不受影响
  }
}

export function loadUserData() {
  return readStore();
}

export function persistUserData(data) {
  writeStore({
    favorites: data.favorites || [],
    savedRoutes: data.savedRoutes || [],
    history: (data.history || []).slice(0, 20)
  });
}

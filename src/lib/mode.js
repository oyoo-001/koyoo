const STORAGE_KEY = "koyoo_active_mode";

export function getActiveMode() {
  return localStorage.getItem(STORAGE_KEY);
}

export function setActiveMode(mode) {
  if (mode) {
    localStorage.setItem(STORAGE_KEY, mode);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function clearActiveMode() {
  localStorage.removeItem(STORAGE_KEY);
}

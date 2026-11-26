import { useSyncExternalStore } from 'react';
import { DEFAULTS, STORAGE_KEY, clear, read, write, type Prefs } from './storage';

// The snapshot must be the same object until something changes, so it is cached here.
// It is also the in-memory fallback when storage is blocked.
let snapshot: Prefs | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function onStorage(event: StorageEvent) {
  // Another tab changed (or cleared) the value: drop the cache and re-read.
  if (event.key === null || event.key === STORAGE_KEY) {
    snapshot = null;
    notify();
  }
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

const getSnapshot = () => (snapshot ??= read());
// The build renders without storage, so the static HTML always shows the defaults.
const getServerSnapshot = () => DEFAULTS;

export function usePrefs() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setPrefs = (next: Prefs) => {
    write(next);
    snapshot = next;
    notify();
  };

  const resetPrefs = () => {
    clear();
    snapshot = DEFAULTS;
    notify();
  };

  return { prefs, setPrefs, resetPrefs };
}

/**
 * Fail-safe localStorage for one small piece of interaction state.
 *
 * Rules (docs/archive/technical-brief.md, section 8):
 * - Storage is optional. Reading the localStorage property can itself throw, and writes
 *   can throw when storage is full, so every touch is wrapped. The page works on defaults.
 * - One namespaced, versioned key. Unknown or malformed data resets to defaults.
 * - Interaction state only: no personal data, no identifiers. Nothing here is ever sent.
 */
export type Prefs = { v: 1; categories: string[] };

export const STORAGE_KEY = 'site:v1';
export const DEFAULTS: Prefs = { v: 1, categories: [] };

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function parse(raw: string | null): Prefs {
  if (raw === null) return DEFAULTS;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return DEFAULTS;
    const { v, categories } = data as { v?: unknown; categories?: unknown };
    if (v !== 1 || !Array.isArray(categories)) return DEFAULTS;
    if (!categories.every((c): c is string => typeof c === 'string')) return DEFAULTS;
    return { v: 1, categories };
  } catch {
    return DEFAULTS;
  }
}

export function read(storage: StorageLike | null = browserStorage()): Prefs {
  try {
    return parse(storage?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return DEFAULTS;
  }
}

/** Returns false when the value could not be saved. The caller keeps it in memory. */
export function write(prefs: Prefs, storage: StorageLike | null = browserStorage()): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

export function clear(storage: StorageLike | null = browserStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do: the in-memory state is reset by the caller.
  }
}

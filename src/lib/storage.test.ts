import { describe, expect, it } from 'vitest';
import { DEFAULTS, STORAGE_KEY, clear, parse, read, write, type StorageLike } from './storage';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const throwing: StorageLike = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('storage', () => {
  it('returns defaults when nothing is stored', () => {
    expect(read(memoryStorage())).toEqual(DEFAULTS);
  });

  it('round-trips a value under the versioned key', () => {
    const storage = memoryStorage();
    expect(write({ v: 1, categories: ['Guide'] }, storage)).toBe(true);
    expect(storage.data.has(STORAGE_KEY)).toBe(true);
    expect(read(storage)).toEqual({ v: 1, categories: ['Guide'] });
  });

  it('resets to defaults on malformed data', () => {
    expect(parse('{not json')).toEqual(DEFAULTS);
    expect(parse('null')).toEqual(DEFAULTS);
    expect(parse('{"v":1,"categories":"Guide"}')).toEqual(DEFAULTS);
    expect(parse('{"v":1,"categories":[1,2]}')).toEqual(DEFAULTS);
  });

  it('resets to defaults on an unknown version', () => {
    expect(parse('{"v":2,"categories":["Guide"]}')).toEqual(DEFAULTS);
  });

  it('survives storage that is missing or throws', () => {
    expect(read(null)).toEqual(DEFAULTS);
    expect(write(DEFAULTS, null)).toBe(false);
    expect(read(throwing)).toEqual(DEFAULTS);
    expect(write(DEFAULTS, throwing)).toBe(false);
    expect(() => clear(throwing)).not.toThrow();
  });

  it('clears the stored value', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{"v":1,"categories":["Tool"]}' });
    clear(storage);
    expect(read(storage)).toEqual(DEFAULTS);
  });
});

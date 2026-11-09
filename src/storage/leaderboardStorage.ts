import type { Leaderboard } from '../core/leaderboard.js';
import { parseLeaderboard, serializeLeaderboard } from '../core/leaderboard.js';

export interface KeyValueStore {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export const STORAGE_KEY = 'bulls-and-cows:leaderboard:v1';

export const createMemoryStore = (): KeyValueStore => {
  const items = new Map<string, string>();

  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
};

export const getBrowserStore = (): KeyValueStore => {
  try {
    return window.localStorage;
  } catch {
    return createMemoryStore();
  }
};

export const loadLeaderboard = (store: KeyValueStore): Leaderboard => {
  try {
    const stored = store.getItem(STORAGE_KEY);

    return stored === null ? [] : parseLeaderboard(stored);
  } catch {
    return [];
  }
};

export const saveLeaderboard = (store: KeyValueStore, leaderboard: Leaderboard): boolean => {
  try {
    store.setItem(STORAGE_KEY, serializeLeaderboard(leaderboard));

    return true;
  } catch {
    return false;
  }
};

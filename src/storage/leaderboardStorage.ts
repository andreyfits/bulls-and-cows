import type { Leaderboard } from '../core/leaderboard.js';

export interface KeyValueStore {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export const STORAGE_KEY = 'bulls-and-cows:leaderboard:v1';

export const createMemoryStore = (): KeyValueStore => {
  throw new Error('Not implemented');
};

export const loadLeaderboard = (_store: KeyValueStore): Leaderboard => {
  throw new Error('Not implemented');
};

export const saveLeaderboard = (_store: KeyValueStore, _leaderboard: Leaderboard): boolean => {
  throw new Error('Not implemented');
};

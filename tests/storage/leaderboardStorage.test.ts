import { describe, expect, it } from 'vitest';

import type { Leaderboard, LeaderboardRecord } from '../../src/core/leaderboard.js';
import { addRecord, getTopRecords } from '../../src/core/leaderboard.js';
import type { KeyValueStore } from '../../src/storage/leaderboardStorage.js';
import {
  STORAGE_KEY,
  createMemoryStore,
  loadLeaderboard,
  saveLeaderboard,
} from '../../src/storage/leaderboardStorage.js';

const record = (overrides: Partial<LeaderboardRecord> = {}): LeaderboardRecord => ({
  length: 4,
  base: 10,
  attempts: 5,
  timeMs: 30_000,
  finishedAt: 1_000,
  ...overrides,
});

const brokenStore: KeyValueStore = {
  getItem: () => {
    throw new Error('SecurityError: storage is not available');
  },
  setItem: () => {
    throw new Error('QuotaExceededError: storage is full');
  },
};

describe('createMemoryStore', () => {
  it('returns null for a key that was never stored', () => {
    expect(createMemoryStore().getItem('missing')).toBeNull();
  });

  it('returns what was stored and lets the latest value win', () => {
    const store = createMemoryStore();

    store.setItem('key', 'first');
    store.setItem('key', 'second');

    expect(store.getItem('key')).toBe('second');
  });

  it('keeps separate stores independent of each other', () => {
    const first = createMemoryStore();
    const second = createMemoryStore();

    first.setItem('key', 'value');

    expect(second.getItem('key')).toBeNull();
  });
});

describe('loadLeaderboard', () => {
  it('returns an empty leaderboard when nothing has been saved yet', () => {
    expect(loadLeaderboard(createMemoryStore())).toEqual([]);
  });

  it('restores a saved leaderboard', () => {
    const store = createMemoryStore();
    const leaderboard: Leaderboard = [record({ finishedAt: 1 }), record({ attempts: 3 })];

    saveLeaderboard(store, leaderboard);

    expect(loadLeaderboard(store)).toEqual(leaderboard);
  });

  it('falls back to an empty leaderboard when the stored text is corrupted', () => {
    const store = createMemoryStore();
    store.setItem(STORAGE_KEY, '{oops');

    expect(loadLeaderboard(store)).toEqual([]);
  });

  it('drops malformed records that an older or broken version left behind', () => {
    const store = createMemoryStore();
    const valid = record();
    store.setItem(STORAGE_KEY, JSON.stringify([valid, { attempts: 'many' }, null]));

    expect(loadLeaderboard(store)).toEqual([valid]);
  });

  it('falls back to an empty leaderboard when the store cannot be read', () => {
    expect(loadLeaderboard(brokenStore)).toEqual([]);
  });
});

describe('saveLeaderboard', () => {
  it('writes the leaderboard as JSON under the storage key', () => {
    const store = createMemoryStore();
    const leaderboard: Leaderboard = [record()];

    saveLeaderboard(store, leaderboard);

    expect(store.getItem(STORAGE_KEY)).toBe(JSON.stringify(leaderboard));
  });

  it('reports success', () => {
    expect(saveLeaderboard(createMemoryStore(), [record()])).toBe(true);
  });

  it('keeps only the latest leaderboard', () => {
    const store = createMemoryStore();

    saveLeaderboard(store, [record({ attempts: 9 })]);
    saveLeaderboard(store, [record({ attempts: 2 })]);

    expect(loadLeaderboard(store).map((entry) => entry.attempts)).toEqual([2]);
  });

  it('reports failure instead of throwing when the store rejects the write', () => {
    expect(saveLeaderboard(brokenStore, [record()])).toBe(false);
  });
});

describe('persistence across page reloads', () => {
  it('keeps the results of earlier sessions and ranks new ones among them', () => {
    const store = createMemoryStore();
    const settings = { length: 4, base: 10 } as const;

    saveLeaderboard(
      store,
      addRecord(loadLeaderboard(store), record({ attempts: 8, finishedAt: 1 })),
    );
    saveLeaderboard(
      store,
      addRecord(loadLeaderboard(store), record({ attempts: 5, finishedAt: 2 })),
    );
    saveLeaderboard(
      store,
      addRecord(loadLeaderboard(store), record({ attempts: 6, finishedAt: 3 })),
    );

    const afterReload = loadLeaderboard(store);

    expect(getTopRecords(afterReload, settings).map((entry) => entry.attempts)).toEqual([5, 6, 8]);
  });
});

import { describe, expect, it } from 'vitest';

import { createGame, submitGuess } from '../../src/core/game.js';
import type { Leaderboard, LeaderboardRecord } from '../../src/core/leaderboard.js';
import {
  LEADERBOARD_SIZE,
  addRecord,
  compareRecords,
  createRecord,
  getRank,
  getTopRecords,
  parseLeaderboard,
  serializeLeaderboard,
} from '../../src/core/leaderboard.js';
import { deepFreeze } from '../helpers/deepFreeze.js';

const record = (overrides: Partial<LeaderboardRecord> = {}): LeaderboardRecord => ({
  length: 4,
  base: 10,
  attempts: 5,
  timeMs: 30_000,
  finishedAt: 1_000,
  ...overrides,
});

const decimalFour = { length: 4, base: 10 } as const;

describe('createRecord', () => {
  it('describes a won game by its settings, attempts and time', () => {
    const started = createGame(decimalFour, '4271', 1_000);
    const won = submitGuess(submitGuess(started, '1234', 20_000), '4271', 65_000);

    expect(createRecord(won)).toEqual({
      length: 4,
      base: 10,
      attempts: 2,
      timeMs: 64_000,
      finishedAt: 65_000,
    });
  });

  it('keeps the base and the length of the round', () => {
    const won = submitGuess(createGame({ length: 3, base: 16 }, 'a1f', 0), 'A1F', 5_000);

    expect(createRecord(won)).toEqual({
      length: 3,
      base: 16,
      attempts: 1,
      timeMs: 5_000,
      finishedAt: 5_000,
    });
  });

  it('refuses to record a game that is still going', () => {
    const running = submitGuess(createGame(decimalFour, '4271', 0), '1234', 1_000);

    expect(() => createRecord(running)).toThrow(RangeError);
  });
});

describe('compareRecords', () => {
  it('ranks fewer attempts first', () => {
    expect(compareRecords(record({ attempts: 4 }), record({ attempts: 7 }))).toBeLessThan(0);
    expect(compareRecords(record({ attempts: 7 }), record({ attempts: 4 }))).toBeGreaterThan(0);
  });

  it('breaks a tie in attempts by the shorter time', () => {
    const quick = record({ timeMs: 10_000 });
    const slow = record({ timeMs: 90_000 });

    expect(compareRecords(quick, slow)).toBeLessThan(0);
    expect(compareRecords(slow, quick)).toBeGreaterThan(0);
  });

  it('prefers fewer attempts even when they took longer', () => {
    expect(
      compareRecords(record({ attempts: 3, timeMs: 500_000 }), record({ attempts: 4, timeMs: 1 })),
    ).toBeLessThan(0);
  });

  it('breaks a full tie by the earlier finish', () => {
    expect(compareRecords(record({ finishedAt: 1 }), record({ finishedAt: 2 }))).toBeLessThan(0);
  });

  it('returns zero for identical records', () => {
    expect(compareRecords(record(), record())).toBe(0);
  });

  it('works as a comparator for sorting', () => {
    const unsorted = [
      record({ attempts: 6, timeMs: 10_000, finishedAt: 3 }),
      record({ attempts: 4, timeMs: 90_000, finishedAt: 2 }),
      record({ attempts: 4, timeMs: 20_000, finishedAt: 5 }),
      record({ attempts: 6, timeMs: 5_000, finishedAt: 1 }),
    ];

    const sorted = unsorted.toSorted(compareRecords).map((r) => [r.attempts, r.timeMs]);

    expect(sorted).toEqual([
      [4, 20_000],
      [4, 90_000],
      [6, 5_000],
      [6, 10_000],
    ]);
  });
});

describe('getTopRecords', () => {
  const mixed: Leaderboard = deepFreeze([
    record({ attempts: 8, timeMs: 50_000, finishedAt: 1 }),
    record({ attempts: 5, timeMs: 40_000, finishedAt: 2 }),
    record({ attempts: 5, timeMs: 20_000, finishedAt: 3 }),
    record({ length: 3, attempts: 2, finishedAt: 4 }),
    record({ base: 16, attempts: 1, finishedAt: 5 }),
  ]);

  it('puts the best records first: fewer attempts, then shorter time', () => {
    expect(getTopRecords(mixed, decimalFour).map((r) => r.finishedAt)).toEqual([3, 2, 1]);
  });

  it('keeps a separate table for every combination of length and base', () => {
    expect(getTopRecords(mixed, { length: 3, base: 10 }).map((r) => r.finishedAt)).toEqual([4]);
    expect(getTopRecords(mixed, { length: 4, base: 16 }).map((r) => r.finishedAt)).toEqual([5]);
    expect(getTopRecords(mixed, { length: 2, base: 2 })).toEqual([]);
  });

  it('shows ten results by default', () => {
    const many = Array.from({ length: 12 }, (_value, index) =>
      record({ attempts: 20 - index, finishedAt: index }),
    );

    const top = getTopRecords(many, decimalFour);

    expect(LEADERBOARD_SIZE).toBe(10);
    expect(top).toHaveLength(10);
    expect(top.map((r) => r.attempts)).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });

  it('honours a custom limit', () => {
    expect(getTopRecords(mixed, decimalFour, 2).map((r) => r.finishedAt)).toEqual([3, 2]);
  });

  it('leaves the leaderboard it reads untouched', () => {
    getTopRecords(mixed, decimalFour);

    expect(mixed.map((r) => r.finishedAt)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('addRecord', () => {
  it('adds the record and leaves the original leaderboard unchanged', () => {
    const original: Leaderboard = deepFreeze([record({ finishedAt: 1 })]);
    const added = record({ attempts: 3, finishedAt: 2 });

    const next = addRecord(original, added);

    expect(next).toHaveLength(2);
    expect(next).toContain(added);
    expect(next).not.toBe(original);
    expect(original).toHaveLength(1);
  });

  it('places the new record at its rank in the table', () => {
    const existing = [
      record({ attempts: 3, finishedAt: 1 }),
      record({ attempts: 9, finishedAt: 2 }),
    ];
    const added = record({ attempts: 5, finishedAt: 3 });

    const top = getTopRecords(addRecord(existing, added), added);

    expect(top.map((r) => r.attempts)).toEqual([3, 5, 9]);
  });

  it('keeps only the best results of a table that overflows', () => {
    const full = Array.from({ length: LEADERBOARD_SIZE }, (_value, index) =>
      record({ attempts: 10 + index, finishedAt: index }),
    );
    const best = record({ attempts: 3, finishedAt: 100 });

    const next = addRecord(full, best);
    const top = getTopRecords(next, best);

    expect(next).toHaveLength(LEADERBOARD_SIZE);
    expect(top[0]).toBe(best);
    expect(top.map((r) => r.attempts)).not.toContain(19);
  });

  it('does not keep a result that is worse than every result of a full table', () => {
    const full = Array.from({ length: LEADERBOARD_SIZE }, (_value, index) =>
      record({ attempts: 3 + index, finishedAt: index }),
    );
    const worst = record({ attempts: 30, finishedAt: 100 });

    expect(addRecord(full, worst)).not.toContain(worst);
  });

  it('never drops the results of other settings while trimming a table', () => {
    const otherTable = record({ base: 16, attempts: 40, finishedAt: 500 });
    const full = Array.from({ length: LEADERBOARD_SIZE }, (_value, index) =>
      record({ attempts: 10 + index, finishedAt: index }),
    );

    const next = addRecord([...full, otherTable], record({ attempts: 3, finishedAt: 100 }));

    expect(next).toContain(otherTable);
  });

  it('honours a custom limit', () => {
    const existing = [
      record({ attempts: 4, finishedAt: 1 }),
      record({ attempts: 6, finishedAt: 2 }),
    ];

    const next = addRecord(existing, record({ attempts: 5, finishedAt: 3 }), 2);

    expect(next.map((r) => r.attempts).toSorted()).toEqual([4, 5]);
  });
});

describe('getRank', () => {
  const first = record({ attempts: 3, finishedAt: 1 });
  const second = record({ attempts: 5, finishedAt: 2 });
  const third = record({ attempts: 8, finishedAt: 3 });
  const leaderboard: Leaderboard = [third, first, second];

  it('gives the one-based place of a record in its table', () => {
    expect(getRank(leaderboard, first)).toBe(1);
    expect(getRank(leaderboard, second)).toBe(2);
    expect(getRank(leaderboard, third)).toBe(3);
  });

  it('recognises a record by its values rather than by object identity', () => {
    expect(getRank(leaderboard, { ...second })).toBe(2);
  });

  it('is not influenced by better results in other tables', () => {
    const hexWinner = record({ base: 16, attempts: 1, finishedAt: 9 });

    expect(getRank([...leaderboard, hexWinner], second)).toBe(2);
  });

  it('is null for a record that did not make it into the table', () => {
    const outsider = record({ attempts: 20, finishedAt: 10 });

    expect(getRank(leaderboard, outsider)).toBeNull();
    expect(getRank(leaderboard, third, 2)).toBeNull();
  });
});

describe('serializeLeaderboard and parseLeaderboard', () => {
  it('restores exactly what was serialized', () => {
    const leaderboard: Leaderboard = [
      record({ attempts: 4, finishedAt: 1 }),
      record({ length: 2, base: 2, attempts: 2, timeMs: 1_500, finishedAt: 2 }),
      record({ length: 6, base: 16, attempts: 12, timeMs: 240_000, finishedAt: 3 }),
    ];

    expect(parseLeaderboard(serializeLeaderboard(leaderboard))).toEqual(leaderboard);
  });

  it('serializes an empty leaderboard as an empty JSON array', () => {
    expect(serializeLeaderboard([])).toBe('[]');
  });

  it.each(['', 'not json', '{', 'null', '{}', '42', '"text"', 'true'])(
    'falls back to an empty leaderboard for %j',
    (json) => {
      expect(parseLeaderboard(json)).toEqual([]);
    },
  );

  it('skips malformed records and keeps the valid ones', () => {
    const valid = record({ finishedAt: 1 });
    const alsoValid = record({ finishedAt: 2 });
    const json = JSON.stringify([
      valid,
      {},
      null,
      7,
      'record',
      { ...valid, attempts: '5' },
      { ...valid, attempts: 0 },
      { ...valid, attempts: 2.5 },
      { ...valid, base: 7 },
      { ...valid, length: 9 },
      { ...valid, length: 6, base: 2 },
      { ...valid, timeMs: -1 },
      { ...valid, finishedAt: null },
      alsoValid,
    ]);

    expect(parseLeaderboard(json)).toEqual([valid, alsoValid]);
  });

  it.each([
    [2, 2],
    [8, 6],
    [10, 4],
    [16, 3],
  ] as const)('accepts base %i with length %i', (base, length) => {
    const entry = record({ base, length });

    expect(parseLeaderboard(serializeLeaderboard([entry]))).toEqual([entry]);
  });
});

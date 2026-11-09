import { describe, expect, it } from 'vitest';

import type { AppAction, AppState } from '../../src/core/appState.js';
import { createAppState, reduceApp } from '../../src/core/appState.js';
import type { LeaderboardRecord } from '../../src/core/leaderboard.js';
import { getTopRecords } from '../../src/core/leaderboard.js';
import { deepFreeze } from '../helpers/deepFreeze.js';

const SECRET = '4271';

const run = (state: AppState, ...actions: readonly AppAction[]): AppState =>
  actions.reduce((current, action) => deepFreeze(reduceApp(current, action)), state);

const startRound = (state: AppState = createAppState(), secret = SECRET, now = 1_000): AppState =>
  run(state, { type: 'game-started', secret, now });

const guess = (value: string, now: number): AppAction => ({
  type: 'guess-submitted',
  guess: value,
  now,
});

const olderRecord: LeaderboardRecord = {
  length: 4,
  base: 10,
  attempts: 9,
  timeMs: 90_000,
  finishedAt: 500,
};

describe('createAppState', () => {
  it('starts on the settings screen with the default settings', () => {
    expect(createAppState()).toEqual({
      settings: { length: 4, base: 10 },
      game: null,
      leaderboard: [],
      rejection: null,
      lastRecord: null,
    });
  });

  it('starts with the leaderboard it is given', () => {
    expect(createAppState([olderRecord]).leaderboard).toEqual([olderRecord]);
  });

  it('starts with the settings it is given', () => {
    expect(createAppState([], { length: 3, base: 16 }).settings).toEqual({ length: 3, base: 16 });
  });
});

describe('choosing the settings', () => {
  it('changes the base', () => {
    const state = run(createAppState(), { type: 'base-selected', base: 16 });

    expect(state.settings).toEqual({ length: 4, base: 16 });
  });

  it('shortens the secret to 2 digits when the binary system is chosen', () => {
    const state = run(createAppState(), { type: 'base-selected', base: 2 });

    expect(state.settings).toEqual({ length: 2, base: 2 });
  });

  it('changes the length', () => {
    const state = run(createAppState(), { type: 'length-selected', length: 6 });

    expect(state.settings).toEqual({ length: 6, base: 10 });
  });

  it('ignores a length that the chosen base cannot hold', () => {
    const binary = run(createAppState(), { type: 'base-selected', base: 2 });

    expect(run(binary, { type: 'length-selected', length: 4 }).settings).toEqual({
      length: 2,
      base: 2,
    });
  });

  it('locks the settings while a round is on', () => {
    const playing = startRound();

    expect(run(playing, { type: 'base-selected', base: 16 })).toBe(playing);
    expect(run(playing, { type: 'length-selected', length: 6 })).toBe(playing);
  });

  it('keeps the settings locked after the round is won', () => {
    const won = run(startRound(), guess(SECRET, 2_000));

    expect(run(won, { type: 'base-selected', base: 2 })).toBe(won);
    expect(run(won, { type: 'length-selected', length: 2 })).toBe(won);
  });
});

describe('starting a round', () => {
  it('creates a playing round with the chosen settings, the secret and the start time', () => {
    const state = startRound(
      run(createAppState(), { type: 'base-selected', base: 16 }),
      'a1f9',
      5_000,
    );

    expect(state.game).toEqual({
      settings: { length: 4, base: 16 },
      secret: 'a1f9',
      history: [],
      status: 'playing',
      startedAt: 5_000,
      finishedAt: null,
    });
  });

  it('ignores a second start while a round exists', () => {
    const playing = startRound();

    expect(startRound(playing, '9876', 9_000)).toBe(playing);
  });
});

describe('submitting guesses', () => {
  it('adds an accepted guess to the history with its bulls and cows', () => {
    const state = run(startRound(), guess('1234', 2_000));

    expect(state.game?.history).toEqual([{ guess: '1234', bulls: 1, cows: 2 }]);
    expect(state.rejection).toBeNull();
  });

  it('remembers why an invalid guess was rejected and leaves the round untouched', () => {
    const playing = startRound();

    const state = run(playing, guess('12', 2_000));

    expect(state.rejection).toBe('invalid');
    expect(state.game).toBe(playing.game);
  });

  it('rejects a repeated guess without adding a second history entry', () => {
    const state = run(startRound(), guess('1234', 2_000), guess('1234', 3_000));

    expect(state.rejection).toBe('duplicate');
    expect(state.game?.history).toHaveLength(1);
  });

  it('forgets the rejection after the next accepted guess', () => {
    const state = run(startRound(), guess('12', 2_000), guess('1234', 3_000));

    expect(state.rejection).toBeNull();
    expect(state.game?.history).toHaveLength(1);
  });

  it('ignores guesses when there is no round', () => {
    const idle = createAppState();

    expect(run(idle, guess('1234', 2_000))).toBe(idle);
  });

  it('records a win in the leaderboard with attempts and time', () => {
    const state = run(startRound(), guess('1234', 2_000), guess(SECRET, 6_500));

    expect(state.game?.status).toBe('won');
    expect(state.leaderboard).toEqual([
      { length: 4, base: 10, attempts: 2, timeMs: 5_500, finishedAt: 6_500 },
    ]);
    expect(state.lastRecord).toBe(state.leaderboard[0]);
  });

  it('keeps earlier results and adds the new one', () => {
    const state = run(startRound(createAppState([olderRecord])), guess(SECRET, 4_000));

    expect(state.leaderboard).toHaveLength(2);
    expect(state.leaderboard).toContain(olderRecord);
  });

  it('files the result under the settings of the round', () => {
    const hex = run(
      createAppState(),
      { type: 'base-selected', base: 16 },
      { type: 'length-selected', length: 3 },
    );

    const state = run(startRound(hex, 'a1f'), guess('A1F', 3_000));

    expect(getTopRecords(state.leaderboard, { length: 3, base: 16 })).toHaveLength(1);
    expect(getTopRecords(state.leaderboard, { length: 4, base: 10 })).toHaveLength(0);
  });

  it('does not record a round that is still going', () => {
    const state = run(startRound(), guess('1234', 2_000), guess('5678', 3_000));

    expect(state.leaderboard).toEqual([]);
    expect(state.lastRecord).toBeNull();
  });

  it('records a round only once, however many guesses follow the win', () => {
    const won = run(startRound(), guess(SECRET, 2_000));

    const after = run(won, guess('1234', 3_000), guess(SECRET, 4_000));

    expect(after).toBe(won);
    expect(after.leaderboard).toHaveLength(1);
  });
});

describe('abandoning a round', () => {
  it('returns to the settings screen and keeps the settings and the leaderboard', () => {
    const won = run(startRound(), guess(SECRET, 2_000));

    const state = run(won, { type: 'game-abandoned' });

    expect(state.game).toBeNull();
    expect(state.settings).toEqual(won.settings);
    expect(state.leaderboard).toBe(won.leaderboard);
    expect(state.lastRecord).toBeNull();
    expect(state.rejection).toBeNull();
  });

  it('works in the middle of a round without recording anything', () => {
    const state = run(startRound(), guess('1234', 2_000), guess('12', 3_000), {
      type: 'game-abandoned',
    });

    expect(state.game).toBeNull();
    expect(state.leaderboard).toEqual([]);
    expect(state.rejection).toBeNull();
  });

  it('unlocks the settings again', () => {
    const state = run(startRound(), { type: 'game-abandoned' }, { type: 'base-selected', base: 8 });

    expect(state.settings.base).toBe(8);
  });

  it('allows a fresh round afterwards', () => {
    const state = run(
      startRound(),
      { type: 'game-abandoned' },
      { type: 'game-started', secret: '9876', now: 9_000 },
    );

    expect(state.game?.secret).toBe('9876');
    expect(state.game?.history).toEqual([]);
  });
});

describe('immutability', () => {
  it.each<[string, () => AppState, AppAction]>([
    ['choosing a base', () => createAppState([olderRecord]), { type: 'base-selected', base: 2 }],
    [
      'choosing a length',
      () => createAppState([olderRecord]),
      { type: 'length-selected', length: 5 },
    ],
    [
      'starting a round',
      () => createAppState([olderRecord]),
      { type: 'game-started', secret: '9876', now: 1 },
    ],
    ['submitting a guess', () => startRound(createAppState([olderRecord])), guess('1234', 2_000)],
    [
      'submitting the winning guess',
      () => startRound(createAppState([olderRecord])),
      guess(SECRET, 2_000),
    ],
    ['abandoning a round', () => startRound(), { type: 'game-abandoned' }],
  ])('does not modify the previous state when %s', (_description, makeState, action) => {
    const state = deepFreeze(makeState());
    const snapshot = structuredClone(state);

    const next = reduceApp(state, action);

    expect(state).toEqual(snapshot);
    expect(next).not.toBe(state);
  });

  it('builds a new history array and a new leaderboard array', () => {
    const before = startRound(createAppState([olderRecord]));
    const afterGuess = run(before, guess('1234', 2_000));
    const afterWin = run(afterGuess, guess(SECRET, 3_000));

    expect(afterGuess.game?.history).not.toBe(before.game?.history);
    expect(afterWin.leaderboard).not.toBe(before.leaderboard);
    expect(before.leaderboard).toEqual([olderRecord]);
    expect(before.game?.history).toEqual([]);
  });
});

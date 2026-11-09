import { describe, expect, it } from 'vitest';

import type { GameState } from '../../src/core/game.js';
import { createGame, getElapsed, judgeGuess, submitGuess } from '../../src/core/game.js';
import type { GameSettings } from '../../src/core/types.js';
import { deepFreeze } from '../helpers/deepFreeze.js';

const decimal: GameSettings = { length: 4, base: 10 };
const hexadecimal: GameSettings = { length: 4, base: 16 };
const SECRET = '4271';
const START = 1_000;

const newGame = (settings: GameSettings = decimal, secret: string = SECRET): GameState =>
  deepFreeze(createGame(settings, secret, START));

const play = (game: GameState, guesses: readonly string[]): GameState =>
  guesses.reduce(
    (state, guess, index) => deepFreeze(submitGuess(state, guess, START + (index + 1) * 1_000)),
    game,
  );

describe('createGame', () => {
  it('starts a playing game with an empty history', () => {
    expect(createGame(decimal, SECRET, START)).toEqual({
      settings: decimal,
      secret: SECRET,
      history: [],
      status: 'playing',
      startedAt: START,
      finishedAt: null,
    });
  });

  it('accepts a secret with a leading zero', () => {
    expect(createGame(decimal, '0123', START).secret).toBe('0123');
  });

  it.each(['427', '42710', '4221', '42a1', '', ' 271'])(
    'rejects the secret %j because it does not fit the settings',
    (secret) => {
      expect(() => createGame(decimal, secret, START)).toThrow(RangeError);
    },
  );

  it('rejects a secret that uses digits outside the alphabet of the base', () => {
    expect(() => createGame({ length: 2, base: 2 }, '12', START)).toThrow(RangeError);
  });
});

describe('judgeGuess', () => {
  it('accepts a valid guess that has not been tried yet', () => {
    expect(judgeGuess(newGame(), '1234')).toBe('accepted');
    expect(judgeGuess(newGame(), '0123')).toBe('accepted');
  });

  it.each(['123', '12345', '12a4', '1123', '', '12 4'])('marks %j as invalid', (guess) => {
    expect(judgeGuess(newGame(), guess)).toBe('invalid');
  });

  it('marks an already tried guess as a duplicate', () => {
    const game = play(newGame(), ['1234']);

    expect(judgeGuess(game, '1234')).toBe('duplicate');
    expect(judgeGuess(game, '1235')).toBe('accepted');
  });

  it('detects a duplicate whatever the letter case is', () => {
    const game = play(newGame(hexadecimal, 'a1b2'), ['2b1a']);

    expect(judgeGuess(game, '2B1A')).toBe('duplicate');
    expect(judgeGuess(game, '2b1A')).toBe('duplicate');
  });

  it('accepts upper case hex digits', () => {
    expect(judgeGuess(newGame(hexadecimal, 'a1b2'), 'F0E9')).toBe('accepted');
  });

  it('reports a finished game for every guess after the win', () => {
    const won = play(newGame(), ['4271']);

    expect(judgeGuess(won, '1234')).toBe('finished');
    expect(judgeGuess(won, '4271')).toBe('finished');
    expect(judgeGuess(won, 'nonsense')).toBe('finished');
  });
});

describe('submitGuess', () => {
  it('adds an entry with the guess and its bulls and cows', () => {
    const next = submitGuess(newGame(), '1234', 2_000);

    expect(next.history).toEqual([{ guess: '1234', bulls: 1, cows: 2 }]);
  });

  it('keeps earlier entries untouched and in order', () => {
    const first = play(newGame(), ['1234']);
    const second = play(first, ['5678']);

    expect(second.history).toEqual([
      { guess: '1234', bulls: 1, cows: 2 },
      { guess: '5678', bulls: 1, cows: 0 },
    ]);
    expect(second.history[0]).toBe(first.history[0]);
  });

  it('builds a new state and a new history array instead of mutating the old ones', () => {
    const previous = newGame();

    const next = submitGuess(previous, '1234', 2_000);

    expect(next).not.toBe(previous);
    expect(next.history).not.toBe(previous.history);
    expect(previous.history).toHaveLength(0);
    expect(previous.status).toBe('playing');
  });

  it('keeps the settings, the secret and the start time as they were', () => {
    const previous = newGame();

    const next = submitGuess(previous, '1234', 2_000);

    expect(next.settings).toBe(previous.settings);
    expect(next.secret).toBe(previous.secret);
    expect(next.startedAt).toBe(START);
  });

  it('stays in the playing status until the secret is guessed', () => {
    const next = submitGuess(newGame(), '1234', 2_000);

    expect(next.status).toBe('playing');
    expect(next.finishedAt).toBeNull();
  });

  it('wins on the guess that equals the secret and records the finish time', () => {
    const next = submitGuess(newGame(), '4271', 7_500);

    expect(next.status).toBe('won');
    expect(next.finishedAt).toBe(7_500);
    expect(next.history).toEqual([{ guess: '4271', bulls: 4, cows: 0 }]);
  });

  it('wins with an upper case guess against a lower case hex secret', () => {
    const next = submitGuess(newGame(hexadecimal, 'a1b2'), 'A1B2', 5_000);

    expect(next.status).toBe('won');
  });

  it('stores guesses in lower case', () => {
    const next = submitGuess(newGame(hexadecimal, 'a1b2'), '2B1A', 2_000);

    expect(next.history).toEqual([{ guess: '2b1a', bulls: 0, cows: 4 }]);
  });

  it('counts every distinct attempt, the winning one included', () => {
    const game = play(newGame(), ['1234', '4321', '4271']);

    expect(game.history.map((entry) => entry.guess)).toEqual(['1234', '4321', '4271']);
    expect(game.status).toBe('won');
  });

  it('returns the very same state for an invalid guess', () => {
    const game = newGame();

    expect(submitGuess(game, '12', 2_000)).toBe(game);
    expect(submitGuess(game, '1123', 2_000)).toBe(game);
    expect(submitGuess(game, 'abcd', 2_000)).toBe(game);
  });

  it('returns the very same state for a repeated guess so the history has no duplicates', () => {
    const game = play(newGame(), ['1234']);

    expect(submitGuess(game, '1234', 9_000)).toBe(game);
    expect(game.history).toHaveLength(1);
  });

  it('returns the very same state once the game is won', () => {
    const won = play(newGame(), ['4271']);

    expect(submitGuess(won, '1234', 9_000)).toBe(won);
    expect(won.history).toHaveLength(1);
  });
});

describe('getElapsed', () => {
  it('measures from the start to now while the game is on', () => {
    expect(getElapsed(newGame(), 4_500)).toBe(3_500);
  });

  it('stops at the finish time after the win', () => {
    const won = submitGuess(newGame(), '4271', 9_000);

    expect(getElapsed(won, 20_000)).toBe(8_000);
    expect(getElapsed(won, 90_000)).toBe(8_000);
  });

  it('never returns a negative duration', () => {
    expect(getElapsed(newGame(), 500)).toBe(0);
  });
});

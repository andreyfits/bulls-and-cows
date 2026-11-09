import { evaluateGuess } from './evaluateGuess.js';
import { isValidGuess } from './isValidGuess.js';
import type { GameSettings, Score } from './types.js';

export type GameStatus = 'playing' | 'won';

export type GuessVerdict = 'accepted' | 'invalid' | 'duplicate' | 'finished';

export interface HistoryEntry extends Score {
  readonly guess: string;
}

export interface GameState {
  readonly settings: GameSettings;
  readonly secret: string;
  readonly history: readonly HistoryEntry[];
  readonly status: GameStatus;
  readonly startedAt: number;
  readonly finishedAt: number | null;
}

const normalizeGuess = (guess: string): string => guess.toLowerCase();

export const createGame = (
  settings: GameSettings,
  secret: string,
  startedAt: number,
): GameState => {
  if (!isValidGuess(secret, settings.length, settings.base)) {
    throw new RangeError(
      `secret "${secret}" does not fit ${settings.length} digits in base ${settings.base}`,
    );
  }

  return { settings, secret, history: [], status: 'playing', startedAt, finishedAt: null };
};

export const judgeGuess = (state: GameState, guess: string): GuessVerdict => {
  if (state.status === 'won') {
    return 'finished';
  }

  if (!isValidGuess(guess, state.settings.length, state.settings.base)) {
    return 'invalid';
  }

  const normalized = normalizeGuess(guess);

  return state.history.some((entry) => entry.guess === normalized) ? 'duplicate' : 'accepted';
};

export const submitGuess = (state: GameState, guess: string, now: number): GameState => {
  if (judgeGuess(state, guess) !== 'accepted') {
    return state;
  }

  const normalized = normalizeGuess(guess);
  const entry: HistoryEntry = { guess: normalized, ...evaluateGuess(state.secret, normalized) };
  const hasWon = entry.bulls === state.settings.length;

  return {
    ...state,
    history: [...state.history, entry],
    status: hasWon ? 'won' : 'playing',
    finishedAt: hasWon ? now : null,
  };
};

export const getElapsed = (state: GameState, now: number): number =>
  Math.max(0, (state.finishedAt ?? now) - state.startedAt);

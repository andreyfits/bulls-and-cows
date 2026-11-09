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

export const createGame = (
  _settings: GameSettings,
  _secret: string,
  _startedAt: number,
): GameState => {
  throw new Error('Not implemented');
};

export const judgeGuess = (_state: GameState, _guess: string): GuessVerdict => {
  throw new Error('Not implemented');
};

export const submitGuess = (_state: GameState, _guess: string, _now: number): GameState => {
  throw new Error('Not implemented');
};

export const getElapsed = (_state: GameState, _now: number): number => {
  throw new Error('Not implemented');
};

import { DEFAULT_SETTINGS } from './constants.js';
import type { GameState } from './game.js';
import type { Leaderboard, LeaderboardRecord } from './leaderboard.js';
import type { Base, GameSettings } from './types.js';

export type Rejection = 'invalid' | 'duplicate';

export interface AppState {
  readonly settings: GameSettings;
  readonly game: GameState | null;
  readonly leaderboard: Leaderboard;
  readonly rejection: Rejection | null;
  readonly lastRecord: LeaderboardRecord | null;
}

export type AppAction =
  | { readonly type: 'base-selected'; readonly base: Base }
  | { readonly type: 'length-selected'; readonly length: number }
  | { readonly type: 'game-started'; readonly secret: string; readonly now: number }
  | { readonly type: 'guess-submitted'; readonly guess: string; readonly now: number }
  | { readonly type: 'game-abandoned' };

export const createAppState = (
  _leaderboard: Leaderboard = [],
  _settings: GameSettings = DEFAULT_SETTINGS,
): AppState => {
  throw new Error('Not implemented');
};

export const reduceApp = (_state: AppState, _action: AppAction): AppState => {
  throw new Error('Not implemented');
};

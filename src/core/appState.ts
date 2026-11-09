import { DEFAULT_SETTINGS } from './constants.js';
import type { GameState } from './game.js';
import { createGame, judgeGuess, submitGuess } from './game.js';
import type { Leaderboard, LeaderboardRecord } from './leaderboard.js';
import { addRecord, createRecord } from './leaderboard.js';
import { withBase, withLength } from './settings.js';
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
  leaderboard: Leaderboard = [],
  settings: GameSettings = DEFAULT_SETTINGS,
): AppState => ({ settings, game: null, leaderboard, rejection: null, lastRecord: null });

const selectSettings = (
  state: AppState,
  update: (settings: GameSettings) => GameSettings,
): AppState => (state.game === null ? { ...state, settings: update(state.settings) } : state);

const startGame = (state: AppState, secret: string, now: number): AppState =>
  state.game === null
    ? {
        ...state,
        game: createGame(state.settings, secret, now),
        rejection: null,
        lastRecord: null,
      }
    : state;

const recordWin = (state: AppState, game: GameState): AppState => {
  const record = createRecord(game);

  return {
    ...state,
    game,
    rejection: null,
    leaderboard: addRecord(state.leaderboard, record),
    lastRecord: record,
  };
};

const submitToGame = (state: AppState, guess: string, now: number): AppState => {
  if (state.game === null) {
    return state;
  }

  const verdict = judgeGuess(state.game, guess);

  if (verdict === 'finished') {
    return state;
  }

  if (verdict !== 'accepted') {
    return { ...state, rejection: verdict };
  }

  const game = submitGuess(state.game, guess, now);

  return game.status === 'won' ? recordWin(state, game) : { ...state, game, rejection: null };
};

const abandonGame = (state: AppState): AppState => ({
  ...state,
  game: null,
  rejection: null,
  lastRecord: null,
});

export const reduceApp = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'base-selected':
      return selectSettings(state, (settings) => withBase(settings, action.base));
    case 'length-selected':
      return selectSettings(state, (settings) => withLength(settings, action.length));
    case 'game-started':
      return startGame(state, action.secret, action.now);
    case 'guess-submitted':
      return submitToGame(state, action.guess, action.now);
    case 'game-abandoned':
      return abandonGame(state);
  }
};

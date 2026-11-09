import type { GameState } from './game.js';
import type { Base, GameSettings } from './types.js';

export const LEADERBOARD_SIZE = 10;

export interface LeaderboardRecord {
  readonly length: number;
  readonly base: Base;
  readonly attempts: number;
  readonly timeMs: number;
  readonly finishedAt: number;
}

export type Leaderboard = readonly LeaderboardRecord[];

export const createRecord = (_game: GameState): LeaderboardRecord => {
  throw new Error('Not implemented');
};

export const compareRecords = (_left: LeaderboardRecord, _right: LeaderboardRecord): number => {
  throw new Error('Not implemented');
};

export const getTopRecords = (
  _leaderboard: Leaderboard,
  _settings: GameSettings,
  _limit = LEADERBOARD_SIZE,
): Leaderboard => {
  throw new Error('Not implemented');
};

export const addRecord = (
  _leaderboard: Leaderboard,
  _record: LeaderboardRecord,
  _limit = LEADERBOARD_SIZE,
): Leaderboard => {
  throw new Error('Not implemented');
};

export const getRank = (
  _leaderboard: Leaderboard,
  _record: LeaderboardRecord,
  _limit = LEADERBOARD_SIZE,
): number | null => {
  throw new Error('Not implemented');
};

export const serializeLeaderboard = (_leaderboard: Leaderboard): string => {
  throw new Error('Not implemented');
};

export const parseLeaderboard = (_json: string): Leaderboard => {
  throw new Error('Not implemented');
};

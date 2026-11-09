import { BASES } from './constants.js';
import type { GameState } from './game.js';
import { getElapsed } from './game.js';
import { isLengthAvailable } from './settings.js';
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

const hasSettings =
  (settings: GameSettings) =>
  (record: LeaderboardRecord): boolean =>
    record.length === settings.length && record.base === settings.base;

export const createRecord = (game: GameState): LeaderboardRecord => {
  if (game.status !== 'won' || game.finishedAt === null) {
    throw new RangeError('only a won game can be added to the leaderboard');
  }

  return {
    length: game.settings.length,
    base: game.settings.base,
    attempts: game.history.length,
    timeMs: getElapsed(game, game.finishedAt),
    finishedAt: game.finishedAt,
  };
};

export const compareRecords = (left: LeaderboardRecord, right: LeaderboardRecord): number =>
  left.attempts - right.attempts ||
  left.timeMs - right.timeMs ||
  left.finishedAt - right.finishedAt;

const isSameRecord = (left: LeaderboardRecord, right: LeaderboardRecord): boolean =>
  hasSettings(left)(right) && compareRecords(left, right) === 0;

export const getTopRecords = (
  leaderboard: Leaderboard,
  settings: GameSettings,
  limit = LEADERBOARD_SIZE,
): Leaderboard =>
  leaderboard.filter(hasSettings(settings)).toSorted(compareRecords).slice(0, limit);

export const addRecord = (
  leaderboard: Leaderboard,
  record: LeaderboardRecord,
  limit = LEADERBOARD_SIZE,
): Leaderboard => [
  ...leaderboard.filter((other) => !hasSettings(record)(other)),
  ...getTopRecords([...leaderboard, record], record, limit),
];

export const getRank = (
  leaderboard: Leaderboard,
  record: LeaderboardRecord,
  limit = LEADERBOARD_SIZE,
): number | null => {
  const index = getTopRecords(leaderboard, record, limit).findIndex((other) =>
    isSameRecord(other, record),
  );

  return index === -1 ? null : index + 1;
};

export const serializeLeaderboard = (leaderboard: Leaderboard): string =>
  JSON.stringify(leaderboard);

const isBase = (value: unknown): value is Base => BASES.some((base) => base === value);

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const isDuration = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isLeaderboardRecord = (value: unknown): value is LeaderboardRecord =>
  typeof value === 'object' &&
  value !== null &&
  'base' in value &&
  isBase(value.base) &&
  'length' in value &&
  typeof value.length === 'number' &&
  isLengthAvailable(value.length, value.base) &&
  'attempts' in value &&
  isCount(value.attempts) &&
  'timeMs' in value &&
  isDuration(value.timeMs) &&
  'finishedAt' in value &&
  isDuration(value.finishedAt);

export const parseLeaderboard = (json: string): Leaderboard => {
  try {
    const parsed: unknown = JSON.parse(json);

    return Array.isArray(parsed) ? parsed.filter(isLeaderboardRecord) : [];
  } catch {
    return [];
  }
};

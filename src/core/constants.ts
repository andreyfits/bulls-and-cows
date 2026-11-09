import type { Base, GameSettings } from './types.js';

export const BASES: readonly Base[] = [2, 8, 10, 16];

export const BASE_NAMES: Readonly<Record<Base, string>> = {
  2: 'bin',
  8: 'oct',
  10: 'dec',
  16: 'hex',
};

export const MIN_LENGTH = 2;

export const MAX_LENGTH = 6;

export const LENGTHS: readonly number[] = Array.from(
  { length: MAX_LENGTH - MIN_LENGTH + 1 },
  (_value, index) => MIN_LENGTH + index,
);

export const DEFAULT_SETTINGS: GameSettings = { length: 4, base: 10 };

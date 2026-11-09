import { LENGTHS } from './constants.js';
import type { Base, GameSettings } from './types.js';

export const isLengthAvailable = (length: number, base: Base): boolean =>
  LENGTHS.includes(length) && length <= base;

export const getAvailableLengths = (base: Base): readonly number[] =>
  LENGTHS.filter((length) => isLengthAvailable(length, base));

export const withBase = (settings: GameSettings, base: Base): GameSettings => ({
  base,
  length: Math.min(settings.length, base),
});

export const withLength = (settings: GameSettings, length: number): GameSettings =>
  isLengthAvailable(length, settings.base) ? { ...settings, length } : settings;

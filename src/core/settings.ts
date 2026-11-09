import type { Base, GameSettings } from './types.js';

export const isLengthAvailable = (_length: number, _base: Base): boolean => {
  throw new Error('Not implemented');
};

export const getAvailableLengths = (_base: Base): readonly number[] => {
  throw new Error('Not implemented');
};

export const withBase = (_settings: GameSettings, _base: Base): GameSettings => {
  throw new Error('Not implemented');
};

export const withLength = (_settings: GameSettings, _length: number): GameSettings => {
  throw new Error('Not implemented');
};

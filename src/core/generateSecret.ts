import type { Base, RandomSource } from './types.js';

export const generateSecret = (
  _length: number,
  _base: Base,
  _random: RandomSource = Math.random,
): string => {
  throw new Error('Not implemented');
};

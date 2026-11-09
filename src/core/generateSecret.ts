import { getAlphabet } from './alphabet.js';
import type { Base, RandomSource } from './types.js';

const pickUnique = (
  pool: readonly string[],
  count: number,
  random: RandomSource,
): readonly string[] => {
  if (count === 0) {
    return [];
  }

  const index = Math.floor(random() * pool.length);
  const picked = pool[index];

  if (picked === undefined) {
    throw new RangeError('random() must return a number in the range [0, 1)');
  }

  const remaining = pool.filter((_digit, position) => position !== index);

  return [picked, ...pickUnique(remaining, count - 1, random)];
};

export const generateSecret = (
  length: number,
  base: Base,
  random: RandomSource = Math.random,
): string => {
  if (!Number.isInteger(length) || length < 1 || length > base) {
    throw new RangeError(`length must be an integer from 1 to ${base}, got ${length}`);
  }

  return pickUnique(getAlphabet(base), length, random).join('');
};

import type { RandomSource } from '../../src/core/types.js';

export const constantRandom =
  (value: number): RandomSource =>
  () =>
    value;

export const sequenceRandom = (values: readonly number[]): RandomSource => {
  let index = 0;

  return () => {
    const value = values[index];

    if (value === undefined) {
      throw new Error('sequenceRandom ran out of values');
    }

    index += 1;
    return value;
  };
};

export const seededRandom = (seed: number): RandomSource => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};

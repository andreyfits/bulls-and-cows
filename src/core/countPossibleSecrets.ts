import { memoize } from './memoize.js';

const isNonNegativeInteger = (value: number): boolean => Number.isInteger(value) && value >= 0;

export const countPossibleSecrets: (length: number, base: number) => number = memoize(
  (length: number, base: number): number => {
    if (!isNonNegativeInteger(length) || !isNonNegativeInteger(base)) {
      throw new RangeError(
        `length and base must be non-negative integers, got ${length} and ${base}`,
      );
    }

    if (length > base) {
      return 0;
    }

    return length === 0 ? 1 : base * countPossibleSecrets(length - 1, base - 1);
  },
);

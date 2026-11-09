import { afterEach, describe, expect, it, vi } from 'vitest';

import { countPossibleSecrets } from '../../src/core/countPossibleSecrets.js';
import type * as MemoizeModule from '../../src/core/memoize.js';
import { permutations } from '../helpers/permutations.js';

describe('countPossibleSecrets', () => {
  describe('counts permutations without repetition P(base, length)', () => {
    it.each<[number, number, number]>([
      [2, 2, 2],
      [2, 8, 56],
      [4, 8, 1680],
      [6, 8, 20160],
      [2, 10, 90],
      [3, 10, 720],
      [4, 10, 5040],
      [5, 10, 30240],
      [6, 10, 151200],
      [2, 16, 240],
      [4, 16, 43680],
      [6, 16, 5765760],
    ])('length %i in base %i gives %i', (length, base, expected) => {
      expect(countPossibleSecrets(length, base)).toBe(expected);
    });

    it('includes secrets that start with zero', () => {
      expect(countPossibleSecrets(4, 10)).toBe(10 * 9 * 8 * 7);
    });

    it('gives one empty secret for length zero and base choices for length one', () => {
      expect(countPossibleSecrets(0, 10)).toBe(1);
      expect(countPossibleSecrets(1, 10)).toBe(10);
      expect(countPossibleSecrets(1, 2)).toBe(2);
    });

    it.each<[number, number]>([
      [3, 2],
      [7, 6],
      [1, 0],
      [11, 10],
    ])('gives zero when length %i exceeds base %i', (length, base) => {
      expect(countPossibleSecrets(length, base)).toBe(0);
    });
  });

  describe('follows the recursive definition', () => {
    it.each([2, 3, 4, 5, 6])(
      'for length %i: P(length, base) = base * P(length - 1, base - 1)',
      (length) => {
        [length, 8, 10, 16].forEach((base) => {
          expect(countPossibleSecrets(length, base)).toBe(
            base * countPossibleSecrets(length - 1, base - 1),
          );
        });
      },
    );

    it('matches brute-force enumeration of unique-digit strings', () => {
      const bases = [1, 2, 3, 4, 5, 6];
      const lengths = [0, 1, 2, 3, 4];

      bases.forEach((base) => {
        const digits = Array.from('012345'.slice(0, base));

        lengths.forEach((length) => {
          expect(countPossibleSecrets(length, base)).toBe(permutations(digits, length).length);
        });
      });
    });
  });

  describe('as a memoized function', () => {
    afterEach(() => {
      vi.doUnmock('../../src/core/memoize.js');
      vi.resetModules();
    });

    it('returns the same value on every call', () => {
      const first = countPossibleSecrets(5, 16);

      expect(countPossibleSecrets(5, 16)).toBe(first);
      expect(countPossibleSecrets(5, 16)).toBe(first);
    });

    it('computes each subproblem once, including the ones reached by recursion', async () => {
      const computations = vi.fn();
      vi.resetModules();
      vi.doMock('../../src/core/memoize.js', async (importOriginal) => {
        const original = await importOriginal<typeof MemoizeModule>();

        return {
          memoize: <Args extends readonly unknown[], Result>(fn: (...args: Args) => Result) =>
            original.memoize((...args: Args) => {
              computations(...args);
              return fn(...args);
            }),
        };
      });
      const { countPossibleSecrets: freshCount } =
        await import('../../src/core/countPossibleSecrets.js');

      freshCount(4, 10);
      const computationsForFirstCall = computations.mock.calls.length;
      freshCount(4, 10);
      freshCount(3, 9);

      expect(computationsForFirstCall).toBeGreaterThan(1);
      expect(computations).toHaveBeenCalledTimes(computationsForFirstCall);
    });
  });

  describe('rejects', () => {
    it.each<[string, number, number]>([
      ['a negative length', -1, 10],
      ['a fractional length', 2.5, 10],
      ['a negative base', 2, -1],
      ['a fractional base', 2, 10.5],
      ['a length that is not a number', Number.NaN, 10],
      ['a base that is not a number', 2, Number.NaN],
      ['an infinite base', 2, Number.POSITIVE_INFINITY],
    ])('%s', (_description, length, base) => {
      expect(() => countPossibleSecrets(length, base)).toThrow(RangeError);
    });
  });
});

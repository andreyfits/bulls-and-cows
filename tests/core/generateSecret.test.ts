import { describe, expect, it, vi } from 'vitest';

import { generateSecret } from '../../src/core/generateSecret.js';
import type { Base } from '../../src/core/types.js';
import { constantRandom, seededRandom, sequenceRandom } from '../helpers/random.js';

const allDigits = '0123456789abcdef';
const bases: readonly Base[] = [2, 8, 10, 16];
const lengths: readonly number[] = [2, 3, 4, 5, 6];

const validCombinations = bases.flatMap((base) =>
  lengths.filter((length) => length <= base).map((length): [Base, number] => [base, length]),
);

describe('generateSecret', () => {
  describe('with a deterministic random source', () => {
    it.each<[string, number, Base, number, string]>([
      ['the lowest values pick digits in ascending order', 4, 10, 0, '0123'],
      ['the highest values pick digits in descending order', 4, 10, 0.999999, '9876'],
      ['a binary secret takes the lowest digits first', 2, 2, 0, '01'],
      ['a binary secret takes the highest digits first', 2, 2, 0.99, '10'],
      ['a hex secret of six digits from the bottom', 6, 16, 0, '012345'],
      ['a hex secret of six digits from the top', 6, 16, 0.999999, 'fedcba'],
    ])('%s', (_description, length, base, randomValue, expected) => {
      expect(generateSecret(length, base, constantRandom(randomValue))).toBe(expected);
    });

    it('picks every digit from the pool that is left after the previous picks', () => {
      const random = sequenceRandom([0.5, 0.1, 0.9, 0]);

      expect(generateSecret(4, 10, random)).toBe('5091');
    });

    it('allows a leading zero', () => {
      expect(generateSecret(4, 10, constantRandom(0)).startsWith('0')).toBe(true);
    });

    it('asks the random source exactly once per digit', () => {
      const random = vi.fn(() => 0);

      generateSecret(5, 16, random);

      expect(random).toHaveBeenCalledTimes(5);
    });

    it('produces different secrets for different random sources', () => {
      expect(generateSecret(4, 10, constantRandom(0))).not.toBe(
        generateSecret(4, 10, constantRandom(0.5)),
      );
    });

    it('returns the same secret for the same random source', () => {
      expect(generateSecret(6, 16, seededRandom(42))).toBe(generateSecret(6, 16, seededRandom(42)));
    });
  });

  describe('with the default random source', () => {
    it('uses Math.random', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

      expect(generateSecret(4, 10)).toBe('0123');
      expect(randomSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('for every supported combination of length and base', () => {
    it.each(validCombinations)(
      'base %i, length %i: distinct digits of the base',
      (base, length) => {
        const seeds = Array.from({ length: 25 }, (_value, index) => index + 1);
        const alphabet = allDigits.slice(0, base);

        seeds.forEach((seed) => {
          const secret = generateSecret(length, base, seededRandom(seed));
          const digits = Array.from(secret);

          expect(typeof secret).toBe('string');
          expect(digits).toHaveLength(length);
          expect(new Set(digits).size).toBe(length);
          expect(digits.every((digit) => alphabet.includes(digit))).toBe(true);
        });
      },
    );

    it('can put every digit of the base in every position', () => {
      const random = seededRandom(2024);
      const secrets = Array.from({ length: 2000 }, () => generateSecret(2, 10, random));

      [0, 1].forEach((position) => {
        const seenDigits = new Set(secrets.map((secret) => secret.charAt(position)));

        expect([...seenDigits].sort().join('')).toBe('0123456789');
      });
    });
  });

  describe('rejects', () => {
    it.each<[string, number, Base]>([
      ['a length longer than the alphabet', 3, 2],
      ['a zero length', 0, 10],
      ['a negative length', -1, 10],
      ['a fractional length', 2.5, 10],
      ['a length that is not a number', Number.NaN, 10],
    ])('%s', (_description, length, base) => {
      expect(() => generateSecret(length, base, constantRandom(0))).toThrow(RangeError);
    });

    it.each([1, 1.5, -0.5, Number.NaN])(
      'a random source that returns %s, which is outside [0, 1)',
      (value) => {
        expect(() => generateSecret(3, 10, constantRandom(value))).toThrow(RangeError);
      },
    );
  });
});

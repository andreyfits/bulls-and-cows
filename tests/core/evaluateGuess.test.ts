import { describe, expect, it } from 'vitest';

import { evaluateGuess } from '../../src/core/evaluateGuess.js';
import type { Score } from '../../src/core/types.js';
import { permutations } from '../helpers/permutations.js';

const referenceScore = (secret: string, guess: string): Score => {
  const guessDigits = Array.from(guess);

  return {
    bulls: guessDigits.filter((digit, index) => secret.charAt(index) === digit).length,
    cows: guessDigits.filter(
      (digit, index) => secret.charAt(index) !== digit && secret.includes(digit),
    ).length,
  };
};

describe('evaluateGuess', () => {
  it.each<[string, string, string, Score]>([
    ['the exact secret', '1234', '1234', { bulls: 4, cows: 0 }],
    ['no common digits', '1234', '5678', { bulls: 0, cows: 0 }],
    ['all digits in wrong places', '1234', '4321', { bulls: 0, cows: 4 }],
    ['the Wikipedia example', '4271', '1234', { bulls: 1, cows: 2 }],
    ['bulls and cows together', '0123', '0132', { bulls: 2, cows: 2 }],
    ['a single bull', '1234', '1567', { bulls: 1, cows: 0 }],
    ['a single cow', '1234', '5617', { bulls: 0, cows: 1 }],
    ['a leading zero in the secret', '0123', '1023', { bulls: 2, cows: 2 }],
    ['two bulls and two cows around a zero', '5071', '5170', { bulls: 2, cows: 2 }],
    ['a binary secret guessed exactly', '01', '01', { bulls: 2, cows: 0 }],
    ['a binary secret with swapped digits', '01', '10', { bulls: 0, cows: 2 }],
    ['a six digit secret', '123456', '123465', { bulls: 4, cows: 2 }],
  ])('scores %s: secret %j, guess %j', (_description, secret, guess, expected) => {
    expect(evaluateGuess(secret, guess)).toEqual(expected);
  });

  describe('with hex digits', () => {
    it.each<[string, string, string, Score]>([
      ['an upper case guess of a lower case secret', 'a1b2', 'A1B2', { bulls: 4, cows: 0 }],
      ['a lower case guess of an upper case secret', 'A1B2', 'a1b2', { bulls: 4, cows: 0 }],
      ['reordered digits in a different case', 'a1b2', '2B1a', { bulls: 0, cows: 4 }],
      ['mixed case with bulls and cows', '1a2b', '1B2a', { bulls: 2, cows: 2 }],
    ])('ignores letter case for %s', (_description, secret, guess, expected) => {
      expect(evaluateGuess(secret, guess)).toEqual(expected);
    });
  });

  describe('properties', () => {
    it.each([
      ['4271', '1234'],
      ['0123', '1032'],
      ['9876', '6789'],
      ['a1b2', 'b2c3'],
    ])('gives the same score when %j and %j swap roles', (first, second) => {
      expect(evaluateGuess(first, second)).toEqual(evaluateGuess(second, first));
    });

    it('reports bulls equal to the length only for the secret itself', () => {
      expect(evaluateGuess('2468', '2468').bulls).toBe(4);
      expect(evaluateGuess('2468', '2469').bulls).toBe(3);
      expect(evaluateGuess('2468', '8642').bulls).toBe(0);
    });

    it('returns a new score object on every call', () => {
      const first = evaluateGuess('1234', '1243');
      const second = evaluateGuess('1234', '1243');

      expect(first).toEqual(second);
      expect(first).not.toBe(second);
    });

    it('agrees with a reference model on every pair of 3-digit codes over 5 digits', () => {
      const codes = permutations(['0', '1', '2', '3', '4'], 3);
      const pairs = codes.flatMap((secret) => codes.map((guess) => ({ secret, guess })));

      expect(codes).toHaveLength(60);
      pairs.forEach(({ secret, guess }) => {
        expect(evaluateGuess(secret, guess)).toEqual(referenceScore(secret, guess));
      });
    });
  });
});

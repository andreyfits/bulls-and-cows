import { describe, expect, it } from 'vitest';

import { isValidGuess } from '../../src/core/isValidGuess.js';
import type { Base } from '../../src/core/types.js';

describe('isValidGuess', () => {
  describe('accepts a guess that', () => {
    it.each<[string, number, Base]>([
      ['1234', 4, 10],
      ['0123', 4, 10],
      ['987654', 6, 10],
      ['7160', 4, 8],
      ['01', 2, 2],
      ['10', 2, 2],
      ['a1b2', 4, 16],
      ['A1B2', 4, 16],
      ['aB3', 3, 16],
    ])('is %j for length %i and base %i', (guess, length, base) => {
      expect(isValidGuess(guess, length, base)).toBe(true);
    });
  });

  describe('rejects a guess that', () => {
    it.each<[string, number, Base, string]>([
      ['123', 4, 10, 'is shorter than the secret'],
      ['12345', 4, 10, 'is longer than the secret'],
      ['', 4, 10, 'is empty'],
      ['12a4', 4, 10, 'contains a letter in a decimal guess'],
      ['1284', 4, 8, 'contains a digit outside the octal alphabet'],
      ['12', 2, 2, 'contains a digit outside the binary alphabet'],
      ['1g34', 4, 16, 'contains a character outside the hex alphabet'],
      ['12 4', 4, 10, 'contains a space'],
      [' 123', 4, 10, 'starts with whitespace'],
      ['-123', 4, 10, 'contains a sign'],
      ['1123', 4, 10, 'repeats an adjacent digit'],
      ['1231', 4, 10, 'repeats a digit that is not adjacent'],
      ['00', 2, 2, 'repeats a binary digit'],
      ['aA12', 4, 16, 'repeats a hex digit in a different case'],
    ])('is %j for length %i and base %i (%s)', (guess, length, base) => {
      expect(isValidGuess(guess, length, base)).toBe(false);
    });
  });

  it('checks the length against the requested length, not a fixed one', () => {
    expect(isValidGuess('123', 3, 10)).toBe(true);
    expect(isValidGuess('123', 4, 10)).toBe(false);
    expect(isValidGuess('123', 2, 10)).toBe(false);
  });

  it('gives the same answer for the same input every time', () => {
    expect(isValidGuess('4271', 4, 10)).toBe(isValidGuess('4271', 4, 10));
    expect(isValidGuess('4221', 4, 10)).toBe(isValidGuess('4221', 4, 10));
  });
});

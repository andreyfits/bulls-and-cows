import { describe, expect, it } from 'vitest';

import { getAlphabet } from '../../src/core/alphabet.js';
import type { Base } from '../../src/core/types.js';

const bases: readonly Base[] = [2, 8, 10, 16];

describe('getAlphabet', () => {
  it.each<[Base, string]>([
    [2, '01'],
    [8, '01234567'],
    [10, '0123456789'],
    [16, '0123456789abcdef'],
  ])('returns the digits of base %i in ascending order', (base, expectedDigits) => {
    expect(getAlphabet(base).join('')).toBe(expectedDigits);
  });

  it.each(bases)('returns exactly %i distinct single-character digits', (base) => {
    const alphabet = getAlphabet(base);

    expect(alphabet).toHaveLength(base);
    expect(new Set(alphabet).size).toBe(base);
    expect(alphabet.every((digit) => digit.length === 1)).toBe(true);
  });

  it('uses lowercase letters for the digits above 9', () => {
    expect(getAlphabet(16).slice(10)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('returns equal results for equal input', () => {
    expect(getAlphabet(8)).toEqual(getAlphabet(8));
  });
});

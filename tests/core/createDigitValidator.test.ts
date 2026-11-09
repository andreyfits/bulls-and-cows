import { describe, expect, it } from 'vitest';

import { createDigitValidator } from '../../src/core/createDigitValidator.js';
import type { Base } from '../../src/core/types.js';

describe('createDigitValidator', () => {
  it('is curried: a base produces a reusable predicate', () => {
    const isDecimalDigit = createDigitValidator(10);

    expect(typeof isDecimalDigit).toBe('function');
    expect(isDecimalDigit('7')).toBe(true);
    expect(isDecimalDigit('7')).toBe(true);
    expect(isDecimalDigit('x')).toBe(false);
  });

  it.each<[Base, string, string]>([
    [2, '01', '23456789abcdefg'],
    [8, '01234567', '89abcdefg'],
    [10, '0123456789', 'abcdefg'],
    [16, '0123456789abcdef', 'ghijklmnopqrstuvwxyz'],
  ])('for base %i accepts only its own digits', (base, validChars, invalidChars) => {
    const isDigit = createDigitValidator(base);

    expect(Array.from(validChars).map((char) => isDigit(char))).not.toContain(false);
    expect(Array.from(invalidChars).map((char) => isDigit(char))).not.toContain(true);
  });

  it('treats hex digits case-insensitively', () => {
    const isHexDigit = createDigitValidator(16);

    expect(isHexDigit('a')).toBe(true);
    expect(isHexDigit('A')).toBe(true);
    expect(isHexDigit('f')).toBe(true);
    expect(isHexDigit('F')).toBe(true);
    expect(isHexDigit('g')).toBe(false);
    expect(isHexDigit('G')).toBe(false);
  });

  it('does not accept letters in non-hex bases, whatever their case', () => {
    const isDecimalDigit = createDigitValidator(10);

    expect(isDecimalDigit('a')).toBe(false);
    expect(isDecimalDigit('A')).toBe(false);
  });

  it.each(['', '12', 'ab', ' ', '-', '+', '.', '\n', '\u0663'])(
    'rejects %j because it is not a single valid digit',
    (input) => {
      expect(createDigitValidator(16)(input)).toBe(false);
    },
  );

  it('keeps validators for different bases independent of each other', () => {
    const isBinaryDigit = createDigitValidator(2);
    const isHexDigit = createDigitValidator(16);

    expect(isBinaryDigit('f')).toBe(false);
    expect(isHexDigit('f')).toBe(true);
    expect(isBinaryDigit('1')).toBe(true);
  });

  it('can be passed straight to array methods as a predicate', () => {
    const decimalOnly = Array.from('1a2B3').filter(createDigitValidator(10));
    const hexOnly = Array.from('1a2B3g').filter(createDigitValidator(16));

    expect(decimalOnly).toEqual(['1', '2', '3']);
    expect(hexOnly).toEqual(['1', 'a', '2', 'B', '3']);
  });
});

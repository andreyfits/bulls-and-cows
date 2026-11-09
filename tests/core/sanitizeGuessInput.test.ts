import { describe, expect, it } from 'vitest';

import { sanitizeGuessInput } from '../../src/core/sanitizeGuessInput.js';
import type { GameSettings } from '../../src/core/types.js';

const decimal: GameSettings = { length: 4, base: 10 };
const octal: GameSettings = { length: 4, base: 8 };
const binary: GameSettings = { length: 2, base: 2 };
const hexadecimal: GameSettings = { length: 4, base: 16 };

describe('sanitizeGuessInput', () => {
  it.each<[string, GameSettings, string, string]>([
    ['keeps valid decimal digits', decimal, '1234', '1234'],
    ['removes letters from a decimal guess', decimal, '12ab', '12'],
    ['removes digits outside the octal alphabet', octal, '1829', '12'],
    ['keeps only zeros and ones for the binary system', binary, '0123', '01'],
    ['keeps hex letters in either case', hexadecimal, 'aF3z', 'aF3'],
    ['drops spaces and punctuation', decimal, ' 1-2.3 4', '1234'],
    ['keeps leading zeros', decimal, '0012', '0012'],
    ['keeps repeated digits because duplicates are reported on submit', decimal, '1122', '1122'],
    ['removes digits of other scripts', decimal, '\u0661\u0662\u0663', ''],
    ['handles an empty input', decimal, '', ''],
  ])('%s', (_description, settings, input, expected) => {
    expect(sanitizeGuessInput(input, settings)).toBe(expected);
  });

  it('cuts the text to the secret length', () => {
    expect(sanitizeGuessInput('123456', decimal)).toBe('1234');
    expect(sanitizeGuessInput('0101', binary)).toBe('01');
  });

  it('cuts after removing invalid characters, not before', () => {
    expect(sanitizeGuessInput('a1b2c3d4e5', decimal)).toBe('1234');
  });

  it('keeps the order in which the digits were typed', () => {
    expect(sanitizeGuessInput('9a8b7', decimal)).toBe('987');
  });

  it('is idempotent', () => {
    const once = sanitizeGuessInput('x1y2-3 z4 5', decimal);

    expect(sanitizeGuessInput(once, decimal)).toBe(once);
  });
});

import { createDigitValidator } from './createDigitValidator.js';
import type { Base } from './types.js';

const hasDistinctDigits = (digits: readonly string[]): boolean =>
  new Set(digits.map((digit) => digit.toLowerCase())).size === digits.length;

export const isValidGuess = (guess: string, length: number, base: Base): boolean => {
  const digits = Array.from(guess);

  return (
    digits.length === length &&
    digits.every(createDigitValidator(base)) &&
    hasDistinctDigits(digits)
  );
};

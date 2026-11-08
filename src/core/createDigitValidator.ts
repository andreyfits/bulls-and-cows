import { getAlphabet } from './alphabet.js';
import type { Base } from './types.js';

export type DigitValidator = (char: string) => boolean;

export const createDigitValidator = (base: Base): DigitValidator => {
  const digits = new Set(getAlphabet(base));

  return (char) => digits.has(char.toLowerCase());
};

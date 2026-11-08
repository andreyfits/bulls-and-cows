import type { Base } from './types.js';

export type DigitValidator = (char: string) => boolean;

export const createDigitValidator = (_base: Base): DigitValidator => {
  throw new Error('Not implemented');
};

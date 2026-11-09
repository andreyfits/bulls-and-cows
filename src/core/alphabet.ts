import type { Base } from './types.js';

const DIGITS = '0123456789abcdef';

export const getAlphabet = (base: Base): readonly string[] => Array.from(DIGITS.slice(0, base));

import { BASE_NAMES } from '../core/constants.js';
import type { Base, GameSettings } from '../core/types.js';

export const DIGIT_RANGES: Readonly<Record<Base, string>> = {
  2: '0\u20131',
  8: '0\u20137',
  10: '0\u20139',
  16: '0\u20139, A\u2013F',
};

export const describeSettings = (settings: GameSettings): string =>
  `${BASE_NAMES[settings.base]} \u00b7 ${settings.length} digits`;

export const pluralize = (count: number, singular: string): string =>
  `${count} ${count === 1 ? singular : `${singular}s`}`;

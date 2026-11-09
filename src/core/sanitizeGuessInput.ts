import { createDigitValidator } from './createDigitValidator.js';
import type { GameSettings } from './types.js';

export const sanitizeGuessInput = (input: string, settings: GameSettings): string =>
  Array.from(input).filter(createDigitValidator(settings.base)).slice(0, settings.length).join('');

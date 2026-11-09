import type { Score } from './types.js';

const emptyScore: Score = { bulls: 0, cows: 0 };

const toDigits = (code: string): readonly string[] => Array.from(code.toLowerCase());

export const evaluateGuess = (secret: string, guess: string): Score => {
  const secretDigits = toDigits(secret);
  const secretDigitSet = new Set(secretDigits);

  return toDigits(guess).reduce<Score>((score, digit, index) => {
    if (digit === secretDigits[index]) {
      return { ...score, bulls: score.bulls + 1 };
    }

    return secretDigitSet.has(digit) ? { ...score, cows: score.cows + 1 } : score;
  }, emptyScore);
};

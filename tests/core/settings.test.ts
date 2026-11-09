import { describe, expect, it } from 'vitest';

import {
  getAvailableLengths,
  isLengthAvailable,
  withBase,
  withLength,
} from '../../src/core/settings.js';
import type { Base, GameSettings } from '../../src/core/types.js';

const bases: readonly Base[] = [2, 8, 10, 16];

describe('isLengthAvailable', () => {
  it.each<[number, Base, boolean]>([
    [2, 2, true],
    [3, 2, false],
    [6, 2, false],
    [2, 8, true],
    [6, 8, true],
    [2, 10, true],
    [6, 10, true],
    [2, 16, true],
    [6, 16, true],
  ])('length %i in base %i is available: %s', (length, base, expected) => {
    expect(isLengthAvailable(length, base)).toBe(expected);
  });

  it.each([0, 1, 7, 16, -2, 2.5, Number.NaN])(
    'length %s is never available because it is outside 2-6 or not whole',
    (length) => {
      bases.forEach((base) => {
        expect(isLengthAvailable(length, base)).toBe(false);
      });
    },
  );
});

describe('getAvailableLengths', () => {
  it('offers only length 2 for the binary system', () => {
    expect(getAvailableLengths(2)).toEqual([2]);
  });

  it.each<Base>([8, 10, 16])('offers every length from 2 to 6 for base %i', (base) => {
    expect(getAvailableLengths(base)).toEqual([2, 3, 4, 5, 6]);
  });

  it('never offers more digits than the base has', () => {
    bases.forEach((base) => {
      expect(getAvailableLengths(base).every((length) => length <= base)).toBe(true);
    });
  });
});

describe('withBase', () => {
  it('keeps the length when the new base can hold it', () => {
    const settings: GameSettings = { length: 4, base: 10 };

    expect(withBase(settings, 16)).toEqual({ length: 4, base: 16 });
    expect(withBase(settings, 8)).toEqual({ length: 4, base: 8 });
  });

  it.each([2, 3, 4, 5, 6])(
    'reduces length %i to 2 when switching to the binary system',
    (length) => {
      expect(withBase({ length, base: 10 }, 2)).toEqual({ length: 2, base: 2 });
    },
  );

  it('always produces settings whose length is available in the new base', () => {
    bases.forEach((from) => {
      bases.forEach((to) => {
        getAvailableLengths(from).forEach((length) => {
          const next = withBase({ length, base: from }, to);

          expect(next.base).toBe(to);
          expect(isLengthAvailable(next.length, to)).toBe(true);
        });
      });
    });
  });

  it('does not mutate the original settings and returns a new object', () => {
    const settings: GameSettings = Object.freeze({ length: 5, base: 16 });

    const next = withBase(settings, 2);

    expect(settings).toEqual({ length: 5, base: 16 });
    expect(next).not.toBe(settings);
  });
});

describe('withLength', () => {
  it('changes the length when the base can hold it', () => {
    expect(withLength({ length: 4, base: 10 }, 6)).toEqual({ length: 6, base: 10 });
    expect(withLength({ length: 2, base: 2 }, 2)).toEqual({ length: 2, base: 2 });
  });

  it('ignores a length that the base cannot hold', () => {
    const binary: GameSettings = { length: 2, base: 2 };

    expect(withLength(binary, 4)).toEqual(binary);
  });

  it.each([1, 7, 0, -3, 3.5])(
    'ignores length %s because it is outside 2-6 or not whole',
    (length) => {
      const settings: GameSettings = { length: 4, base: 16 };

      expect(withLength(settings, length)).toEqual(settings);
    },
  );

  it('does not mutate the original settings', () => {
    const settings: GameSettings = Object.freeze({ length: 4, base: 10 });

    const next = withLength(settings, 5);

    expect(settings).toEqual({ length: 4, base: 10 });
    expect(next).toEqual({ length: 5, base: 10 });
  });
});

import { describe, expect, it } from 'vitest';

import { formatDuration } from '../../src/core/formatDuration.js';

describe('formatDuration', () => {
  it.each<[number, string]>([
    [0, '00:00'],
    [999, '00:00'],
    [1_000, '00:01'],
    [9_999, '00:09'],
    [59_999, '00:59'],
    [60_000, '01:00'],
    [65_000, '01:05'],
    [600_000, '10:00'],
    [3_599_000, '59:59'],
    [3_600_000, '60:00'],
    [3_725_000, '62:05'],
  ])('formats %i ms as %s', (milliseconds, expected) => {
    expect(formatDuration(milliseconds)).toBe(expected);
  });

  it('rounds down to whole seconds instead of rounding up', () => {
    expect(formatDuration(1_999)).toBe('00:01');
    expect(formatDuration(61_900)).toBe('01:01');
  });

  it.each([-1, -5_000, Number.NEGATIVE_INFINITY, Number.NaN])(
    'shows 00:00 for the meaningless duration %s',
    (milliseconds) => {
      expect(formatDuration(milliseconds)).toBe('00:00');
    },
  );
});

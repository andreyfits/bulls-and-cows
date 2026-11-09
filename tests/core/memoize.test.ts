import { describe, expect, it, vi } from 'vitest';

import { memoize } from '../../src/core/memoize.js';

describe('memoize', () => {
  it('returns the same results as the original function', () => {
    const memoizedSquare = memoize((value: number) => value * value);

    expect(memoizedSquare(4)).toBe(16);
    expect(memoizedSquare(9)).toBe(81);
  });

  it('calls the original function once for repeated calls with the same arguments', () => {
    const square = vi.fn((value: number) => value * value);
    const memoizedSquare = memoize(square);

    memoizedSquare(4);
    memoizedSquare(4);
    memoizedSquare(4);

    expect(square).toHaveBeenCalledTimes(1);
  });

  it('computes again for arguments it has not seen yet', () => {
    const square = vi.fn((value: number) => value * value);
    const memoizedSquare = memoize(square);

    memoizedSquare(2);
    memoizedSquare(3);
    memoizedSquare(2);
    memoizedSquare(3);

    expect(square).toHaveBeenCalledTimes(2);
  });

  it('takes every argument into account, in order', () => {
    const subtract = vi.fn((left: number, right: number) => left - right);
    const memoizedSubtract = memoize(subtract);

    expect(memoizedSubtract(5, 3)).toBe(2);
    expect(memoizedSubtract(3, 5)).toBe(-2);
    expect(memoizedSubtract(5, 3)).toBe(2);
    expect(subtract).toHaveBeenCalledTimes(2);
  });

  it('does not mix up argument lists that look alike when concatenated', () => {
    const join = vi.fn((left: number, right: number) => `${left}|${right}`);
    const memoizedJoin = memoize(join);

    expect(memoizedJoin(1, 23)).toBe('1|23');
    expect(memoizedJoin(12, 3)).toBe('12|3');
    expect(join).toHaveBeenCalledTimes(2);
  });

  it('distinguishes numbers from strings with the same text', () => {
    const describeValue = vi.fn((value: number | string) => typeof value);
    const memoizedDescribe = memoize(describeValue);

    expect(memoizedDescribe(1)).toBe('number');
    expect(memoizedDescribe('1')).toBe('string');
    expect(describeValue).toHaveBeenCalledTimes(2);
  });

  it('works for functions without arguments', () => {
    const answer = vi.fn(() => 42);
    const memoizedAnswer = memoize(answer);

    expect(memoizedAnswer()).toBe(42);
    expect(memoizedAnswer()).toBe(42);
    expect(answer).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['zero', 0],
    ['an empty string', ''],
    ['false', false],
    ['null', null],
    ['undefined', undefined],
  ])('caches %s as a legitimate result', (_description, result) => {
    const compute = vi.fn(() => result);
    const memoizedCompute = memoize(compute);

    expect(memoizedCompute()).toBe(result);
    expect(memoizedCompute()).toBe(result);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('returns the very same object from the cache', () => {
    const memoizedBox = memoize((value: number) => ({ value }));

    expect(memoizedBox(1)).toBe(memoizedBox(1));
    expect(memoizedBox(1)).not.toBe(memoizedBox(2));
  });

  it('keeps separate caches for separate memoized functions', () => {
    const square = vi.fn((value: number) => value * value);
    const first = memoize(square);
    const second = memoize(square);

    first(5);
    second(5);

    expect(square).toHaveBeenCalledTimes(2);
  });

  it('does not cache a call that threw', () => {
    const flaky = vi
      .fn((value: number) => value)
      .mockImplementationOnce(() => {
        throw new Error('temporary failure');
      });
    const memoizedFlaky = memoize(flaky);

    expect(() => memoizedFlaky(1)).toThrow('temporary failure');
    expect(memoizedFlaky(1)).toBe(1);
    expect(flaky).toHaveBeenCalledTimes(2);
  });

  it('lets a recursive function reuse its own cache', () => {
    const fibonacci: (value: number) => number = memoize((value) =>
      value < 2 ? value : fibonacci(value - 1) + fibonacci(value - 2),
    );
    const slowFibonacciCalls = vi.fn();
    const countingFibonacci: (value: number) => number = memoize((value) => {
      slowFibonacciCalls();
      return value < 2 ? value : countingFibonacci(value - 1) + countingFibonacci(value - 2);
    });

    expect(fibonacci(50)).toBe(12586269025);
    expect(countingFibonacci(30)).toBe(832040);
    expect(slowFibonacciCalls).toHaveBeenCalledTimes(31);
  });
});

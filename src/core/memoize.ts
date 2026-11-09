interface CacheEntry<Result> {
  readonly value: Result;
}

export const memoize = <Args extends readonly unknown[], Result>(
  fn: (...args: Args) => Result,
): ((...args: Args) => Result) => {
  const cache = new Map<string, CacheEntry<Result>>();

  return (...args) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);

    if (cached !== undefined) {
      return cached.value;
    }

    const value = fn(...args);
    cache.set(key, { value });

    return value;
  };
};

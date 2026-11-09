export const memoize = <Args extends readonly unknown[], Result>(
  _fn: (...args: Args) => Result,
): ((...args: Args) => Result) => {
  throw new Error('Not implemented');
};

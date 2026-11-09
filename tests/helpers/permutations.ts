export const permutations = (items: readonly string[], size: number): readonly string[] =>
  size === 0
    ? ['']
    : items.flatMap((item) =>
        permutations(
          items.filter((other) => other !== item),
          size - 1,
        ).map((rest) => item + rest),
      );

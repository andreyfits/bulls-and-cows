export type Base = 2 | 8 | 10 | 16;

export type RandomSource = () => number;

export interface Score {
  readonly bulls: number;
  readonly cows: number;
}

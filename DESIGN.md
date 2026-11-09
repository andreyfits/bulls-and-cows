# Design notes — Bulls and Cows

## Architecture

One-way dependency flow, no bundler — `tsc` emits ES modules that the browser loads directly:

```text
src/main.ts        entry point: creates the root element, injects Math.random,
                   Date.now and localStorage, mounts the app
src/ui/*.ts        DOM renderers (view functions) + the stateful shell app.ts
src/core/*.ts      game domain: pure functions only — no DOM, no classes,
                   no mutation, no loops
src/storage/*.ts   KeyValueStore abstraction + localStorage adapter
```

- `tsconfig.core.json` compiles `src/core` **without the DOM lib**, so touching `document` inside the domain fails at compile time.
- ESLint enforces the functional style inside `src/core` (no classes, loops, `let`, `push`, object/array mutation).
- `src/ui/app.ts` is the only stateful module: it holds the current `AppState`, dispatches `AppAction`s through the pure `reduceApp`, re-renders, persists the leaderboard when it changes, and owns the single timer.

## Data structures

- **`GameSettings`** — `{ length: 2..6, base: 2 | 8 | 10 | 16 }`.
- **`GameState`** — immutable round state:
  `{ settings, secret, history, status: 'playing' | 'won', startedAt, finishedAt | null }`.
  `history` is a `readonly HistoryEntry[]` (`{ guess, bulls, cows }`); a new guess produces a
  new array via `[...history, entry]` — existing entries are never touched, which also makes
  duplicate detection a plain scan.
- **`LeaderboardRecord`** — `{ length, base, attempts, timeMs, finishedAt }`.
  `Leaderboard` is one flat `readonly` array covering **all** settings combinations;
  per-settings tables are derived views (`getTopRecords` = filter + `toSorted` + slice).
  One array → one storage key → trivial serialization.
- **`AppState`** — `{ settings, game | null, leaderboard, rejection, lastRecord }`;
  `game === null` means "settings screen". Every transition goes through `reduceApp`.
- **Lookup structures** — `evaluateGuess` and `isValidGuess` build a `Set` of digits for O(1)
  membership; `memoize` caches in a `Map` keyed by `JSON.stringify(args)`.
- **Normalization** — secrets and guesses are lower-cased once at the boundary
  (`submitGuess` / `evaluateGuess`), so hex casing can never leak into history or records.

## Required functions — how and how fast

`n` = secret length, `b` = number-system size (`base`).

### `createDigitValidator(base)`

- Builds the alphabet `Set` once — **O(b)** time and space at creation.
- The returned predicate is **O(1)** per call (`toLowerCase` + `Set.has`).
- The curried shape lets every consumer share one validator per base instead of
  rebuilding the alphabet per check; the same predicate drives both validation
  (`isValidGuess`) and live input filtering (`sanitizeGuessInput`), so the two can
  never disagree.

### `isValidGuess(guess, length, base)`

- Length check (O(1)), every digit via the curried validator, uniqueness via a `Set`.
- **O(n)** time, **O(n)** space, single pass.

### `evaluateGuess(secret, guess)`

- Lower-cases both sides, builds `Set(secret)`, then one `reduce` over the positions:
  same index → bull, otherwise membership in the set → cow.
- **O(n)** time, **O(n)** space (the digit set), single pass over the guess.
- A `reduce` accumulator instead of a loop keeps the counting logic mutation-free and
  satisfies the "array methods, not manual loops" rule; the rule is also enforced by
  lint, not by convention.

### `generateSecret(length, base, random)`

- Recursive `pickUnique`: each step picks `pool[floor(random() * pool.length)]` and
  builds the next pool without that digit (`slice` + `slice`), so digits can never repeat.
- **O(n · b)** time: `n` recursive steps, each copying a pool of at most `b` digits.
  Space **O(n · b)** for the pool copies plus **O(n)** recursion depth (`n` ≤ 6 here).
- `random` is an injected parameter, not a global — tests replay exact digit choices
  through a seeded `RandomSource`. A leading zero is a legal first digit by design.

### `countPossibleSecrets(length, base)`

- The count is the number of permutations `P(b, n) = b! / (b − n)!` — order matters and
  digits don't repeat; a leading zero counts, so no fix-up is needed.
- Recursive definition: `f(0, b) = 1`; `f(n, b) = b · f(n − 1, b − 1)`; `f = 0` when
  `n > b`. Non-integer or negative arguments throw (programmer error, not a value).
- **O(n)** multiplications on a cold call; the result is memoized through a `Map` keyed
  by `(length, base)` — the function calls _itself through its own memoized reference_,
  so recursive steps hit the cache too and repeat calls are **O(1)**. That is what makes
  it cheap to recompute the "possible secrets" hint on every settings change.

### Leaderboard helpers (for completeness)

- `getTopRecords` is **O(R log R)** over `R` stored records (filter + `toSorted` + slice).
- `addRecord` keeps other settings untouched and re-trims only the affected table —
  **O(R log R)**, and the cap is 10 per settings combination, so `R` stays small.

## State management

- One pure transition function `reduceApp(state, action)` — Redux without the framework.
  Actions carry their inputs (`secret`, `now`), so randomness and time are injected by
  the shell and the reducer stays deterministic and replayable.
- Rejected guesses are **data**: `rejection: 'invalid' | 'duplicate'` lives in the state,
  so the message survives re-renders (e.g. timer ticks) and clears on the next accepted
  guess or on "New game".
- Rendering is whole-screen `root.replaceChildren(...)` — no diffing layer, correct by
  construction for an app this size. Focus survives because the shell re-focuses the
  element with the same id after each render.
- Exactly one `setInterval` exists (in `app.ts`, while a round is on); the display reads
  `getElapsed(state, now)` — the clock is read, never accumulated in the DOM.

## Persistence

- `KeyValueStore` (`getItem`/`setItem`) with `createMemoryStore()` for tests and
  `getBrowserStore()` for `localStorage`.
- All storage access is guarded: blocked or corrupted storage degrades to an empty
  leaderboard, never a crash. `parseLeaderboard` validates every field of every record
  (base ∈ `BASES`, length available for that base, positive integer attempts,
  non-negative times) and drops malformed entries.
- Versioned key `bulls-and-cows:leaderboard:v1` leaves room for schema evolution.

## Testing strategy

- **TDD**: for each required function the failing test suite was committed first
  (verified red), then the implementation (green). A red commit never leaves the
  machine alone — each push contains red + green together.
- **372 tests**: table-driven cases per base; `evaluateGuess` cross-validated against a
  brute-force permutation reference; `deepFreeze` applied to inputs to prove
  immutability; seeded `RandomSource` for exact secrets; `createMemoryStore` for
  persistence.
- **jsdom smoke tests** mount the real app and click/type like a user: settings locking,
  input filtering, history order, duplicates, win → record → reload persistence,
  "New game" without a reload, and a spy asserting `innerHTML`/`insertAdjacentHTML`
  are never used.
- **FIRST**: the whole suite runs in ~4 s of test time; order is shuffled on purpose;
  tests are deterministic via injected dependencies; every check is a self-validating
  assertion; every public function is covered including error paths.

## Clean Code principles in this code base

Following the RS School Clean Code module (DRY, KISS, YAGNI, formatting, comments,
commit style):

- **DRY** — digit rules exist once: `createDigitValidator` powers `isValidGuess`,
  `sanitizeGuessInput` and the alphabet hint; `renderNewGameButton` is shared by the
  in-round and result views; the test helpers (`findAs`, `submitGuess`, `radios`)
  remove copy-pasted DOM plumbing.
- **KISS** — no framework, no bundler, no global event bus: one reducer plus
  `replaceChildren`; a secret is a `string`, not a bespoke `Digit` class hierarchy.
- **YAGNI** — `memoize` is used only where repetition actually exists
  (`countPossibleSecrets`), not sprayed over every pure function; storage writes one
  key; no undo, no multiplayer scaffolding, no settings that were not requested.
- **Meaningful names over comments** — domain vocabulary (`judgeGuess` → `GuessVerdict`,
  `recordWin`, `hasSettings`, `isLengthAvailable`) carries the intent, so the code
  needs no explanatory comments and carries no stale ones.
- **Small functions, single responsibility** — every export does one thing; the UI is
  split by screen (`settingsPanel`, `gameBoard`, `leaderboardView`, `dom`, `labels`);
  `evaluateGuess` fits in a few lines.
- **Errors as values vs exceptions** — domain rejections are data (`GuessVerdict`),
  while `throw` is reserved for programmer errors (an illegal secret in `createGame`,
  recording a game that was not won, invalid arguments to `countPossibleSecrets`).
- **Formatting and tooling** — Prettier and strict `typescript-eslint`
  (`strictTypeChecked`) run on every commit via lint-staged + Husky; `pre-push` runs
  the full test suite, so broken code cannot be pushed.
- **Commit style** — Conventional Commits with small scoped subjects
  (`test(core):`, `feat(ui):`), and the TDD order (red before green) is visible in the
  history itself.

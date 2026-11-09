import type { AppAction, AppState } from '../core/appState.js';
import { createAppState, reduceApp } from '../core/appState.js';
import { formatDuration } from '../core/formatDuration.js';
import { getElapsed } from '../core/game.js';
import { generateSecret } from '../core/generateSecret.js';
import { getRank } from '../core/leaderboard.js';
import type { RandomSource } from '../core/types.js';
import type { KeyValueStore } from '../storage/leaderboardStorage.js';
import { loadLeaderboard, saveLeaderboard } from '../storage/leaderboardStorage.js';
import { h } from './dom.js';
import { renderGameBoard } from './gameBoard.js';
import { renderLeaderboard } from './leaderboardView.js';
import { renderSettingsPanel } from './settingsPanel.js';

export interface AppEnvironment {
  readonly random: RandomSource;
  readonly now: () => number;
  readonly store: KeyValueStore;
}

const TIMER_INTERVAL_MS = 250;

const defaultFocusId = ({ game }: AppState): string => {
  if (game === null) {
    return 'start-button';
  }

  return game.status === 'won' ? 'new-game-button' : 'guess-input';
};

const isElement = (value: HTMLElement | null): value is HTMLElement => value !== null;

const renderHeader = (): HTMLElement =>
  h(
    'header',
    { className: 'app-header' },
    h('h1', {}, 'Bulls and Cows'),
    h(
      'p',
      { className: 'tagline' },
      'Crack the secret made of different digits. A bull is a right digit in the right place, a cow is a right digit in the wrong place.',
    ),
  );

export const mountApp = (root: HTMLElement, environment: AppEnvironment): (() => void) => {
  let state: AppState = createAppState(loadLeaderboard(environment.store));
  let draft = '';

  const render = (): void => {
    const hadFocus = root.contains(document.activeElement);
    const focusedId = hadFocus ? document.activeElement?.id : undefined;
    const { game, settings, leaderboard, lastRecord, rejection } = state;

    root.replaceChildren(
      ...[
        renderHeader(),
        renderSettingsPanel({ settings, locked: game !== null, dispatch, onStart: startGame }),
        game === null
          ? null
          : renderGameBoard({
              game,
              draft,
              rejection,
              rank: lastRecord === null ? null : getRank(leaderboard, lastRecord),
              now: environment.now(),
              onDraftChange: (value) => {
                draft = value;
              },
              onSubmit: submitGuess,
              onNewGame: abandonGame,
            }),
        renderLeaderboard({ leaderboard, settings, highlighted: lastRecord }),
      ].filter(isElement),
    );

    if (hadFocus) {
      const target =
        (focusedId ? document.getElementById(focusedId) : null) ??
        document.getElementById(defaultFocusId(state));

      target?.focus();
    }
  };

  const dispatch = (action: AppAction): void => {
    const previous = state;
    state = reduceApp(previous, action);

    if (state.leaderboard !== previous.leaderboard) {
      saveLeaderboard(environment.store, state.leaderboard);
    }

    if (state.game !== previous.game) {
      draft = '';
    }

    render();
  };

  const startGame = (): void => {
    const { length, base } = state.settings;

    dispatch({
      type: 'game-started',
      secret: generateSecret(length, base, environment.random),
      now: environment.now(),
    });
  };

  const submitGuess = (): void => {
    dispatch({ type: 'guess-submitted', guess: draft, now: environment.now() });
  };

  const abandonGame = (): void => {
    dispatch({ type: 'game-abandoned' });
  };

  const timerId = window.setInterval(() => {
    const { game } = state;
    const timer = root.querySelector('#timer');

    if (game?.status === 'playing' && timer !== null) {
      timer.textContent = formatDuration(getElapsed(game, environment.now()));
    }
  }, TIMER_INTERVAL_MS);

  render();

  return () => {
    window.clearInterval(timerId);
  };
};

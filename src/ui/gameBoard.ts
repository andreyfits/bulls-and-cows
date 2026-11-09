import type { Rejection } from '../core/appState.js';
import { formatDuration } from '../core/formatDuration.js';
import type { GameState, HistoryEntry } from '../core/game.js';
import { getElapsed } from '../core/game.js';
import { LEADERBOARD_SIZE } from '../core/leaderboard.js';
import { sanitizeGuessInput } from '../core/sanitizeGuessInput.js';
import { h } from './dom.js';
import { DIGIT_RANGES, describeSettings, pluralize } from './labels.js';

export interface GameBoardProps {
  readonly game: GameState;
  readonly draft: string;
  readonly rejection: Rejection | null;
  readonly rank: number | null;
  readonly now: number;
  readonly onDraftChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly onNewGame: () => void;
}

const describeMessage = ({ game, draft, rejection }: GameBoardProps): string => {
  const { length, base } = game.settings;

  switch (rejection) {
    case 'invalid':
      return `Use exactly ${length} different digits (${DIGIT_RANGES[base]}).`;
    case 'duplicate':
      return `You already tried ${draft.toUpperCase()}. Try a different number.`;
    case null:
      return `Type ${length} different digits (${DIGIT_RANGES[base]}) and press Enter.`;
  }
};

const renderStat = (label: string, id: string, value: string): HTMLElement =>
  h('div', { className: 'stat' }, h('dt', {}, label), h('dd', { id }, value));

const renderStats = (game: GameState, now: number): HTMLElement =>
  h(
    'dl',
    { className: 'stats' },
    renderStat('Attempts', 'attempts', String(game.history.length)),
    renderStat('Time', 'timer', formatDuration(getElapsed(game, now))),
  );

const renderNewGameButton = (
  variant: 'primary' | 'ghost',
  onClick: () => void,
): HTMLButtonElement =>
  h(
    'button',
    {
      type: 'button',
      id: 'new-game-button',
      className: `button button--${variant}`,
      onclick: onClick,
    },
    'New game',
  );

const renderGuessForm = (props: GameBoardProps): HTMLFormElement => {
  const { settings } = props.game;

  const input: HTMLInputElement = h('input', {
    id: 'guess-input',
    className: 'input',
    type: 'text',
    value: props.draft,
    maxLength: settings.length,
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: false,
    inputMode: settings.base === 16 ? 'text' : 'numeric',
    oninput: () => {
      const sanitized = sanitizeGuessInput(input.value, settings);

      if (input.value !== sanitized) {
        input.value = sanitized;
      }

      props.onDraftChange(sanitized);
    },
  });

  return h(
    'form',
    {
      className: 'guess-form',
      noValidate: true,
      onsubmit: (event) => {
        event.preventDefault();
        props.onSubmit();
      },
    },
    h('label', { htmlFor: 'guess-input' }, 'Your guess'),
    h(
      'div',
      { className: 'guess-form__row' },
      input,
      h(
        'button',
        { type: 'submit', id: 'guess-button', className: 'button button--primary' },
        'Guess',
      ),
    ),
    h(
      'p',
      {
        id: 'guess-message',
        className: props.rejection === null ? 'message' : 'message message--error',
        role: 'status',
      },
      describeMessage(props),
    ),
    h('div', { className: 'card__actions' }, renderNewGameButton('ghost', props.onNewGame)),
  );
};

const describeRank = (rank: number | null, game: GameState): string =>
  rank === null
    ? `Not in the top ${LEADERBOARD_SIZE} of ${describeSettings(game.settings)} this time.`
    : `Rank #${rank} in the top ${LEADERBOARD_SIZE} of ${describeSettings(game.settings)}.`;

const renderResult = (props: GameBoardProps): HTMLElement =>
  h(
    'div',
    { className: 'result', role: 'status' },
    h('h3', {}, 'You cracked it!'),
    h(
      'p',
      {},
      'The secret was ',
      h('strong', { className: 'secret' }, props.game.secret.toUpperCase()),
    ),
    h(
      'p',
      {},
      `Solved in ${pluralize(props.game.history.length, 'attempt')} and ${formatDuration(getElapsed(props.game, props.now))}.`,
    ),
    h('p', { className: 'rank' }, describeRank(props.rank, props.game)),
    renderNewGameButton('primary', props.onNewGame),
  );

const renderHistoryItem = (entry: HistoryEntry, attempt: number): HTMLElement =>
  h(
    'li',
    { className: 'history__item' },
    h('span', { className: 'history__index' }, `#${attempt}`),
    h('span', { className: 'history__guess' }, entry.guess.toUpperCase()),
    h('span', { className: 'badge badge--bulls' }, pluralize(entry.bulls, 'bull')),
    h('span', { className: 'badge badge--cows' }, pluralize(entry.cows, 'cow')),
  );

const renderHistory = (history: readonly HistoryEntry[]): HTMLElement =>
  history.length === 0
    ? h('p', { className: 'empty' }, 'No attempts yet. Your guesses will appear here.')
    : h(
        'ol',
        { className: 'history', ariaLabel: 'Attempt history' },
        ...history.map((entry, index) => renderHistoryItem(entry, index + 1)).toReversed(),
      );

export const renderGameBoard = (props: GameBoardProps): HTMLElement =>
  h(
    'section',
    { className: 'card', id: 'game' },
    h(
      'div',
      { className: 'card__header' },
      h('h2', {}, props.game.status === 'won' ? 'Round complete' : 'Round in progress'),
      renderStats(props.game, props.now),
    ),
    props.game.status === 'won' ? renderResult(props) : renderGuessForm(props),
    renderHistory(props.game.history),
  );

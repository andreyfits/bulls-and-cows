import { formatDuration } from '../core/formatDuration.js';
import type { Leaderboard, LeaderboardRecord } from '../core/leaderboard.js';
import { LEADERBOARD_SIZE, getTopRecords } from '../core/leaderboard.js';
import type { GameSettings } from '../core/types.js';
import { h } from './dom.js';
import { describeSettings } from './labels.js';

export interface LeaderboardViewProps {
  readonly leaderboard: Leaderboard;
  readonly settings: GameSettings;
  readonly highlighted: LeaderboardRecord | null;
}

const formatFinishedAt = (timestamp: number): string =>
  new Date(timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

const renderRow = (
  record: LeaderboardRecord,
  index: number,
  highlighted: LeaderboardRecord | null,
): HTMLElement =>
  h(
    'tr',
    { className: record === highlighted ? 'leaderboard__row is-current' : 'leaderboard__row' },
    h('td', {}, String(index + 1)),
    h('td', {}, String(record.attempts)),
    h('td', {}, formatDuration(record.timeMs)),
    h('td', { className: 'leaderboard__date' }, formatFinishedAt(record.finishedAt)),
  );

const renderTable = (
  records: Leaderboard,
  settings: GameSettings,
  highlighted: LeaderboardRecord | null,
): HTMLElement =>
  h(
    'table',
    {
      className: 'leaderboard__table',
      ariaLabel: `Best results for ${describeSettings(settings)}`,
    },
    h(
      'thead',
      {},
      h(
        'tr',
        {},
        h('th', { scope: 'col' }, 'Rank'),
        h('th', { scope: 'col' }, 'Attempts'),
        h('th', { scope: 'col' }, 'Time'),
        h('th', { scope: 'col', className: 'leaderboard__date' }, 'Date'),
      ),
    ),
    h('tbody', {}, ...records.map((record, index) => renderRow(record, index, highlighted))),
  );

export const renderLeaderboard = ({
  leaderboard,
  settings,
  highlighted,
}: LeaderboardViewProps): HTMLElement => {
  const records = getTopRecords(leaderboard, settings);

  return h(
    'section',
    { className: 'card', id: 'leaderboard' },
    h(
      'div',
      { className: 'card__header' },
      h('h2', {}, `Top ${LEADERBOARD_SIZE}`),
      h('span', { className: 'badge badge--settings' }, describeSettings(settings)),
    ),
    records.length === 0
      ? h('p', { className: 'empty' }, 'No results for these settings yet. Be the first!')
      : renderTable(records, settings, highlighted),
  );
};

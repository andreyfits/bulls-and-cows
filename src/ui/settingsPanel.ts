import { getAlphabet } from '../core/alphabet.js';
import type { AppAction } from '../core/appState.js';
import { BASES, BASE_NAMES, LENGTHS } from '../core/constants.js';
import { countPossibleSecrets } from '../core/countPossibleSecrets.js';
import { isLengthAvailable } from '../core/settings.js';
import type { Base, GameSettings } from '../core/types.js';
import { h } from './dom.js';

export interface SettingsPanelProps {
  readonly settings: GameSettings;
  readonly locked: boolean;
  readonly dispatch: (action: AppAction) => void;
  readonly onStart: () => void;
}

interface ChoiceOption<Value extends number> {
  readonly value: Value;
  readonly label: string;
  readonly disabled: boolean;
}

interface ChoiceGroupProps<Value extends number> {
  readonly name: string;
  readonly legend: string;
  readonly selected: Value;
  readonly options: readonly ChoiceOption<Value>[];
  readonly locked: boolean;
  readonly onSelect: (value: Value) => void;
}

const formatCount = (count: number): string => count.toLocaleString('en-US');

const renderChoiceGroup = <Value extends number>(
  props: ChoiceGroupProps<Value>,
): HTMLFieldSetElement =>
  h(
    'fieldset',
    { className: 'field' },
    h('legend', {}, props.legend),
    h(
      'div',
      { className: 'segmented' },
      ...props.options.flatMap((option) => {
        const id = `${props.name}-${option.value}`;

        return [
          h('input', {
            type: 'radio',
            className: 'segmented__input',
            name: props.name,
            id,
            value: String(option.value),
            checked: option.value === props.selected,
            disabled: props.locked || option.disabled,
            onchange: () => {
              props.onSelect(option.value);
            },
          }),
          h('label', { className: 'segmented__label', htmlFor: id }, option.label),
        ];
      }),
    ),
  );

export const renderSettingsPanel = ({
  settings,
  locked,
  dispatch,
  onStart,
}: SettingsPanelProps): HTMLElement =>
  h(
    'section',
    { className: 'card', id: 'settings' },
    h('h2', {}, 'Settings'),
    renderChoiceGroup<Base>({
      name: 'base',
      legend: 'Number system',
      selected: settings.base,
      locked,
      options: BASES.map((base) => ({ value: base, label: BASE_NAMES[base], disabled: false })),
      onSelect: (base) => {
        dispatch({ type: 'base-selected', base });
      },
    }),
    renderChoiceGroup<number>({
      name: 'length',
      legend: 'Secret length',
      selected: settings.length,
      locked,
      options: LENGTHS.map((length) => ({
        value: length,
        label: String(length),
        disabled: !isLengthAvailable(length, settings.base),
      })),
      onSelect: (length) => {
        dispatch({ type: 'length-selected', length });
      },
    }),
    h(
      'div',
      { className: 'hints' },
      h(
        'p',
        { className: 'hint' },
        'Digits: ',
        h('span', { className: 'mono' }, getAlphabet(settings.base).join('').toUpperCase()),
      ),
      h(
        'p',
        { className: 'hint' },
        'Possible secrets: ',
        h('strong', {}, formatCount(countPossibleSecrets(settings.length, settings.base))),
      ),
    ),
    h(
      'div',
      { className: 'card__actions' },
      locked
        ? h(
            'p',
            { className: 'note' },
            'Settings are locked during a round. Press \u201cNew game\u201d to change them.',
          )
        : h(
            'button',
            {
              type: 'button',
              id: 'start-button',
              className: 'button button--primary',
              onclick: onStart,
            },
            'Start game',
          ),
    ),
  );

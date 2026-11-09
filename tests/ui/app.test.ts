// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RandomSource } from '../../src/core/types.js';
import type { KeyValueStore } from '../../src/storage/leaderboardStorage.js';
import { createMemoryStore } from '../../src/storage/leaderboardStorage.js';
import { mountApp } from '../../src/ui/app.js';
import { constantRandom } from '../helpers/random.js';

interface Harness {
  readonly root: HTMLElement;
  readonly clock: { time: number };
}

const disposers: (() => void)[] = [];

const mount = (
  store: KeyValueStore = createMemoryStore(),
  random: RandomSource = constantRandom(0),
): Harness => {
  const root = document.createElement('main');
  const clock = { time: 1_000 };

  document.body.append(root);
  disposers.push(mountApp(root, { random, now: () => clock.time, store }));

  return { root, clock };
};

afterEach(() => {
  disposers.splice(0).forEach((dispose) => {
    dispose();
  });
  document.body.replaceChildren();
  vi.useRealTimers();
});

const find = (root: ParentNode, selector: string): Element => {
  const element = root.querySelector(selector);

  if (element === null) {
    throw new Error(`No element matches ${selector}`);
  }

  return element;
};

const findAs = <T extends Element>(
  root: ParentNode,
  selector: string,
  type: abstract new () => T,
): T => {
  const element = find(root, selector);

  if (!(element instanceof type)) {
    throw new Error(`${selector} is not a ${type.name}`);
  }

  return element;
};

const has = (root: ParentNode, selector: string): boolean => root.querySelector(selector) !== null;

const textOf = (root: ParentNode, selector: string): string => find(root, selector).textContent;

const radios = (
  root: ParentNode,
  name: string,
): readonly { id: string; checked: boolean; disabled: boolean }[] =>
  Array.from(root.querySelectorAll(`input[name="${name}"]`), (element) => ({
    id: element.id,
    checked: element instanceof HTMLInputElement && element.checked,
    disabled: element instanceof HTMLInputElement && element.disabled,
  }));

const choose = (root: ParentNode, id: string): void => {
  const radio = findAs(root, `#${id}`, HTMLInputElement);

  radio.focus();
  radio.click();
};

const clickButton = (root: ParentNode, id: string): void => {
  const button = findAs(root, `#${id}`, HTMLButtonElement);

  button.focus();
  button.click();
};

const typeGuess = (root: ParentNode, value: string): void => {
  const input = findAs(root, '#guess-input', HTMLInputElement);

  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const submitGuess = (root: ParentNode, value: string): void => {
  typeGuess(root, value);
  findAs(root, '.guess-form', HTMLFormElement).requestSubmit();
};

const historyTexts = (root: ParentNode): readonly string[] =>
  Array.from(root.querySelectorAll('.history__item'), (item) => item.textContent);

const leaderboardRows = (root: ParentNode): readonly Element[] =>
  Array.from(root.querySelectorAll('.leaderboard__row'));

const startRound = (root: ParentNode): void => {
  clickButton(root, 'start-button');
};

describe('settings screen', () => {
  it('shows every number system and length with the defaults selected', () => {
    const { root } = mount();

    expect(radios(root, 'base').map((radio) => radio.id)).toEqual([
      'base-2',
      'base-8',
      'base-10',
      'base-16',
    ]);
    expect(radios(root, 'length').map((radio) => radio.id)).toEqual([
      'length-2',
      'length-3',
      'length-4',
      'length-5',
      'length-6',
    ]);
    expect(radios(root, 'base').find((radio) => radio.checked)?.id).toBe('base-10');
    expect(radios(root, 'length').find((radio) => radio.checked)?.id).toBe('length-4');
    expect(has(root, '#game')).toBe(false);
  });

  it('keeps every control enabled before the round starts', () => {
    const { root } = mount();

    const controls = [...radios(root, 'base'), ...radios(root, 'length')];

    expect(controls.every((radio) => !radio.disabled)).toBe(true);
  });

  it('allows only length 2 for the binary system', () => {
    const { root } = mount();

    choose(root, 'base-2');

    const lengths = radios(root, 'length');
    expect(lengths.filter((radio) => !radio.disabled).map((radio) => radio.id)).toEqual([
      'length-2',
    ]);
    expect(lengths.find((radio) => radio.checked)?.id).toBe('length-2');
  });

  it('offers the longer lengths again after leaving the binary system', () => {
    const { root } = mount();

    choose(root, 'base-2');
    choose(root, 'base-8');

    expect(radios(root, 'length').every((radio) => !radio.disabled)).toBe(true);
  });

  it('shows how many secrets are possible for the chosen settings', () => {
    const { root } = mount();

    expect(textOf(root, '.hints')).toContain('5,040');

    choose(root, 'length-6');

    expect(textOf(root, '.hints')).toContain('151,200');
  });
});

describe('a round', () => {
  it('locks the settings from the start of the round', () => {
    const { root } = mount();

    startRound(root);

    const controls = [...radios(root, 'base'), ...radios(root, 'length')];
    expect(controls.every((radio) => radio.disabled)).toBe(true);
    expect(has(root, '#start-button')).toBe(false);
    expect(document.activeElement?.id).toBe('guess-input');
  });

  it('blocks characters that are not digits of the chosen system', () => {
    const { root } = mount();
    startRound(root);

    typeGuess(root, 'ab!z');

    expect(findAs(root, '#guess-input', HTMLInputElement).value).toBe('');
  });

  it('accepts upper case hex digits and cuts the input to the secret length', () => {
    const { root } = mount();
    choose(root, 'base-16');
    choose(root, 'length-3');
    startRound(root);

    typeGuess(root, 'xyzFEDC');

    expect(findAs(root, '#guess-input', HTMLInputElement).value).toBe('FED');
  });

  it('adds an entry with bulls and cows to the history after every guess', () => {
    const { root } = mount();
    startRound(root);

    submitGuess(root, '1234');
    submitGuess(root, '0132');

    const [newest, oldest] = historyTexts(root);
    expect(newest).toContain('#2');
    expect(newest).toContain('0132');
    expect(newest).toContain('2 bulls');
    expect(newest).toContain('2 cows');
    expect(oldest).toContain('#1');
    expect(oldest).toContain('0 bulls');
    expect(oldest).toContain('3 cows');
    expect(textOf(root, '#attempts')).toBe('2');
  });

  it('does not add a repeated guess to the history and explains why', () => {
    const { root } = mount();
    startRound(root);

    submitGuess(root, '1234');
    submitGuess(root, '1234');

    expect(historyTexts(root)).toHaveLength(1);
    expect(textOf(root, '#guess-message')).toContain('already tried');
  });

  it('rejects a guess of the wrong shape and keeps what was typed', () => {
    const { root } = mount();
    startRound(root);

    submitGuess(root, '12');

    expect(historyTexts(root)).toHaveLength(0);
    expect(textOf(root, '#guess-message')).toContain('Use exactly 4 different digits');
    expect(findAs(root, '#guess-input', HTMLInputElement).value).toBe('12');
  });

  it('rejects a guess with repeated digits', () => {
    const { root } = mount();
    startRound(root);

    submitGuess(root, '1123');

    expect(historyTexts(root)).toHaveLength(0);
  });

  it('keeps the timer running while the round is on', () => {
    vi.useFakeTimers();
    const { root, clock } = mount();
    startRound(root);

    expect(textOf(root, '#timer')).toBe('00:00');

    clock.time += 7_000;
    vi.advanceTimersByTime(300);

    expect(textOf(root, '#timer')).toBe('00:07');
  });
});

describe('winning', () => {
  it('finishes the round and reports attempts and time', () => {
    const { root, clock } = mount();
    startRound(root);
    submitGuess(root, '1234');

    clock.time = 66_000;
    submitGuess(root, '0123');

    const result = textOf(root, '.result');
    expect(result).toContain('You cracked it!');
    expect(result).toContain('0123');
    expect(result).toContain('Solved in 2 attempts and 01:05');
    expect(has(root, '#guess-input')).toBe(false);
  });

  it('wins with upper case hex digits against a lower case secret', () => {
    const { root } = mount(createMemoryStore(), constantRandom(0.999999));
    choose(root, 'base-16');
    choose(root, 'length-3');
    startRound(root);

    submitGuess(root, 'FED');

    expect(textOf(root, '.result')).toContain('FED');
  });

  it('keeps the settings locked until a new game is started', () => {
    const { root } = mount();
    startRound(root);
    submitGuess(root, '0123');

    const controls = [...radios(root, 'base'), ...radios(root, 'length')];

    expect(controls.every((radio) => radio.disabled)).toBe(true);
  });

  it('puts the result into the leaderboard and highlights it', () => {
    const { root } = mount();
    startRound(root);
    submitGuess(root, '1234');
    submitGuess(root, '0123');

    const rows = leaderboardRows(root);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.classList.contains('is-current')).toBe(true);
    expect(rows[0]?.textContent).toContain('2');
    expect(textOf(root, '.rank')).toContain('Rank #1');
  });

  it('keeps the leaderboard across a reload of the page', () => {
    const store = createMemoryStore();
    const first = mount(store);
    startRound(first.root);
    submitGuess(first.root, '0123');
    document.body.replaceChildren();

    const second = mount(store);

    expect(leaderboardRows(second.root)).toHaveLength(1);
    expect(has(second.root, '#game')).toBe(false);
  });

  it('keeps a separate table for every combination of settings', () => {
    const { root } = mount();
    startRound(root);
    submitGuess(root, '0123');
    clickButton(root, 'new-game-button');

    choose(root, 'base-16');
    choose(root, 'length-3');
    expect(textOf(root, '#leaderboard .badge')).toContain('hex');
    expect(leaderboardRows(root)).toHaveLength(0);

    startRound(root);
    submitGuess(root, '012');
    expect(leaderboardRows(root)).toHaveLength(1);
    clickButton(root, 'new-game-button');

    choose(root, 'base-10');
    choose(root, 'length-4');
    expect(textOf(root, '#leaderboard .badge')).toContain('dec');
    expect(leaderboardRows(root)).toHaveLength(1);
  });
});

describe('a new game', () => {
  it('returns to the settings screen without rebuilding the page', () => {
    const { root } = mount();
    root.dataset.marker = 'still here';
    startRound(root);
    submitGuess(root, '0123');

    clickButton(root, 'new-game-button');

    expect(root.dataset.marker).toBe('still here');
    expect(has(root, '#game')).toBe(false);
    expect(has(root, '#start-button')).toBe(true);
    expect(radios(root, 'base').every((radio) => !radio.disabled)).toBe(true);
  });

  it('can be started in the middle of a round and starts from scratch', () => {
    const { root } = mount();
    startRound(root);
    submitGuess(root, '1234');

    clickButton(root, 'new-game-button');
    startRound(root);

    expect(historyTexts(root)).toHaveLength(0);
    expect(textOf(root, '#attempts')).toBe('0');
  });
});

describe('robustness', () => {
  it('keeps working when the storage is not available', () => {
    const blockedStore: KeyValueStore = {
      getItem: () => {
        throw new Error('storage is blocked');
      },
      setItem: () => {
        throw new Error('storage is blocked');
      },
    };
    const { root } = mount(blockedStore);

    startRound(root);
    submitGuess(root, '0123');

    expect(has(root, '.result')).toBe(true);
    expect(leaderboardRows(root)).toHaveLength(1);
  });

  it('builds the page without innerHTML or insertAdjacentHTML', () => {
    const innerHtmlSetter = vi.spyOn(Element.prototype, 'innerHTML', 'set');
    const insertAdjacentHtml = vi.spyOn(Element.prototype, 'insertAdjacentHTML');
    const { root } = mount();

    startRound(root);
    submitGuess(root, '1234');
    submitGuess(root, '0123');
    clickButton(root, 'new-game-button');

    expect(innerHtmlSetter).not.toHaveBeenCalled();
    expect(insertAdjacentHtml).not.toHaveBeenCalled();
  });
});

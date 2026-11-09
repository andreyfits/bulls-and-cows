export type Child = Node | string;

export type Props<Tag extends keyof HTMLElementTagNameMap> = Partial<HTMLElementTagNameMap[Tag]>;

const isChild = (child: Child | null | false): child is Child => child !== null && child !== false;

export const h = <Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  props: Props<Tag> = {},
  ...children: readonly (Child | null | false)[]
): HTMLElementTagNameMap[Tag] => {
  const element = document.createElement(tag);

  Object.assign(element, props);
  element.append(...children.filter(isChild));

  return element;
};

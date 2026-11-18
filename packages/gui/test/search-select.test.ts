import assert from 'node:assert/strict';
import test from 'node:test';
import m from 'mithril';
import { SearchSelect, type SearchSelectAttrs } from 'mithril-materialized';

const findNode = (tree: m.Children, predicate: (node: m.Vnode) => boolean): m.Vnode | undefined => {
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const found = findNode(child, predicate);
      if (found) return found;
    }
  } else if (tree && typeof tree === 'object') {
    if (predicate(tree)) return tree;
    return findNode(tree.children, predicate);
  }
  return undefined;
};

const picker = (oncreateNewOption?: SearchSelectAttrs<string>['oncreateNewOption']) => {
  let selected: string[] = [];
  const attrs: SearchSelectAttrs<string> = {
    label: 'Attributes',
    options: [{ id: 'phone', label: 'Mobile phone' }],
    checkedId: selected,
    onchange: (values) => {
      selected = values;
      attrs.checkedId = values;
    },
    oncreateNewOption,
  };
  const component = SearchSelect<string>();
  const vnode = m(SearchSelect<string>, attrs);
  component.oninit?.call(component, vnode);
  const render = () => component.view.call(component, vnode);
  const trigger = findNode(render(), (node) => node.attrs?.onclick && node.attrs?.['aria-haspopup'] === 'listbox');
  assert.ok(trigger);
  trigger.attrs!.onclick(new Event('click', { cancelable: true }));
  const input = () => {
    const node = findNode(render(), (item) => item.tag === 'input' && item.attrs?.className?.includes('search-select-input'));
    assert.ok(node);
    return node;
  };
  return {
    type: (value: string) => input().attrs!.oninput({ target: { value } }),
    key: async (key: string) => {
      const event = new Event('keydown', { cancelable: true });
      Object.defineProperty(event, 'key', { value: key });
      await input().attrs!.onkeydown(event);
      return event;
    },
    selected: () => selected,
  };
};

test('attribute search accepts spaces without selecting the focused option', async () => {
  const select = picker();
  select.type('Mobile');
  await select.key('ArrowDown');
  const space = await select.key(' ');
  assert.equal(space.defaultPrevented, false);
  assert.deepEqual(select.selected(), []);
  select.type('Mobile phone');
  await select.key('ArrowDown');
  await select.key('Enter');
  assert.deepEqual(select.selected(), ['phone']);
});

test('a multiword attribute can be created with Enter', async () => {
  const created: string[] = [];
  const select = picker((label) => {
    created.push(label);
    return { id: 'new-attribute', label };
  });
  select.type('New');
  assert.equal((await select.key(' ')).defaultPrevented, false);
  select.type('New attribute');
  await select.key('ArrowDown');
  await select.key('Enter');
  assert.deepEqual(created, ['New attribute']);
  assert.deepEqual(select.selected(), ['new-attribute']);
});

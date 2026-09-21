import assert from 'node:assert/strict';
import test from 'node:test';
import { openFilePicker } from '../src/utils/file-picker.ts';

test('file picker is attached before opening and removed after selection', () => {
  let appended = false;
  let clickedWhileAttached = false;
  let removed = false;
  let changed = false;
  const input = {
    type: '',
    accept: '',
    hidden: false,
    onchange: null as ((event: Event) => void) | null,
    oncancel: null as (() => void) | null,
    click: () => {
      clickedWhileAttached = appended;
    },
    remove: () => {
      removed = true;
    },
  };
  const ownerDocument = {
    createElement: () => input,
    body: {
      appendChild: () => {
        appended = true;
        return input;
      },
    },
  } as unknown as Document;

  openFilePicker('.json', () => {
    changed = true;
  }, ownerDocument);

  assert.equal(input.type, 'file');
  assert.equal(input.accept, '.json');
  assert.equal(input.hidden, true);
  assert.equal(clickedWhileAttached, true);
  input.onchange?.(new Event('change'));
  assert.equal(changed, true);
  assert.equal(removed, true);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Activity } from '../src/models/data-model.ts';
import {
  activitiesToMarkdown,
  buildActivityOutline,
  numberActivityOutline,
  normalizeActivityHierarchy,
  reconcileActivityMarkdown,
} from '../src/models/activity-outline.ts';

const activity = (id: string, label: string, extra: Partial<Activity> = {}): Activity => ({
  id,
  label,
  cast: [],
  attributes: [],
  transports: [],
  ...extra,
});

test('legacy headers become explicit parent relationships without losing the header', () => {
  const normalized = normalizeActivityHierarchy([
    activity('step-a', 'Step A', { header: true }),
    activity('sub-a', 'Substep A'),
    activity('step-b', 'Step B', { header: true }),
    activity('sub-b', 'Substep B'),
  ]);

  assert.deepEqual(
    normalized.map(({ id, parentId, header }) => ({ id, parentId, header })),
    [
      { id: 'step-a', parentId: undefined, header: true },
      { id: 'sub-a', parentId: 'step-a', header: undefined },
      { id: 'step-b', parentId: undefined, header: true },
      { id: 'sub-b', parentId: 'step-b', header: undefined },
    ]
  );
});

test('explicit hierarchy prevents new top-level steps being captured by legacy headers', () => {
  const normalized = normalizeActivityHierarchy([
    activity('step-a', 'Step A', { header: true }),
    activity('sub-a', 'Substep A', { parentId: 'step-a' }),
    activity('step-b', 'Step B'),
  ]);

  assert.equal(normalized[2].parentId, undefined);
});

test('outline Markdown carries stable IDs and two-level nesting', () => {
  const markdown = activitiesToMarkdown([
    activity('step-a', 'Step A'),
    activity('sub-a', 'Substep A', { parentId: 'step-a' }),
    activity('step-b', 'Step B'),
  ]);

  assert.equal(
    markdown,
    '- Step A <!-- pax:activity-id=step-a -->\n' +
      '  - Substep A <!-- pax:activity-id=sub-a -->\n' +
      '- Step B <!-- pax:activity-id=step-b -->'
  );
  assert.deepEqual(buildActivityOutline(normalizeActivityHierarchy([])), []);
});

test('outline numbering distinguishes steps and substeps', () => {
  const numbers = numberActivityOutline(buildActivityOutline([
    activity('step-a', 'Step A'),
    activity('sub-a', 'Substep A', { parentId: 'step-a' }),
    activity('sub-b', 'Substep B', { parentId: 'step-a' }),
    activity('step-b', 'Step B'),
  ]));

  assert.deepEqual(Object.fromEntries(numbers), {
    'step-a': '1',
    'sub-a': '1.1',
    'sub-b': '1.2',
    'step-b': '2',
  });
});

test('Markdown reconciliation preserves metadata and never infers deletions', () => {
  const existing = [
    activity('step-a', 'Step A', { description: 'Keep me', cast: ['role-a'] }),
    activity('sub-a', 'Substep A', { parentId: 'step-a', attributes: ['attribute-a'] }),
    activity('step-b', 'Step B'),
  ];
  const preview = reconcileActivityMarkdown(
    existing,
    '- Renamed step <!-- pax:activity-id=step-a -->\n  - New child',
    () => 'new-id'
  );

  assert.deepEqual(preview.errors, []);
  assert.equal(preview.added, 1);
  assert.equal(preview.updated, 1);
  assert.equal(preview.preserved, 2);
  assert.equal(preview.activities[0].description, 'Keep me');
  assert.deepEqual(preview.activities[0].cast, ['role-a']);
  assert.equal(preview.activities[1].parentId, 'step-a');
  assert.equal(preview.activities[2].id, 'sub-a');
  assert.deepEqual(preview.activities[2].attributes, ['attribute-a']);
});

test('Markdown reconciliation rejects deeper nesting and orphaned substeps', () => {
  const tooDeep = reconcileActivityMarkdown([], '- Step\n    - Too deep', () => 'new-id');
  const orphan = reconcileActivityMarkdown([], '  - Orphan', () => 'new-id');

  assert.match(tooDeep.errors[0], /more than one level/);
  assert.match(orphan.errors[0], /without a preceding step/);
});

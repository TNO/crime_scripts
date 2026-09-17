import assert from 'node:assert/strict';
import test from 'node:test';
import { createScenesFromOutline } from '../src/models/script-creation.ts';

test('each outlined scene starts with one same-named owned activity group', () => {
  let nextId = 0;
  const scenes = createScenesFromOutline(
    [{ label: 'Preparation' }, { label: 'Transport' }],
    () => `id-${++nextId}`
  );

  assert.deepEqual(
    scenes.map((scene) => ({
      label: scene.label,
      variantLabels: scene.variants.map((variant) => variant.label),
      selectedVariantId: scene.selectedVariantId,
      variantId: scene.variants[0].id,
    })),
    [
      {
        label: 'Preparation',
        variantLabels: ['Preparation'],
        selectedVariantId: 'id-2',
        variantId: 'id-2',
      },
      {
        label: 'Transport',
        variantLabels: ['Transport'],
        selectedVariantId: 'id-4',
        variantId: 'id-4',
      },
    ]
  );
});

test('blank scene rows are optional', () => {
  const scenes = createScenesFromOutline([{ label: '  ' }, {}], () => 'unused');

  assert.deepEqual(scenes, []);
});

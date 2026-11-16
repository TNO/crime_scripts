import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDataModel } from '../src/model-normalization.ts';
import { createSingleScriptExportModel } from '../src/single-script-export.ts';
import { mergeDataModels } from '../src/model-merge.ts';
import { createRestrictedCounterpart } from '../src/script-classification.ts';

test('single-script export includes referenced taxonomy parent chains only', () => {
  const model = normalizeDataModel({
    crimeScripts: [{
      id: 'script',
      scriptFamilyId: 'script',
      classification: 'restricted',
      label: 'Script',
      owner: '',
      updated: 1,
      reviewer: [],
      status: 1,
      literature: [],
      stages: [{
        id: 'scene',
        label: 'Scene',
        variants: [{
          id: 'variant',
          label: 'Route',
          activities: [{
            id: 'activity',
            label: 'Activity',
            description: 'An independently documented event.',
            observableTraces: ['A dated registration', 'An independent audit record'],
            decisionPoint: 'Do both records refer to the same event?',
            cast: ['child'],
            attributes: [],
            transports: [],
          }],
          conditions: [],
          opportunities: [],
          indicators: [],
          measures: [],
        }],
      }],
      productIds: [],
      language: 'en',
      aiGenerated: true,
    }],
    cast: [
      { id: 'grandparent', label: 'Grandparent' },
      { id: 'parent', label: 'Parent', parents: ['grandparent'] },
      { id: 'child', label: 'Child', parents: ['parent'] },
      { id: 'unused', label: 'Unused' },
    ],
  });

  const exported = createSingleScriptExportModel(model.crimeScripts[0], model, 2);

  assert.deepEqual(exported.cast.map(({ id }) => id), ['grandparent', 'parent', 'child']);
  assert.equal(exported.previewMode, true);
  assert.equal(exported.lastUpdate, 2);

  const restored = normalizeDataModel(JSON.parse(JSON.stringify(exported)));
  const merged = mergeDataModels(normalizeDataModel({ crimeScripts: [] }), restored);
  merged.crimeScripts[0].classification = 'public';
  let nextId = 0;
  const copied = createRestrictedCounterpart(merged, merged.crimeScripts[0], () => `copy-${nextId++}`);
  const original = model.crimeScripts[0].stages[0].variants[0].activities[0];
  for (const script of [exported.crimeScripts[0], restored.crimeScripts[0], merged.crimeScripts[0], copied]) {
    const activity = script.stages[0].variants[0].activities[0];
    assert.equal(activity.description, original.description);
    assert.deepEqual(activity.observableTraces, original.observableTraces);
    assert.equal(activity.decisionPoint, original.decisionPoint);
  }
  copied.stages[0].variants[0].activities[0].observableTraces!.push('A local addition');
  assert.equal(original.observableTraces?.length, 2);
});

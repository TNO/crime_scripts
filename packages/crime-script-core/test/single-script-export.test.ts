import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDataModel } from '../src/model-normalization.ts';
import { createSingleScriptExportModel } from '../src/single-script-export.ts';

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
});

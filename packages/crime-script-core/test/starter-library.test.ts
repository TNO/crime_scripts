import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDataModel } from '../src/model-normalization.ts';
import { importStandaloneScript } from '../src/starter-library.ts';

test('standalone import remaps activity parent references after global ID collisions', () => {
  const current = normalizeDataModel({
    crimeScripts: [],
    cast: [{ id: 'parent-activity', label: 'Existing taxonomy collision' }],
  });
  const imported = normalizeDataModel({
    crimeScripts: [{
      id: 'script',
      scriptFamilyId: 'script',
      classification: 'public',
      label: 'Script',
      owner: '',
      updated: 1,
      reviewer: [],
      status: 1,
      literature: [],
      stages: [{
        id: 'stage',
        label: 'Stage',
        selectedVariantId: 'variant',
        variants: [{
          id: 'variant',
          label: 'Variant',
          activities: [
            { id: 'parent-activity', label: 'Parent', type: 0 },
            { id: 'child-activity', label: 'Child', type: 0, parentId: 'parent-activity' },
          ],
          conditions: [],
          opportunities: [],
          indicators: [],
          measures: [],
        }],
      }],
      tracks: [],
      productIds: [],
      geoLocationIds: [],
      language: 'en',
    }],
  });

  const result = importStandaloneScript(current, imported);
  const activities = result.crimeScripts[0].stages[0].variants[0].activities;
  assert.notEqual(activities[0].id, 'parent-activity');
  assert.equal(activities[1].parentId, activities[0].id);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDataModel } from '../src/models/model-normalization.ts';
import { findTaxonomyScriptUsages } from '../src/models/taxonomy-usage.ts';

const model = normalizeDataModel({
  crimeScripts: [{
    id: 'script', label: 'Script', productIds: ['product'], geoLocationIds: ['geo'],
    stages: [{
      id: 'scene', label: 'Scene', variants: [{
        id: 'variant', label: 'Variant', locationIds: ['location'],
        activities: [{ id: 'activity', label: 'Activity', cast: ['role'], attributes: ['attribute'], transports: ['transport'] }],
        measures: [{ id: 'measure', label: 'Measure', partners: ['partner'] }],
      }],
    }],
  }],
});

test('all taxonomy types return navigable script occurrences', () => {
  for (const [taxonomy, id, label] of [
    ['products', 'product', 'Script'],
    ['geoLocations', 'geo', 'Script'],
    ['locations', 'location', 'Variant'],
    ['cast', 'role', 'Activity'],
    ['attributes', 'attribute', 'Activity'],
    ['transports', 'transport', 'Activity'],
    ['partners', 'partner', 'Measure'],
  ] as const) {
    const [usage] = findTaxonomyScriptUsages(model, taxonomy, id);
    assert.equal(usage?.label, label);
    assert.equal(usage?.script.id, 'script');
    assert.equal(usage?.sceneId, label === 'Script' ? undefined : 'scene');
    assert.equal(usage?.variantId, label === 'Script' ? undefined : 'variant');
    assert.equal(usage?.activityId, label === 'Activity' ? 'activity' : undefined);
  }
});

test('usages are limited to scripts visible in the current mode', () => {
  assert.equal(findTaxonomyScriptUsages(model, 'cast', 'role', []).length, 0);
  assert.equal(findTaxonomyScriptUsages(model, 'cast', 'unknown').length, 0);
});

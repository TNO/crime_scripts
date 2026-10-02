import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDataModel } from '../src/models/model-normalization.ts';
import {
  findDanglingTaxonomyReferences,
  findRemovedTaxonomyItems,
  mergeTaxonomyItems,
  repairDanglingTaxonomyReferences,
  removeTaxonomyReferences,
} from '../src/models/taxonomy-references.ts';

const model = () =>
  normalizeDataModel({
    crimeScripts: [
      {
        id: 'script',
        label: 'Script',
        productIds: ['product'],
        geoLocationIds: ['geo'],
        stages: [
          {
            id: 'scene',
            label: 'Scene',
            variants: [
              {
                id: 'variant',
                label: 'Variant',
                locationIds: ['location'],
                activities: [
                  {
                    id: 'activity',
                    label: 'Activity',
                    cast: ['role'],
                    attributes: ['attribute'],
                    transports: ['transport'],
                  },
                ],
                measures: [{ id: 'measure', label: 'Measure', partners: ['partner'] }],
              },
            ],
          },
        ],
      },
    ],
    cast: [{ id: 'role', label: 'Role' }],
    attributes: [{ id: 'attribute', label: 'Attribute' }],
    products: [
      { id: 'product', label: 'Product' },
      { id: 'child-product', label: 'Child product', parents: ['product'] },
    ],
    transports: [{ id: 'transport', label: 'Transport' }],
    locations: [{ id: 'location', label: 'Location' }],
    geoLocations: [{ id: 'geo', label: 'Geo' }],
    partners: [{ id: 'partner', label: 'Partner' }],
  });

test('removing taxonomy items also removes every script and hierarchy reference', () => {
  const before = model();
  const edited = structuredClone(before);
  edited.cast = [];
  edited.attributes = [];
  edited.products = edited.products.filter(({ id }) => id !== 'product');
  edited.transports = [];
  edited.locations = [];
  edited.geoLocations = [];
  edited.partners = [];

  const removed = findRemovedTaxonomyItems(before, edited);
  const cleaned = removeTaxonomyReferences(edited, removed);
  const script = cleaned.crimeScripts[0];
  const variant = script.stages[0].variants[0];
  const activity = variant.activities[0];

  assert.equal(removed.length, 7);
  assert.deepEqual({
    products: script.productIds,
    geoLocations: script.geoLocationIds,
    locations: variant.locationIds,
    cast: activity.cast,
    attributes: activity.attributes,
    transports: activity.transports,
    partners: variant.measures[0].partners,
    productParents: cleaned.products[0].parents,
  }, {
    products: [],
    geoLocations: [],
    locations: [],
    cast: [],
    attributes: [],
    transports: [],
    partners: [],
    productParents: [],
  });
  assert.deepEqual(findDanglingTaxonomyReferences(cleaned), []);
});

test('merging a taxonomy item preserves references across scripts and hierarchy without duplicates', () => {
  const before = model();
  before.cast.push({ id: 'other-role', label: 'Other role', parents: ['role'] });
  before.crimeScripts[0].stages[0].variants[0].activities[0].cast = ['role', 'other-role'];
  const restricted = structuredClone(before.crimeScripts[0]);
  restricted.id = 'restricted';
  restricted.classification = 'restricted';
  restricted.stages[0].variants[0].activities[0].cast = ['role'];
  before.crimeScripts.push(restricted);

  const merged = mergeTaxonomyItems(before, 'cast', 'role', 'other-role');

  assert.deepEqual(merged.cast, [{ id: 'other-role', label: 'Other role', parents: [] }]);
  assert.deepEqual(merged.crimeScripts.map((script) => script.stages[0].variants[0].activities[0].cast),
    [['other-role'], ['other-role']]);
  assert.deepEqual(findDanglingTaxonomyReferences(merged), []);
  assert.equal(before.cast.length, 2);
  assert.deepEqual(before.crimeScripts[0].stages[0].variants[0].activities[0].cast, ['role', 'other-role']);
  assert.throws(() => mergeTaxonomyItems(before, 'cast', 'role', 'role'));
  assert.throws(() => mergeTaxonomyItems(before, 'cast', 'unknown', 'role'));
});

test('merging works for each taxonomy reference surface', () => {
  const paths = [
    ['cast', 'role'],
    ['attributes', 'attribute'],
    ['products', 'product'],
    ['transports', 'transport'],
    ['locations', 'location'],
    ['geoLocations', 'geo'],
    ['partners', 'partner'],
  ] as const;
  for (const [taxonomy, id] of paths) {
    const before = model();
    before[taxonomy].push({ id: 'kept', label: 'Kept' });
    const merged = mergeTaxonomyItems(before, taxonomy, id, 'kept');
    assert.deepEqual(merged[taxonomy].map((item) => item.id).includes(id), false, taxonomy);
    assert.deepEqual(findDanglingTaxonomyReferences(merged), [], taxonomy);
    assert.ok(merged.crimeScripts.some((script) =>
      JSON.stringify(script).includes('"kept"')), taxonomy);
  }
});

test('merging category members never introduces a parent cycle', () => {
  const before = model();
  before.cast.push(
    { id: 'child', label: 'Child', parents: ['role'] },
    { id: 'duplicate', label: 'Duplicate', parents: ['child'] },
  );
  const merged = mergeTaxonomyItems(before, 'cast', 'duplicate', 'role');
  assert.equal(merged.cast.find(({ id }) => id === 'role')?.parents?.includes('child'), false);
});

test('dangling taxonomy references report the item and exact usage location', () => {
  const dangling = model();
  dangling.cast = [];
  dangling.partners = [];

  assert.deepEqual(
    findDanglingTaxonomyReferences(dangling).map(({ taxonomy, itemId, path }) => ({
      taxonomy,
      itemId,
      path,
    })),
    [
      {
        taxonomy: 'cast',
        itemId: 'role',
        path: ['Script', 'Scene', 'Variant', 'Activity'],
      },
      {
        taxonomy: 'partners',
        itemId: 'partner',
        path: ['Script', 'Scene', 'Variant', 'Measure'],
      },
    ]
  );
});

test('dangling taxonomy references are removed automatically without mutating the uploaded model', () => {
  const dangling = model();
  dangling.cast = [];
  dangling.partners = [];

  const repaired = repairDanglingTaxonomyReferences(dangling);

  assert.equal(repaired.removedReferences.length, 2);
  assert.equal(repaired.missingItems.length, 2);
  assert.deepEqual(findDanglingTaxonomyReferences(repaired.model), []);
  assert.deepEqual(repaired.model.crimeScripts[0].stages[0].variants[0].activities[0].cast, []);
  assert.deepEqual(repaired.model.crimeScripts[0].stages[0].variants[0].measures[0].partners, []);
  assert.deepEqual(dangling.crimeScripts[0].stages[0].variants[0].activities[0].cast, ['role']);
  assert.deepEqual(dangling.crimeScripts[0].stages[0].variants[0].measures[0].partners, ['partner']);
});

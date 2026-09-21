import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDataModel } from '../src/models/model-normalization.ts';
import {
  findDanglingTaxonomyReferences,
  findRemovedTaxonomyItems,
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

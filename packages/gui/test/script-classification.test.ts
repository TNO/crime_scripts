import assert from 'node:assert/strict';
import test from 'node:test';
import type { CrimeScript, DataModel } from '../src/models/data-model.ts';
import { normalizeDataModel } from '../src/models/model-normalization.ts';
import { mergeDataModels } from '../src/models/model-merge.ts';
import { importStandaloneScript } from '../src/models/starter-library.ts';
import { createSingleScriptExportModel } from '../src/models/single-script-export.ts';
import {
  canShareModel,
  classificationHeader,
  classifiedExportFilename,
  createRestrictedCounterpart,
  createScriptForMode,
  filterModelForPublicExport,
  hasRestrictedContent,
  scriptsForMode,
  withoutCrimeScript,
} from '../src/models/script-classification.ts';

const model = (): DataModel => normalizeDataModel({
  version: 1,
  lastUpdate: 1,
  crimeScripts: [
    {
      id: 'public-script',
      label: 'Family A public',
      classification: 'public',
      scriptFamilyId: 'family-a',
      productIds: ['product'],
      geoLocationIds: [],
      stages: [{
        id: 'scene',
        label: 'Scene',
        selectedVariantId: 'act',
        variants: [{
          id: 'act',
          label: 'Act',
          activities: [{ id: 'activity', label: 'Do', cast: ['cast'] }],
          conditions: [],
          indicators: [{ id: 'indicator', label: 'Trace' }],
          measures: [],
          opportunities: [],
        }],
      }],
      tracks: [{ id: 'track', label: 'Track', sceneVariants: { scene: 'act' } }],
    },
    {
      id: 'restricted-script',
      label: 'Family A restricted',
      classification: 'restricted',
      scriptFamilyId: 'family-a',
      productIds: ['restricted-product'],
      stages: [],
    },
    {
      id: 'fallback',
      label: 'Family B public',
      classification: 'public',
      scriptFamilyId: 'family-b',
      productIds: [],
      stages: [],
    },
  ],
  cast: [{ id: 'cast', label: 'Actor' }],
  attributes: [],
  locations: [],
  geoLocations: [],
  products: [
    { id: 'product', label: 'Public product' },
    { id: 'restricted-product', label: 'Restricted product' },
  ],
  transports: [],
  partners: [],
});

test('legacy scripts normalize to stable public families', () => {
  const normalized = normalizeDataModel({ crimeScripts: [{ id: 'legacy', label: 'Legacy', stages: [] }] });
  assert.equal(normalized.crimeScripts[0].classification, 'public');
  assert.equal(normalized.crimeScripts[0].scriptFamilyId, 'legacy');
});

test('private assembly can explicitly default legacy scripts to restricted without changing family ids', () => {
  const normalized = normalizeDataModel(
    { crimeScripts: [{ id: 'legacy-private', label: 'Legacy private', stages: [] }] },
    'restricted'
  );
  assert.equal(normalized.crimeScripts[0].classification, 'restricted');
  assert.equal(normalized.crimeScripts[0].scriptFamilyId, 'legacy-private');
});

test('normalization preserves explicit classifications and only defaults absent or invalid values', () => {
  const normalized = normalizeDataModel({
    crimeScripts: [
      { id: 'explicit-public', label: 'Starter', classification: 'public', stages: [] },
      { id: 'explicit-restricted', label: 'Protected', classification: 'restricted', stages: [] },
      { id: 'absent', label: 'Legacy', stages: [] },
      { id: 'invalid', label: 'Invalid', classification: 'confidential', stages: [] },
    ],
  }, 'restricted');
  assert.deepEqual(
    normalized.crimeScripts.map(({ classification }) => classification),
    ['public', 'restricted', 'restricted', 'restricted']
  );
});

test('mode selection prefers one restricted counterpart per family and falls back to public', () => {
  const input = model().crimeScripts;
  assert.deepEqual(scriptsForMode(input, 'public').map(({ id }) => id), ['public-script', 'fallback']);
  assert.deepEqual(scriptsForMode(input, 'restricted').map(({ id }) => id), ['restricted-script', 'fallback']);
});

test('new scripts inherit the active mode and receive a family id', () => {
  const script = createScriptForMode('restricted', 'new-id', 'nl', 42);
  assert.deepEqual(
    { id: script.id, family: script.scriptFamilyId, classification: script.classification, updated: script.updated },
    { id: 'new-id', family: 'new-id', classification: 'restricted', updated: 42 }
  );
});

test('restricted counterpart is a deep copy with remapped owned references and globally unique ids', () => {
  const input = model();
  input.crimeScripts = input.crimeScripts.filter(({ id }) => id !== 'restricted-script');
  input.crimeScripts[0].stages[0].variants[0].activities[0].relatedScriptIds = ['fallback'];
  const supplied = ['public-script', 'cast', 'copy', 'scene-copy', 'act-copy', 'activity-copy', 'indicator-copy', 'track-copy'];
  let index = 0;
  const copy = createRestrictedCounterpart(input, input.crimeScripts[0], () => supplied[index++]);

  assert.equal(copy.classification, 'restricted');
  assert.equal(copy.scriptFamilyId, 'family-a');
  assert.equal(copy.id, 'copy');
  assert.equal(copy.stages[0].selectedVariantId, 'act-copy');
  assert.deepEqual(copy.tracks?.[0].sceneVariants, { 'scene-copy': 'act-copy' });
  assert.deepEqual(
    copy.stages[0].variants[0].activities[0].relatedScriptIds,
    ['fallback']
  );
  assert.notEqual(copy.stages[0], input.crimeScripts[0].stages[0]);

  const owned = [
    copy.id,
    ...copy.stages.flatMap((scene) => [
      scene.id,
      ...scene.variants.flatMap((act) => [
        act.id, ...act.activities.map(({ id }) => id), ...act.indicators.map(({ id }) => id),
      ]),
    ]),
    ...(copy.tracks || []).map(({ id }) => id),
  ];
  assert.equal(new Set(owned).size, owned.length);
  input.crimeScripts.push(copy);
  assert.throws(() => createRestrictedCounterpart(input, input.crimeScripts[0], () => 'unused'), /already exists/i);
});

test('public exports remove restricted scripts and restricted-only taxonomy', () => {
  const input = model();
  input.crimeScripts[0].stages[0].variants[0].activities[0].relatedScriptIds = [
    'restricted-script',
    'fallback',
  ];
  const exported = filterModelForPublicExport(input);
  assert.deepEqual(exported.crimeScripts.map(({ id }) => id), ['public-script', 'fallback']);
  assert.deepEqual(exported.products.map(({ id }) => id), ['product']);
  assert.deepEqual(
    exported.crimeScripts[0].stages[0].variants[0].activities[0].relatedScriptIds,
    ['fallback']
  );
  assert.equal(hasRestrictedContent(exported), false);
});

test('standalone exports remove activity links to scripts outside the export', () => {
  const input = model();
  input.crimeScripts[0].stages[0].variants[0].activities[0].relatedScriptIds = ['fallback'];
  const exported = createSingleScriptExportModel(input.crimeScripts[0], input);
  assert.equal(
    exported.crimeScripts[0].stages[0].variants[0].activities[0].relatedScriptIds,
    undefined
  );
});

test('deleting a script also removes activity links to it', () => {
  const input = model();
  input.crimeScripts[0].stages[0].variants[0].activities[0].relatedScriptIds = [
    'fallback',
    'restricted-script',
  ];
  const result = withoutCrimeScript(input, 'fallback');
  assert.deepEqual(result.crimeScripts.map(({ id }) => id), ['public-script', 'restricted-script']);
  assert.deepEqual(
    result.crimeScripts[0].stages[0].variants[0].activities[0].relatedScriptIds,
    []
  );
  assert.deepEqual(input.crimeScripts.map(({ id }) => id), [
    'public-script',
    'restricted-script',
    'fallback',
  ]);
});

test('standalone import preserves restricted classification and family links', () => {
  const current = normalizeDataModel({ crimeScripts: [] });
  const imported = model();
  imported.crimeScripts = [imported.crimeScripts[1]];
  const result = importStandaloneScript(current, imported);
  assert.equal(result.crimeScripts[0].classification, 'restricted');
  assert.equal(result.crimeScripts[0].scriptFamilyId, 'family-a');
});

test('preview merge remaps colliding script-owned ids while preserving family metadata', () => {
  const current = model();
  const imported = model();
  imported.crimeScripts = [{
    ...structuredClone(imported.crimeScripts[1]),
    id: 'public-script',
    stages: [{
      id: 'scene',
      label: 'Restricted scene',
      selectedVariantId: 'act',
      variants: [{
        id: 'act',
        label: 'Restricted act',
        activities: [],
        conditions: [],
        indicators: [],
        measures: [],
        opportunities: [],
      }],
    }],
  }];
  const merged = mergeDataModels(current, imported);
  const added = merged.crimeScripts.at(-1)!;
  assert.notEqual(added.id, 'public-script');
  assert.notEqual(added.stages[0].id, 'scene');
  assert.notEqual(added.stages[0].variants[0].id, 'act');
  assert.equal(added.stages[0].selectedVariantId, added.stages[0].variants[0].id);
  assert.equal(added.classification, 'restricted');
  assert.equal(added.scriptFamilyId, 'family-a-imported');
});

test('preview merge repairs duplicate legacy owned ids before adding imported content', () => {
  const legacy = normalizeDataModel({
    crimeScripts: [
      { id: 'one', label: 'One', stages: [{ id: 'scene-one', label: 'One', variants: [{
        id: 'shared', label: 'Shared', activities: [], conditions: [], indicators: [], measures: [], opportunities: [],
      }] }] },
      { id: 'two', label: 'Two', stages: [{ id: 'scene-two', label: 'Two', variants: [{
        id: 'shared', label: 'Shared', activities: [], conditions: [], indicators: [], measures: [], opportunities: [],
      }] }] },
    ],
  });
  const imported = normalizeDataModel({
    crimeScripts: [{ id: 'three', label: 'Three', stages: [] }],
  });
  const merged = mergeDataModels(legacy, imported);
  const variantIds = merged.crimeScripts.flatMap((script) =>
    script.stages.flatMap((scene) => scene.variants.map(({ id }) => id))
  );
  assert.equal(new Set(variantIds).size, variantIds.length);
});

test('an imported family derived from a colliding script id is remapped instead of pairing accidentally', () => {
  const current = model();
  const imported = model();
  imported.crimeScripts = [{
    ...structuredClone(imported.crimeScripts[1]),
    id: 'public-script',
    scriptFamilyId: 'public-script',
  }];
  const added = mergeDataModels(current, imported).crimeScripts.at(-1)!;
  assert.notEqual(added.id, 'public-script');
  assert.equal(added.scriptFamilyId, added.id);
});

test('merge remaps a colliding imported family once for all of its counterparts', () => {
  const current = model();
  const imported = model();
  imported.crimeScripts = [
    { ...structuredClone(imported.crimeScripts[0]), id: 'imported-public', scriptFamilyId: 'family-a' },
    { ...structuredClone(imported.crimeScripts[1]), id: 'imported-restricted', scriptFamilyId: 'family-a' },
  ];
  const merged = mergeDataModels(current, imported);
  const importedPair = merged.crimeScripts.filter(({ id }) =>
    id === 'imported-public' || id === 'imported-restricted'
  );
  assert.equal(importedPair.length, 2);
  assert.equal(importedPair[0].scriptFamilyId, importedPair[1].scriptFamilyId);
  assert.notEqual(importedPair[0].scriptFamilyId, 'family-a');
  assert.deepEqual(
    scriptsForMode(importedPair, 'restricted').map(({ id }) => id),
    ['imported-restricted']
  );
});

test('restricted safeguards classify names, Word headers, and sharing policy', () => {
  const input = model();
  const restricted = input.crimeScripts[1];
  assert.equal(classifiedExportFilename('Case name', restricted.classification, 'json'), 'Case_name_RESTRICTED.json');
  assert.equal(classificationHeader(restricted.classification), 'Classification: **RESTRICTED**');
  assert.equal(hasRestrictedContent(input), true);
  assert.equal(hasRestrictedContent(restricted), true);
  assert.equal(canShareModel(input), false);
  assert.equal(canShareModel(filterModelForPublicExport(input)), true);
});

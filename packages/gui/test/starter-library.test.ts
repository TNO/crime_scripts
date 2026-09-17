import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { DataModel } from '../src/models/data-model.ts';
import {
  collectStarterSuggestions,
  copySuggestion,
  detachStarterScript,
  hasCloseDuplicate,
  importStarterBundle,
  saveAsNewSuggestion,
  suggestionKey,
  validateStarterBundle,
} from '../src/models/starter-library.ts';
import { normalizeDataModel } from '../src/models/model-normalization.ts';

const bundle = (): DataModel =>
  normalizeDataModel({
    schemaVersion: 3,
    version: 1,
    lastUpdate: 1,
    starterBundle: {
      id: 'pax-nl',
      version: '1.0.0',
      locale: 'nl',
      title: 'Nederlandse starterbibliotheek',
      publishedAt: '2026-09-17',
    },
    crimeScripts: [{
      id: 'starter-script',
      label: 'Voorbeeld',
      language: 'nl',
      owner: '',
      updated: 1,
      reviewer: [],
      status: 1,
      literature: [{ id: 'source', label: 'Bron', usedFor: 'Structuur' }],
      stages: [{
        id: 'scene',
        label: 'Scène',
        variants: [{
          id: 'act',
          label: 'Handeling',
          activities: [],
          conditions: [],
          opportunities: [],
          indicators: [{ id: 'indicator', label: 'Ongewone betaling' }],
          measures: [{ id: 'measure', label: 'Controleer betaling', cat: 'other', partners: ['partner'] }],
        }],
      }],
      productIds: [],
    }],
    cast: [],
    attributes: [],
    locations: [],
    geoLocations: [],
    products: [],
    transports: [],
    partners: [{ id: 'partner', label: 'Politie' }],
  });

test('starter bundles are structurally validated including references', () => {
  assert.equal(validateStarterBundle(bundle()).starterBundle?.locale, 'nl');
  const invalid = bundle();
  invalid.crimeScripts[0].stages[0].variants[0].measures[0].partners = ['missing'];
  assert.throws(() => validateStarterBundle(invalid), /missing partner/);
});

test('the deployed Dutch starter fixture is valid and intentionally content-free', () => {
  const fixture = validateStarterBundle(JSON.parse(readFileSync('public/starter-bundles/nl.json', 'utf8')));
  assert.equal(fixture.starterBundle?.locale, 'nl');
  assert.equal(fixture.crimeScripts.length, 0);
});

test('schema-2 models gain schema-3 defaults without losing content', () => {
  const normalized = normalizeDataModel({
    schemaVersion: 2,
    crimeScripts: [{
      id: 'script',
      label: 'Legacy',
      literature: [{ id: 'source', label: 'Bron' }],
      stages: [],
      productIds: [],
    }],
  });
  assert.equal(normalized.schemaVersion, 3);
  assert.equal(normalized.crimeScripts[0].language, 'nl');
  assert.equal(normalized.crimeScripts[0].aiGenerated, false);
  assert.equal(normalized.crimeScripts[0].literature[0].usedFor, undefined);
});

test('imports skip conflicts by default and support replace and copy', () => {
  const current = normalizeDataModel({
    crimeScripts: [{ ...bundle().crimeScripts[0], label: 'Lokale wijziging' }],
  });
  assert.equal(importStarterBundle(current, bundle()).crimeScripts[0].label, 'Lokale wijziging');
  assert.equal(importStarterBundle(current, bundle(), { 'starter-script': 'replace' }).crimeScripts[0].label, 'Voorbeeld');
  const copied = importStarterBundle(current, bundle(), { 'starter-script': 'copy' });
  assert.equal(copied.crimeScripts.length, 2);
  assert.notEqual(copied.crimeScripts[0].id, copied.crimeScripts[1].id);
  assert.notEqual(copied.crimeScripts[0].stages[0].id, copied.crimeScripts[1].stages[0].id);
  assert.notEqual(copied.crimeScripts[0].stages[0].variants[0].id, copied.crimeScripts[1].stages[0].variants[0].id);
});

test('suggestions are language-filtered originals and copied with internal metadata', () => {
  const model = bundle();
  const suggestions = collectStarterSuggestions(model, model, 'indicator', 'nl');
  assert.deepEqual(suggestions.map(({ label }) => label), ['Ongewone betaling']);
  const copied = copySuggestion(suggestions[0]);
  assert.notEqual(copied.id, suggestions[0].id);
  assert.equal(copied.derivedFrom?.itemId, 'indicator');
  const independent = saveAsNewSuggestion(copied);
  assert.equal(independent.derivedFrom, undefined);
  assert.equal(independent.inheritedSources?.[0].usedFor, 'Structuur');
  assert.equal(collectStarterSuggestions(model, model, 'indicator', 'en').length, 0);
  assert.equal(hasCloseDuplicate('Ongewone betalingen', suggestions), true);
});

test('taxonomy id conflicts are remapped without changing imported meaning', () => {
  const current = normalizeDataModel({
    crimeScripts: [],
    products: [{ id: 'shared-id', label: 'Lokaal product' }],
  });
  const starter = bundle();
  starter.products = [{ id: 'shared-id', label: 'Starterproduct' }];
  starter.crimeScripts[0].productIds = ['shared-id'];

  const imported = importStarterBundle(current, starter);
  const importedProductId = imported.crimeScripts[0].productIds[0];
  assert.notEqual(importedProductId, 'shared-id');
  assert.equal(imported.products.find(({ id }) => id === importedProductId)?.label, 'Starterproduct');
});

test('local and bundle suggestions retain distinct origins and selector keys', () => {
  const workspace = bundle();
  workspace.crimeScripts[0].starterOrigin = undefined;
  workspace.crimeScripts[0].stages[0].variants[0].indicators[0].label = 'Lokale wijziging';
  const suggestions = collectStarterSuggestions(workspace, bundle(), 'indicator', 'nl');

  assert.equal(suggestions.length, 2);
  assert.equal(suggestions.find(({ label }) => label === 'Lokale wijziging')?.suggestionOrigin.bundleId, 'workspace');
  assert.equal(new Set(suggestions.map(suggestionKey)).size, 2);
});

test('hierarchy parent references must resolve within their taxonomy', () => {
  const invalid = bundle();
  invalid.products = [{ id: 'product', label: 'Product', parents: ['missing'] }];
  assert.throws(() => validateStarterBundle(invalid), /missing product parent/);
});

test('detaching a starter script changes id and only clears starter origin', () => {
  const script = { ...bundle().crimeScripts[0], aiGenerated: true, unreviewed: true, starterOrigin: { bundleId: 'pax-nl', bundleVersion: '1.0.0', scriptId: 'starter-script' } };
  const detached = detachStarterScript(script);
  assert.notEqual(detached.id, script.id);
  assert.equal(detached.starterOrigin, undefined);
  assert.equal(detached.aiGenerated, true);
  assert.equal(detached.literature.length, 1);
});

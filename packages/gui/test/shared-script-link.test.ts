import assert from 'node:assert/strict';
import test from 'node:test';
import { strToU8, zipSync } from 'fflate';
import { normalizeDataModel } from '../src/models/model-normalization.ts';
import { createSingleScriptExportModel } from '../src/models/single-script-export.ts';
import { filterModelForPublicExport } from '../src/models/script-classification.ts';
import {
  decodeSharedScript,
  encodeSharedScript,
  sharedScriptPayloadFromHash,
} from '../src/models/shared-script-link.ts';

const input = () => normalizeDataModel({
  crimeScripts: [
    {
      id: 'public-id',
      label: 'Mödel / publiek',
      classification: 'public',
      stages: [{
        id: 'scene',
        label: 'Scene',
        variants: [{
          id: 'act',
          label: 'Act',
          activities: [{
            id: 'activity',
            label: 'Activity',
            cast: ['public-cast'],
            relatedScriptIds: ['restricted-id'],
          }],
          conditions: [],
          opportunities: [],
          indicators: [],
          measures: [],
        }],
      }],
      productIds: ['public-product'],
    },
    {
      id: 'restricted-id',
      label: 'Private information',
      classification: 'restricted',
      stages: [],
      productIds: ['restricted-product'],
    },
  ],
  cast: [
    { id: 'public-cast', label: 'Public actor' },
    { id: 'private-cast', label: 'Private actor' },
  ],
  products: [
    { id: 'public-product', label: 'Public product' },
    { id: 'restricted-product', label: 'Private product' },
  ],
});

test('shared link contains the standalone public JSON export, without other scripts or taxonomy', () => {
  const model = input();
  const encoded = encodeSharedScript(model.crimeScripts[0], model);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);

  const shared = decodeSharedScript(encoded);
  const expected = createSingleScriptExportModel(
    model.crimeScripts[0],
    filterModelForPublicExport(model),
    shared.lastUpdate
  );
  assert.deepEqual(JSON.parse(JSON.stringify(shared)), JSON.parse(JSON.stringify(expected)));
  assert.equal(shared.crimeScripts[0].stages[0].variants[0].activities[0].relatedScriptIds, undefined);
  assert.equal(JSON.stringify(shared).includes('Private'), false);
});

test('restricted scripts cannot be linked, even from a mixed model', () => {
  const model = input();
  assert.throws(() => encodeSharedScript(model.crimeScripts[1], model), /Restricted scripts/);
});

test('shared-link query is read from the hashbang route, not the document query', () => {
  assert.equal(sharedScriptPayloadFromHash('#!/nl/crime-script?id=public-id&shared=a-b_9'), 'a-b_9');
  assert.equal(sharedScriptPayloadFromHash('#!/nl/crime-script?id=public-id'), null);
});

test('malformed and restricted shared archives are rejected', () => {
  for (const payload of ['', 'not+safe', 'x'.repeat(150_001), 'abc']) {
    assert.throws(() => decodeSharedScript(payload));
  }
  const archive = (value: unknown) => Buffer.from(
    zipSync({ 'script.json': strToU8(JSON.stringify(value)) })
  ).toString('base64url');
  assert.throws(() => decodeSharedScript(archive(null)), /public crime script|Cannot/);
  assert.throws(() => decodeSharedScript(archive(input())), /public crime script/);
  assert.throws(() => decodeSharedScript(archive({
    ...input(),
    crimeScripts: [input().crimeScripts[1]],
  })), /public crime script/);
});

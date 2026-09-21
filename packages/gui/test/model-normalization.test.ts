import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mergeDataModels } from '../src/models/model-merge.ts';
import { normalizeDataModel, normalizeUploadedDataModel } from '../src/models/model-normalization.ts';

const legacyModel = {
  version: 30,
  lastUpdate: 1,
  crimeScripts: [
    {
      id: 'script-1',
      label: 'First script',
      stages: [{ id: 'scene-1', label: 'Scene', ids: ['shared-act'], actId: 'shared-act' }],
      tracks: [{ id: 'track-1', label: 'Track', sceneVariants: { 'scene-1': 'shared-act' } }],
    },
    {
      id: 'script-2',
      label: 'Second script',
      stages: [{ id: 'scene-2', label: 'Scene', ids: ['shared-act'], actId: 'shared-act' }],
    },
  ],
  acts: [
    {
      id: 'shared-act',
      label: 'Shared act',
      isGeneric: true,
      activities: [],
      conditions: [],
      indicators: [],
      measures: [],
      opportunities: [],
    },
    {
      id: 'orphan-act',
      label: 'Orphan act',
      activities: [],
      conditions: [],
      indicators: [],
      measures: [],
      opportunities: [],
    },
  ],
  cast: [],
  attributes: [],
  locations: [],
  geoLocations: [],
  products: [],
  transports: [],
  partners: [],
};

test('legacy acts become independently owned scene variants without changing track ids', () => {
  const normalized = normalizeDataModel(legacyModel);
  const firstVariant = normalized.crimeScripts[0].stages[0].variants[0];
  const secondVariant = normalized.crimeScripts[1].stages[0].variants[0];

  assert.deepEqual(
    {
      schemaVersion: normalized.schemaVersion,
      firstVariantId: firstVariant.id,
      secondVariantId: secondVariant.id,
      selectedVariantId: normalized.crimeScripts[0].stages[0].selectedVariantId,
      trackVariantId: normalized.crimeScripts[0].tracks?.[0].sceneVariants['scene-1'],
      hasGlobalActs: 'acts' in normalized,
    },
    {
      schemaVersion: 3,
      firstVariantId: 'shared-act',
      secondVariantId: 'shared-act',
      selectedVariantId: 'shared-act',
      trackVariantId: 'shared-act',
      hasGlobalActs: false,
    }
  );

  firstVariant.label = 'Changed in first script';
  assert.equal(secondVariant.label, 'Shared act');
});

test('missing legacy act references are reported instead of discarded', () => {
  const invalidModel = structuredClone(legacyModel);
  invalidModel.crimeScripts[0].stages[0].ids.push('missing-act');

  assert.throws(() => normalizeDataModel(invalidModel), /missing-act.*First script.*Scene/);
});

test('uploaded legacy models recover stale selected acts without borrowing unrelated content', () => {
  const uploadedModel = {
    ...structuredClone(legacyModel),
    crimeScripts: [
      {
        id: 'recoverable-script',
        label: 'Recoverable script',
        stages: [
          { id: 'context-scene', label: 'Context', ids: ['context-act'], actId: 'context-act' },
          { id: 'recovered-scene', label: 'Recovered', ids: ['missing-recovered'], actId: 'missing-recovered' },
        ],
      },
      {
        id: 'placeholder-script',
        label: 'Placeholder script',
        stages: [
          {
            id: 'placeholder-scene',
            label: 'Unrelated',
            ids: ['missing-placeholder'],
            actId: 'missing-placeholder',
          },
        ],
      },
    ],
    acts: [
      {
        id: 'context-act',
        label: 'Context',
        activities: [{ id: 'context-activity', label: 'Context', cast: ['shared-cast'] }],
      },
      {
        id: 'orphan-recovered',
        label: 'Recovered',
        activities: [{ id: 'recovered-activity', label: 'Recovered content', cast: ['shared-cast'] }],
      },
      {
        id: 'orphan-unrelated',
        label: 'Unrelated',
        activities: [{ id: 'unrelated-activity', label: 'Wrong content', cast: ['other-cast'] }],
      },
    ],
  };

  const { model, repairs } = normalizeUploadedDataModel(uploadedModel);
  const recovered = model.crimeScripts[0].stages[1].variants[0];
  const placeholder = model.crimeScripts[1].stages[0].variants[0];

  assert.deepEqual(
    {
      recoveredId: recovered.id,
      recoveredActivity: recovered.activities[0]?.label,
      placeholderId: placeholder.id,
      placeholderActivities: placeholder.activities,
      repairs: repairs.map(({ actId, kind }) => ({ actId, kind })),
    },
    {
      recoveredId: 'missing-recovered',
      recoveredActivity: 'Recovered content',
      placeholderId: 'missing-placeholder',
      placeholderActivities: [],
      repairs: [
        { actId: 'missing-recovered', kind: 'relinked' },
        { actId: 'missing-placeholder', kind: 'placeholder' },
      ],
    }
  );
});

test('v48 defaults every script except the oil-pipeline script to restricted', () => {
  const v48Model = {
    ...structuredClone(legacyModel),
    version: 48,
    crimeScripts: [
      {
        id: 'id060ecbd5',
        label: 'Diefstal van geraffineerde olieproducten via illegale pijplijnaftapping',
        stages: [],
      },
      { id: 'other-script', label: 'Operational script', stages: [] },
      { id: 'classified-script', label: 'Explicit classification', classification: 'public', stages: [] },
    ],
  };

  const normalized = normalizeDataModel(v48Model);

  assert.deepEqual(
    normalized.crimeScripts.map(({ classification }) => classification),
    ['public', 'restricted', 'public']
  );
});

test('older scenes that used an act id as their scene id receive a distinct id and keep track selections', () => {
  const olderModel = structuredClone(legacyModel);
  olderModel.crimeScripts = [
    {
      id: 'script-1',
      label: 'First script',
      stages: [{ id: 'shared-act', label: 'Legacy scene', ids: ['shared-act'], actId: 'shared-act' }],
      tracks: [{ id: 'track-1', label: 'Track', sceneVariants: { 'shared-act': 'shared-act' } }],
    },
  ];

  const normalized = normalizeDataModel(olderModel);
  const scene = normalized.crimeScripts[0].stages[0];

  assert.deepEqual(
    {
      sceneIdIsDistinct: scene.id !== scene.variants[0].id,
      selectedVariantId: scene.selectedVariantId,
      trackSelection: normalized.crimeScripts[0].tracks?.[0].sceneVariants[scene.id],
      oldTrackKeyRemoved: normalized.crimeScripts[0].tracks?.[0].sceneVariants['shared-act'] === undefined,
      sceneIsGeneric: scene.isGeneric,
      variantHasLegacyFlag: Object.prototype.hasOwnProperty.call(scene.variants[0], 'isGeneric'),
    },
    {
      sceneIdIsDistinct: true,
      selectedVariantId: 'shared-act',
      trackSelection: 'shared-act',
      oldTrackKeyRemoved: true,
      sceneIsGeneric: true,
      variantHasLegacyFlag: false,
    }
  );
});

test('preview merging remaps embedded variant references to retained taxonomy ids', () => {
  const main = normalizeDataModel({
    ...legacyModel,
    crimeScripts: [],
    acts: [],
    cast: [{ id: 'main-cast', label: 'Driver' }],
    attributes: [{ id: 'main-attribute', label: 'Van' }],
    locations: [{ id: 'main-location', label: 'Depot' }],
    transports: [{ id: 'main-transport', label: 'Truck' }],
    partners: [{ id: 'main-partner', label: 'Police' }],
    products: [{ id: 'main-product', label: 'Fuel' }],
    geoLocations: [{ id: 'main-geo', label: 'Region' }],
  });
  const preview = normalizeDataModel({
    ...legacyModel,
    previewMode: true,
    crimeScripts: [
      {
        id: 'preview-script',
        label: 'Imported script',
        productIds: ['preview-product'],
        geoLocationIds: ['preview-geo'],
        stages: [
          {
            id: 'preview-scene',
            label: 'Scene',
            variants: [
              {
                id: 'preview-act',
                label: 'Act',
                locationIds: ['preview-location'],
                activities: [
                  {
                    id: 'activity',
                    label: 'Drive',
                    cast: ['preview-cast'],
                    attributes: ['preview-attribute'],
                    transports: ['preview-transport'],
                  },
                ],
                conditions: [],
                indicators: [],
                opportunities: [],
                measures: [{ id: 'measure', label: 'Stop', cat: 'other', partners: ['preview-partner'] }],
              },
            ],
          },
        ],
      },
    ],
    acts: [],
    cast: [{ id: 'preview-cast', label: 'Driver' }],
    attributes: [{ id: 'preview-attribute', label: 'Van' }],
    locations: [{ id: 'preview-location', label: 'Depot' }],
    transports: [{ id: 'preview-transport', label: 'Truck' }],
    partners: [{ id: 'preview-partner', label: 'Police' }],
    products: [{ id: 'preview-product', label: 'Fuel' }],
    geoLocations: [{ id: 'preview-geo', label: 'Region' }],
  });

  const merged = mergeDataModels(main, preview);
  const script = merged.crimeScripts[0];
  const act = script.stages[0].variants[0];

  assert.deepEqual(
    {
      products: script.productIds,
      geoLocations: script.geoLocationIds,
      locations: act.locationIds,
      cast: act.activities[0].cast,
      attributes: act.activities[0].attributes,
      transports: act.activities[0].transports,
      partners: act.measures[0].partners,
    },
    {
      products: ['main-product'],
      geoLocations: ['main-geo'],
      locations: ['main-location'],
      cast: ['main-cast'],
      attributes: ['main-attribute'],
      transports: ['main-transport'],
      partners: ['main-partner'],
    }
  );
});

const legacyModelPath = process.env.PAX_LEGACY_MODEL;
test('the supplied v30 model preserves every referenced variant and track selection', { skip: !legacyModelPath }, () => {
  const normalized = normalizeDataModel(JSON.parse(readFileSync(legacyModelPath!, 'utf8')));
  const variants = normalized.crimeScripts.flatMap((script) => script.stages.flatMap((scene) => scene.variants));
  const variantIds = new Set(variants.map((variant) => variant.id));
  const trackVariantIds = normalized.crimeScripts.flatMap((script) =>
    (script.tracks || []).flatMap((track) => Object.values(track.sceneVariants))
  );

  assert.deepEqual(
    {
      schemaVersion: normalized.schemaVersion,
      scripts: normalized.crimeScripts.length,
      scenes: normalized.crimeScripts.reduce((count, script) => count + script.stages.length, 0),
      variants: variants.length,
      trackReferences: trackVariantIds.length,
      unresolvedTrackReferences: trackVariantIds.filter((id) => id && !variantIds.has(id)),
      hasGlobalActs: 'acts' in normalized,
    },
    {
      schemaVersion: 3,
      scripts: 7,
      scenes: 39,
      variants: 46,
      trackReferences: 20,
      unresolvedTrackReferences: [],
      hasGlobalActs: false,
    }
  );
});

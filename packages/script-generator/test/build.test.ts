import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDataModel } from '@crime-script/core/model-normalization';
import type { ConditionType } from '@crime-script/core/data-model';
import { buildStandaloneCandidate } from '../src/build.ts';
import type { CandidateFile, EvidenceFile, GeneratorBrief } from '../src/types.ts';
import { validateCandidate } from '../src/validation.ts';

const brief: GeneratorBrief = {
  schemaVersion: 1,
  bundlePath: 'bundle.json',
  scriptId: 'generated:nl:script:test',
  subject: 'Test',
  purpose: 'Defensive analysis',
  geography: 'Netherlands',
  contentLanguage: 'nl',
  classification: 'restricted',
  sourceSensitivity: 'restricted',
  detail: 'practical',
  scriptIcon: 'builtin:document-check',
};

const candidate = (): CandidateFile => ({
  schemaVersion: 1,
  script: {
    label: 'Controle van documenten',
    description: 'Een defensief procesmodel voor het herkennen en onderzoeken van documentmisbruik.',
    geoLocationKeys: ['nl'],
    stages: [{
      key: 'intake',
      label: 'Document ontvangen',
      description: 'Een organisatie ontvangt een document en bepaalt welke eerste controle nodig is.',
      variants: [{
        key: 'main',
        label: 'Document ontvangen en vergelijken',
        locationKeys: ['office'],
        activities: [{
          key: 'receive',
          event: 'Een medewerker ontvangt een document',
          observableTraces: ['het oorspronkelijke bestand en de ontvangstdatum'],
          decisionPoint: 'bepalen of een verdiepende controle nodig is',
          castKeys: ['employee'],
          attributeKeys: ['document'],
        }],
        indicators: [{
          key: 'mismatch',
          observation: 'Gegevens in het document spreken een onafhankelijke registratie tegen',
          corroboration: ['vergelijk met de authentieke registratie'],
          alternativeExplanations: ['een invoerfout of verouderde registratie'],
          relevance: 'een bevestigde discrepantie rechtvaardigt verdiepende controle',
        }],
        measures: [{
          key: 'verify',
          label: 'Verifieer bij de bronhouder',
          category: 'Detectie',
          partnerKeys: ['authority'],
          decisionMoment: 'wanneer de eerste controle een materiële discrepantie toont',
          intendedEffect: 'voorkomen dat een onbevestigd document als authentiek wordt behandeld',
        }],
        conditions: [{
          key: 'access',
          label: 'Toegang tot een authentieke registratie',
          type: 'Prerequisite' as ConditionType,
        }],
      }],
    }],
  },
  taxonomies: {
    cast: [{ key: 'employee', label: 'Medewerker' }],
    attributes: [{ key: 'document', label: 'Document' }],
    products: [],
    transports: [],
    locations: [{ key: 'office', label: 'Kantoor' }],
    geoLocations: [{ key: 'nl', id: 'geo-nl', label: 'Nederland' }],
    partners: [{ key: 'authority', label: 'Bronhouder' }],
  },
  safetyReview: {
    containsStepByStepInstructions: false,
    containsExploitableParameters: false,
    containsEvasionTactics: false,
    notes: 'The script contains only defensive verification activity.',
  },
});

const evidence = (): EvidenceFile => ({
  schemaVersion: 1,
  sources: [{
    key: 'official',
    title: 'Official verification guidance',
    kind: 'web',
    state: 'valid',
    url: 'https://example.test/guidance',
    publisher: 'Example authority',
    accessedAt: '2026-09-23',
    contentHash: 'a'.repeat(64),
    reliability: 'Primary official guidance.',
    passages: [{ text: 'Verify material discrepancies with the authoritative register.' }],
  }],
  claims: [
    { nodeKey: 'intake', sourceKeys: ['official'] },
    { nodeKey: 'receive', sourceKeys: ['official'] },
    { nodeKey: 'mismatch', sourceKeys: ['official'] },
    { nodeKey: 'verify', sourceKeys: ['official'] },
  ],
});

test('build creates a standalone first draft and reuses exact taxonomy', () => {
  const bundle = normalizeDataModel({
    version: 4,
    crimeScripts: [],
    cast: [{ id: 'existing-employee', label: 'Medewerker' }],
    geoLocations: [{ id: 'geo-nl', label: 'Nederland' }],
  });
  const result = buildStandaloneCandidate(bundle, brief, candidate(), evidence(), true, 123);
  const script = result.model.crimeScripts[0];

  assert.equal(result.model.previewMode, true);
  assert.equal(script.id, brief.scriptId);
  assert.equal(script.status, 1);
  assert.equal(script.aiGenerated, true);
  assert.equal(script.unreviewed, true);
  assert.deepEqual(script.reviewer, []);
  assert.equal('icon' in script.stages[0], false);
  assert.deepEqual(result.model.cast.map(({ id }) => id), ['existing-employee']);
  assert.equal(script.stages[0].variants[0].activities[0].cast?.[0], 'existing-employee');
  assert.equal(script.literature[0].url, 'https://example.test/guidance');
  assert.match(script.stages[0].variants[0].indicators[0].description || '', /Consider alternatives/);
  assert.match(script.stages[0].variants[0].measures[0].description || '', /Decision moment/);
});

test('build blocks missing evidence for a factual node', () => {
  const incomplete = evidence();
  incomplete.claims = incomplete.claims.filter(({ nodeKey }) => nodeKey !== 'mismatch');
  assert.throws(
    () => buildStandaloneCandidate(normalizeDataModel({ crimeScripts: [] }), brief, candidate(), incomplete, true),
    (error: unknown) => error instanceof Error && error.message.includes('mismatch')
  );
});

test('build rejects generic modus-operandi labels', () => {
  const generic = candidate();
  generic.script.stages[0].variants[0].label = '“Hoofdroute.”';

  assert.throws(
    () => validateCandidate(generic),
    /must describe the modus operandi/
  );

  const repeatedActivity = candidate();
  repeatedActivity.script.stages[0].variants[0].label = 'Een medewerker ontvangt een document';
  assert.throws(
    () => validateCandidate(repeatedActivity),
    /instead of repeating the first activity label/
  );
});

test('build rejects activity descriptions that repeat the activity label', () => {
  const repetitive = candidate();
  repetitive.script.stages[0].variants[0].activities[0].observableTraces = [
    '“Een medewerker ontvangt een document” wordt in het dossier vastgelegd',
  ];

  assert.throws(
    () => buildStandaloneCandidate(
      normalizeDataModel({ crimeScripts: [], geoLocations: [{ id: 'geo-nl', label: 'Nederland' }] }),
      brief,
      repetitive,
      evidence(),
      true
    ),
    /must add information instead of repeating its activity label/
  );
});

test('build rejects unknown script icons and incomplete research', () => {
  assert.throws(
    () => buildStandaloneCandidate(
      normalizeDataModel({ crimeScripts: [] }),
      { ...brief, scriptIcon: 'builtin:not-real' },
      candidate(),
      evidence(),
      true
    ),
    /not in the built-in catalogue/
  );
  assert.throws(
    () => buildStandaloneCandidate(normalizeDataModel({ crimeScripts: [] }), brief, candidate(), evidence(), false),
    /research must be completed/i
  );
});

test('updates preserve owned IDs and require explicit classification and deletion confirmations', () => {
  const initial = buildStandaloneCandidate(
    normalizeDataModel({ crimeScripts: [], geoLocations: [{ id: 'geo-nl', label: 'Nederland' }] }),
    brief,
    candidate(),
    evidence(),
    true,
    123
  );
  const existing = initial.model.crimeScripts[0];
  const updateBundle = structuredClone(initial.model);
  updateBundle.crimeScripts[0].literature.push({
    id: 'legacy-literature',
    label: 'Existing analyst source',
    description: 'Existing literature must survive an unrelated update.',
  });
  const stage = existing.stages[0];
  const variant = stage.variants[0];
  const updateBrief: GeneratorBrief = {
    ...brief,
    existingScriptId: brief.scriptId,
    classification: 'public',
  };
  const update = candidate();
  update.script.stages[0].existingId = stage.id;
  update.script.stages[0].variants[0].existingId = variant.id;
  update.script.stages[0].variants[0].activities[0].existingId = variant.activities[0].id;
  update.script.stages[0].variants[0].indicators![0].existingId = variant.indicators[0].id;
  update.script.stages[0].variants[0].measures![0].existingId = variant.measures[0].id;
  update.script.stages[0].variants[0].conditions![0].existingId = variant.conditions[0].id;

  assert.throws(
    () => buildStandaloneCandidate(updateBundle, updateBrief, update, evidence(), true),
    /classification/i
  );
  const classified = buildStandaloneCandidate(
    updateBundle,
    updateBrief,
    update,
    evidence(),
    true,
    456,
    { allowClassificationChange: true }
  );
  assert.equal(classified.model.crimeScripts[0].stages[0].id, stage.id);
  assert.equal(classified.model.crimeScripts[0].stages[0].variants[0].activities[0].id, variant.activities[0].id);
  assert.ok(classified.model.crimeScripts[0].literature.some(({ id }) => id === 'legacy-literature'));
  const changedSource = evidence();
  changedSource.sources[0].title = 'Corrected official source title';
  changedSource.sources[0].url = 'https://example.test/corrected-source';
  const sourceMetadataUpdate = buildStandaloneCandidate(
    updateBundle,
    { ...updateBrief, classification: 'restricted' },
    update,
    changedSource,
    true,
    457,
    { allowClassificationChange: true }
  );
  assert.equal(
    sourceMetadataUpdate.sourceKeyToLiteratureId.official,
    existing.literature[0].id
  );
  assert.equal(
    sourceMetadataUpdate.model.crimeScripts[0].literature.filter(
      ({ id }) => id.startsWith(`${updateBrief.scriptId}:source:official`)
    ).length,
    1
  );
  const refreshedLiterature = sourceMetadataUpdate.model.crimeScripts[0].literature.find(
    ({ id }) => id === existing.literature[0].id
  );
  assert.equal(refreshedLiterature?.label, 'Corrected official source title');
  assert.equal(refreshedLiterature?.url, 'https://example.test/corrected-source');

  const deleting = structuredClone(update);
  deleting.script.stages[0].variants[0].conditions = [];
  deleting.script.removeIds = [variant.conditions[0].id];
  assert.throws(
    () => buildStandaloneCandidate(
      updateBundle,
      { ...updateBrief, classification: 'restricted' },
      deleting,
      evidence(),
      true
    ),
    /removals require confirmation/i
  );
  assert.doesNotThrow(() => buildStandaloneCandidate(
    updateBundle,
    { ...updateBrief, classification: 'restricted' },
    deleting,
    evidence(),
    true,
    456,
    { allowDeletions: true }
  ));

  const duplicated = structuredClone(update);
  duplicated.script.stages[0].variants[0].activities.push({
    key: 'duplicate-existing',
    existingId: variant.activities[0].id,
    event: 'Een tweede medewerker registreert een onafhankelijke vergelijking',
    observableTraces: ['een afzonderlijk vastgelegd vergelijkingsresultaat'],
  });
  const duplicateEvidence = evidence();
  duplicateEvidence.claims.push({
    nodeKey: 'duplicate-existing',
    sourceKeys: ['official'],
  });
  assert.throws(
    () => buildStandaloneCandidate(
      updateBundle,
      { ...updateBrief, classification: 'restricted' },
      duplicated,
      duplicateEvidence,
      true
    ),
    /assigned more than once/
  );

  const crossKind = structuredClone(update);
  crossKind.script.stages[0].existingId = variant.activities[0].id;
  assert.throws(
    () => buildStandaloneCandidate(
      updateBundle,
      { ...updateBrief, classification: 'restricted' },
      crossKind,
      evidence(),
      true
    ),
    /belongs to activity, not scene/
  );
});

test('fuzzy taxonomy candidates are reported but never merged automatically', () => {
  const source = candidate();
  source.taxonomies.cast[0].label = 'Administratieve medewerker';
  const result = buildStandaloneCandidate(
    normalizeDataModel({
      crimeScripts: [],
      cast: [{ id: 'existing-admin', label: 'Administratief medewerker' }],
      geoLocations: [{ id: 'geo-nl', label: 'Nederland' }],
    }),
    brief,
    source,
    evidence(),
    true
  );
  assert.ok(result.issues.some(({ code }) => code === 'taxonomy-match-candidate'));
  assert.notEqual(
    result.model.crimeScripts[0].stages[0].variants[0].activities[0].cast?.[0],
    'existing-admin'
  );
});

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
          description: 'De medewerker neemt het aangeboden bestand in ontvangst en registreert wie het heeft aangeleverd.',
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
          category: '2_1',
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
  const variant = script.stages[0].variants[0];
  assert.equal(variant.activities[0].description, candidate().script.stages[0].variants[0].activities[0].description);
  assert.deepEqual(variant.activities[0].observableTraces, candidate().script.stages[0].variants[0].activities[0].observableTraces);
  assert.equal(variant.activities[0].decisionPoint, candidate().script.stages[0].variants[0].activities[0].decisionPoint);
  assert.match(variant.indicators[0].description || '', /Verificatie:.*Andere verklaringen:.*Betekenis:/);
  assert.match(variant.measures[0].description || '', /Inzetmoment:.*Beoogd effect:/);
});

test('legacy candidates keep traces and questions structured without inventing an action narrative', () => {
  const legacy = candidate();
  delete legacy.script.stages[0].variants[0].activities[0].description;
  const bundle = normalizeDataModel({ crimeScripts: [], geoLocations: [{ id: 'geo-nl', label: 'Nederland' }] });
  const dutch = buildStandaloneCandidate(bundle, brief, legacy, evidence(), true);
  const english = buildStandaloneCandidate(bundle, { ...brief, contentLanguage: 'en' }, legacy, evidence(), true);
  for (const result of [dutch, english]) {
    const activity = result.model.crimeScripts[0].stages[0].variants[0].activities[0];
    assert.equal(activity.description, undefined);
    assert.deepEqual(activity.observableTraces, legacy.script.stages[0].variants[0].activities[0].observableTraces);
    assert.equal(activity.decisionPoint, legacy.script.stages[0].variants[0].activities[0].decisionPoint);
  }
  assert.match(english.model.crimeScripts[0].stages[0].variants[0].indicators[0].description || '', /^Corroborate with:/);
});

test('measure categories must resolve to GUI category IDs in both validation and build', () => {
  const invalid = candidate();
  invalid.script.stages[0].variants[0].measures![0].category = 'Opsporing';
  assert.throws(() => validateCandidate(invalid), /category.*categories/);
  assert.throws(
    () => buildStandaloneCandidate(
      normalizeDataModel({ geoLocations: [{ id: 'geo-nl', label: 'Nederland' }] }),
      brief, invalid, evidence(), true
    ),
    /category.*categories/
  );
  const valid = candidate();
  valid.script.stages[0].variants[0].measures![0].category = '0_0';
  validateCandidate(valid);
  const result = buildStandaloneCandidate(
    normalizeDataModel({ geoLocations: [{ id: 'geo-nl', label: 'Nederland' }] }),
    brief, valid, evidence(), true
  );
  assert.equal(result.model.crimeScripts[0].stages[0].variants[0].measures[0].cat, '0_0');
});

test('generated indicator and measure prose preserves existing sentence endings', () => {
  for (const language of ['en', 'nl'] as const) {
    for (const ending of ['.', '?', '!', '...', '."', '?)']) {
      const punctuated = candidate();
      const variant = punctuated.script.stages[0].variants[0];
      variant.indicators![0].corroboration = [`vergelijk de onafhankelijke registratie${ending}`];
      variant.indicators![0].alternativeExplanations = [`een inmiddels herstelde invoerfout${ending}`];
      variant.indicators![0].relevance = `aanleiding voor proportionele controle${ending}`;
      variant.measures![0].decisionMoment = `bij een bevestigde afwijking${ending}`;
      variant.measures![0].intendedEffect = `onbevestigde gegevens onderscheiden${ending}`;
      const exported = buildStandaloneCandidate(
        normalizeDataModel({ geoLocations: [{ id: 'geo-nl', label: 'Nederland' }] }),
        { ...brief, contentLanguage: language }, punctuated, evidence(), true
      ).model.crimeScripts[0].stages[0].variants[0];
      assert.ok(exported.indicators[0].description?.includes(`registratie${ending} `));
      assert.ok(exported.indicators[0].description?.includes(`invoerfout${ending} `));
      assert.ok(exported.indicators[0].description?.endsWith(`controle${ending}`));
      assert.ok(exported.measures[0].description?.includes(`afwijking${ending} `));
      assert.ok(exported.measures[0].description?.endsWith(`onderscheiden${ending}`));
    }
  }
});

test('activities need no invented cast or decision point and retain authored action prose', () => {
  const authored = candidate();
  const activity = authored.script.stages[0].variants[0].activities[0];
  delete activity.castKeys;
  delete activity.decisionPoint;
  validateCandidate(authored);
  const result = buildStandaloneCandidate(
    normalizeDataModel({ geoLocations: [{ id: 'geo-nl', label: 'Nederland' }] }),
    brief, authored, evidence(), true
  );
  const exported = result.model.crimeScripts[0].stages[0].variants[0].activities[0];
  assert.equal(exported.description, activity.description);
  assert.deepEqual(exported.cast, []);
  assert.deepEqual(exported.observableTraces, activity.observableTraces);
  assert.equal(exported.decisionPoint, undefined);
  assert.ok(activity.observableTraces.length);
});

test('unused taxonomy is reported while referenced parents survive the standalone export', () => {
  const authored = candidate();
  authored.taxonomies.partners.push(
    { key: 'oversight-group', label: 'Overkoepelend toezicht' },
    { key: 'unused', label: 'Niet betrokken organisatie' }
  );
  authored.taxonomies.partners[0].parentKeys = ['oversight-group'];
  const bundle = normalizeDataModel({
    geoLocations: [{ id: 'geo-nl', label: 'Nederland' }],
    partners: [{ id: 'unrelated', label: 'Andere bestaande partner' }],
  });
  const result = buildStandaloneCandidate(bundle, brief, authored, evidence(), true);
  const exportedLabels = result.model.partners.map(({ label }) => label);
  assert.deepEqual(exportedLabels, ['Bronhouder', 'Overkoepelend toezicht']);
  assert.deepEqual(result.unusedTaxonomy.map(({ taxonomy, key }) => ({ taxonomy, key })), [
    { taxonomy: 'partners', key: 'unused' },
  ]);
  assert.deepEqual(result.issues.filter(({ code }) => code === 'unused-taxonomy').map(({ path, severity }) => ({
    path, severity,
  })), [{ path: '$.taxonomies.partners[2]', severity: 'warning' }]);
  assert.equal(result.newTaxonomy.some(({ label }) => label === 'Niet betrokken organisatie'), false);
  assert.ok(result.newTaxonomy.every(({ taxonomy, id }) => result.model[taxonomy].some((item) => item.id === id)));
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
  repetitive.script.stages[0].variants[0].activities[0].description =
    '“Een medewerker ontvangt een document” wordt in het dossier vastgelegd';

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

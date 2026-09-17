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

test('runtime validation accepts protected bundles without public editorial metadata', () => {
  assert.equal(validateStarterBundle(bundle()).starterBundle?.id, 'pax-nl');
});

const expectedDutchStarterIds = [
  'nl-starter:script:cocaine-import-havens',
  'nl-starter:script:synthetische-drugsproductie',
  'nl-starter:script:arbeidsuitbuiting',
  'nl-starter:script:mensenhandel-seksuele-uitbuiting',
  'nl-starter:script:witwassen-legale-ondernemingen',
  'nl-starter:script:illegale-dumping-chemisch-afval',
  'nl-starter:script:stroperij-illegale-wildhandel',
  'nl-starter:script:voertuigdiefstal-export',
  'nl-starter:script:phishing-betaalfraude',
  'nl-starter:script:illegale-asbestverwijdering',
];
const expectedDutchStarterLabels = [
  'Cocaïne-import via zeehavens',
  'Productie van synthetische drugs',
  'Arbeidsuitbuiting',
  'Mensenhandel voor seksuele uitbuiting',
  'Witwassen via legale ondernemingen',
  'Illegale dumping van chemisch afval',
  'Stroperij en illegale handel in wilde dieren',
  'Voertuigdiefstal en export',
  'Phishing en betaalfraude',
  'Illegale asbestverwijdering',
];

test('the Dutch starter fixture contains exactly the ten researched topics', () => {
  const fixture = validateStarterBundle(JSON.parse(readFileSync('public/starter-bundles/nl.json', 'utf8')));
  assert.deepEqual(fixture.starterBundle, {
    id: 'pax-nl-starter',
    version: '1.0.0',
    locale: 'nl',
    title: 'Nederlandse starterbibliotheek',
    publishedAt: '2026-09-17',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Nederlandse starterbibliotheek voor Crime Scripts, PAX/TNO, versie 1.0.0 (2026), met AI-ondersteuning',
    disclaimer: 'AI-gegenereerd en onbeoordeeld; controleer de inhoud vóór gebruik. Geen juridisch advies.',
  });
  assert.deepEqual(fixture.crimeScripts.map(({ id }) => id), expectedDutchStarterIds);
  assert.deepEqual(fixture.crimeScripts.map(({ label }) => label), expectedDutchStarterLabels);
});

test('Dutch starter scripts meet source, provenance, scene, and editorial requirements', () => {
  const fixture = validateStarterBundle(JSON.parse(readFileSync('public/starter-bundles/nl.json', 'utf8')));
  const allPartnerIds = new Set(fixture.partners.map(({ id }) => id));
  const approvedSourceHosts = [
    'europa.eu',
    'euda.europa.eu',
    'ilo.org',
    'unodc.org',
    'coe.int',
    'wodc.nl',
    'fatf-gafi.org',
    'rivm.nl',
    'cites.org',
    'interpol.int',
    'ncsc.nl',
    'nlarbeidsinspectie.nl',
    'iplo.nl',
  ];
  const prohibitedOperationalPhrases = [
    /stap voor stap/i,
    /\b(?:omzeil|ontwijk|vermijd)\b.{0,40}\b(?:controle|detectie|toezicht)\b/i,
    /\b(?:wis|verwijder)\b.{0,30}\b(?:sporen|logs?|logbestanden)\b/i,
    /\b(?:optimale|exacte)\b.{0,30}\b(?:verhouding|dosering|hoeveelheid|temperatuur)\b/i,
    /\b(?:recept|mengverhouding|dosering)\b.{0,30}\b(?:gram|kilogram|kg|liter|ml|procent|°c)\b/i,
    /\b(?:zo|hiermee) (?:kun|kan) je\b.{0,60}\b(?:omzeilen|ontwijken|verbergen|wissen)\b/i,
  ];

  fixture.crimeScripts.forEach((script) => {
    assert.equal(script.language, 'nl');
    assert.equal(script.aiGenerated, true);
    assert.equal(script.unreviewed, true);
    assert.deepEqual(script.starterOrigin, {
      bundleId: fixture.starterBundle?.id,
      bundleVersion: fixture.starterBundle?.version,
      scriptId: script.id,
    });
    assert.match(script.id, /^nl-starter:script:[a-z0-9-]+$/);
    assert.ok(script.stages.length >= 5 && script.stages.length <= 8);
    assert.ok(script.literature.length >= 2);
    script.literature.forEach((source) => {
      assert.match(source.id, /^nl-starter:source:[a-z0-9-]+$/);
      assert.ok(source.label.length >= 3);
      assert.ok((source.authors || '').length >= 3);
      assert.match(source.url || '', /^https:\/\//);
      const hostname = new URL(source.url || '').hostname;
      assert.ok(approvedSourceHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`)));
      assert.ok((source.description || '').length >= 80);
      assert.ok((source.usedFor || '').length >= 20);
    });
    script.stages.forEach((scene) => {
      assert.match(scene.id, new RegExp(`^${script.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:scene:`));
      assert.ok(scene.variants.length >= 1);
      scene.variants.forEach((act) => {
        assert.match(act.id, /^nl-starter:script:[a-z0-9-]+:scene:[a-z0-9-]+:variant:[a-z0-9-]+$/);
        assert.ok(act.activities.length >= 1);
        assert.ok(act.conditions.length >= 1);
        assert.ok(act.indicators.length >= 1);
        assert.ok(act.measures.length >= 1);
        assert.ok(act.activities.some(({ cast }) => (cast || []).length > 0));
        assert.ok(act.activities.every(({ description }) => (description || '').length >= 30));
        assert.ok(act.conditions.every(({ description }) => (description || '').length >= 30));
        assert.ok(act.indicators.every(({ description }) => (description || '').length >= 30));
        assert.ok(act.measures.every(({ description }) => (description || '').length >= 30));
        act.measures.forEach((measure) => {
          assert.ok(measure.partners.length >= 1);
          measure.partners.forEach((partnerId) => assert.ok(allPartnerIds.has(partnerId)));
        });
      });
    });
    const prose = JSON.stringify(script);
    prohibitedOperationalPhrases.forEach((phrase) => assert.doesNotMatch(prose, phrase));
    assert.ok(!/[.!?]\s+[A-ZÀ-Ý][^.!?]{220,}[.!?]/.test(prose), `${script.id} bevat een te lange zin`);
  });
  const everyId = [
    ...fixture.cast, ...fixture.attributes, ...fixture.locations, ...fixture.geoLocations,
    ...fixture.products, ...fixture.transports, ...fixture.partners,
    ...fixture.crimeScripts.flatMap((script) => [
      script, ...script.literature,
      ...script.stages.flatMap((scene) => [
        scene,
        ...scene.variants.flatMap((act) => [
          act, ...act.activities, ...act.conditions, ...act.opportunities, ...act.indicators, ...act.measures,
        ]),
      ]),
      ...(script.tracks || []),
    ]),
  ];
  everyId.forEach(({ id }) => assert.match(id, /^nl-starter:/));
});

test('Dutch starter icon requirements cover every script and scene exactly once', () => {
  const fixture = validateStarterBundle(JSON.parse(readFileSync('public/starter-bundles/nl.json', 'utf8')));
  const manifest = JSON.parse(readFileSync('public/starter-bundles/icon-requirements.nl.json', 'utf8')) as {
    schemaVersion: number;
    requirements: Array<{ id: string; description: string; appliesTo: string[] }>;
  };
  const expectedTargets = fixture.crimeScripts.flatMap((script) => [
    script.id,
    ...script.stages.map(({ id }) => id),
  ]);
  const actualTargets = manifest.requirements.flatMap(({ appliesTo }) => appliesTo);

  assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(new Set(actualTargets), new Set(expectedTargets));
  assert.equal(actualTargets.length, expectedTargets.length);
  assert.equal(new Set(manifest.requirements.map(({ id }) => id)).size, manifest.requirements.length);
  manifest.requirements.forEach((requirement) => {
    assert.match(requirement.id, /^nl-starter:icon:[a-z0-9-]+$/);
    assert.ok(requirement.description.length >= 20);
    assert.ok(requirement.appliesTo.length >= 1);
  });
});

test('Dutch starter attribution licenses original content without relicensing sources', () => {
  const notice = readFileSync('public/starter-bundles/NOTICE.nl.md', 'utf8');
  assert.match(notice, /Creative Commons Naamsvermelding 4\.0 Internationaal/i);
  assert.match(notice, /CC BY 4\.0/i);
  assert.match(notice, /AI-gegenereerd/i);
  assert.match(notice, /Onbeoordeeld/i);
  assert.match(notice, /bronnen[\s\S]*(?:eigen|oorspronkelijke).*licent/i);
  assert.match(notice, /geen\s+juridisch advies/i);
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

test('complete public import preserves a conflicting local edit and adds all missing scripts', () => {
  const starter = validateStarterBundle(JSON.parse(readFileSync('public/starter-bundles/nl.json', 'utf8')));
  const localScript = structuredClone(starter.crimeScripts[0]);
  localScript.label = 'Lokale wijziging';
  const current = normalizeDataModel({ crimeScripts: [localScript] });

  const imported = importStarterBundle(current, starter);

  assert.equal(imported.crimeScripts.length, 10);
  assert.equal(imported.crimeScripts.find(({ id }) => id === localScript.id)?.label, 'Lokale wijziging');
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

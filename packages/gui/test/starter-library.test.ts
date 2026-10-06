import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { DataModel, Indicator, Measure } from '../src/models/data-model.ts';
import {
  collectStarterSuggestions,
  copySuggestion,
  detachStarterScript,
  hasCloseDuplicate,
  importStarterBundle,
  resolveStarterBundleUrl,
  saveAsNewSuggestion,
  suggestionKey,
  validateStarterBundle,
} from '../src/models/starter-library.ts';
import { matchCaseEvidence, type CaseTokenizer } from '../src/models/case-matching.ts';
import { normalizeDataModel } from '../src/models/model-normalization.ts';
import { scriptsForMode } from '../src/models/script-classification.ts';

const tokenize: CaseTokenizer = (text) =>
  text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) || [];

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

test('starter bundle URL respects the deployed application base path', () => {
  assert.equal(
    resolveStarterBundleUrl('https://example.test/crime_scripts/'),
    'https://example.test/crime_scripts/starter-bundles/nl.json'
  );
  assert.equal(
    resolveStarterBundleUrl('https://example.test/crime_scripts/', 'en'),
    'https://example.test/crime_scripts/starter-bundles/en.json'
  );
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
  'nl-starter:script:asbestsaneringsketen',
  'nl-starter:script:bijtincidenten-honden',
  'nl-starter:script:co-vergisting',
  'nl-starter:script:complexe-zorgstructuren',
  'nl-starter:script:criminele-uitbuiting',
  'nl-starter:script:fake-carriers',
  'nl-starter:script:pijplijndiefstal-olieproducten',
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
  'Asbestsaneringsketen',
  'Risicoketen bijtincidenten met honden',
  'Co-vergisting en afvalstromen',
  'Complexe juridische structuren in de zorg',
  'Criminele uitbuiting',
  'Fake carriers op digitale vrachtmarktplaatsen',
  'Diefstal van geraffineerde olieproducten via illegale pijplijnaftapping',
];

test('the Dutch starter fixture contains all researched topics', () => {
  const fixture = validateStarterBundle(JSON.parse(readFileSync('public/starter-bundles/nl.json', 'utf8')));
  assert.equal(fixture.products.find(({ id }) => id === 'nl-starter:product:asbesthoudend-materiaal')?.label, 'Asbest');
  assert.deepEqual(fixture.starterBundle, {
    id: 'pax-nl-starter',
    version: '1.0.5',
    locale: 'nl',
    title: 'Nederlandse starterbibliotheek',
    publishedAt: '2026-10-06',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Nederlandse starterbibliotheek voor Crime Scripts, PAX/TNO, versie 1.0.5 (2026), met AI-ondersteuning',
    disclaimer: 'AI-gegenereerd en onbeoordeeld; controleer de inhoud vóór gebruik. Geen juridisch advies.',
  });
  assert.deepEqual(fixture.crimeScripts.map(({ id }) => id), expectedDutchStarterIds);
  assert.deepEqual(fixture.crimeScripts.map(({ label }) => label), expectedDutchStarterLabels);
});

test('the Dutch harbor starter fully matches the documented case observations', () => {
  const fixture = validateStarterBundle(
    JSON.parse(readFileSync('public/starter-bundles/nl.json', 'utf8'))
  );

  const [result] = matchCaseEvidence({
    model: fixture,
    scriptMode: 'public',
    text: 'toegangspas, beschadigd containerzegel',
    tokenize,
  });

  assert.equal(result.scriptId, 'nl-starter:script:cocaine-import-havens');
  assert.deepEqual(
    result.matchedEvidence.map(({ evidence, termCoverage }) => ({
      label: evidence.label,
      termCoverage,
    })),
    [
      { label: 'toegangspas', termCoverage: 1 },
      { label: 'beschadigd containerzegel', termCoverage: 1 },
    ]
  );
  assert.deepEqual(result.unmatchedEvidence, []);
});

test('the English starter fixture mirrors the complete Dutch starter library', () => {
  const raw = readFileSync('public/starter-bundles/en.json', 'utf8');
  const fixture = validateStarterBundle(JSON.parse(raw));
  assert.equal(fixture.products.find(({ id }) => id === 'en-starter:product:asbesthoudend-materiaal')?.label, 'Asbestos');

  assert.deepEqual(fixture.starterBundle, {
    id: 'pax-en-starter',
    version: '1.0.5',
    locale: 'en',
    title: 'English starter library',
    publishedAt: '2026-10-06',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'English starter library for Crime Scripts, PAX/TNO, version 1.0.5 (2026), with AI assistance',
    disclaimer: 'AI-generated and unreviewed; verify the content before use. Not legal advice.',
  });
  assert.equal(fixture.crimeScripts.length, expectedDutchStarterIds.length);
  assert.deepEqual(
    fixture.crimeScripts.map(({ label }) => label).sort(),
    [
      'Asbestos remediation chain',
      'Co-digestion and waste streams',
      'Cocaine import through seaports',
      'Complex legal structures in healthcare',
      'Criminal exploitation',
      'Fake carriers on digital freight marketplaces',
      'Human trafficking for sexual exploitation',
      'Illegal asbestos removal',
      'Illegal dumping of chemical waste',
      'Labour exploitation',
      'Money laundering through legitimate businesses',
      'Phishing and payment fraud',
      'Poaching and illegal wildlife trade',
      'Risk chain for dog-bite incidents',
      'Synthetic drug production',
      'Theft of refined petroleum products through illegal pipeline tapping',
      'Vehicle theft and export',
    ].sort(),
  );
  fixture.crimeScripts.forEach((script) => {
    assert.equal(script.language, 'en');
    assert.equal(script.starterOrigin?.bundleId, fixture.starterBundle?.id);
    assert.equal(script.starterOrigin?.bundleVersion, fixture.starterBundle?.version);
    assert.match(script.id, /^en-starter:script:[a-z0-9-]+$/);
  });
  assert.doesNotMatch(raw, /nl-starter:/);
});

test('public starter taxonomy enrichments keep translated categories and published mirrors aligned', () => {
  for (const locale of ['nl', 'en'] as const) {
    const json = readFileSync(`public/starter-bundles/${locale}.json`, 'utf8');
    assert.equal(json, readFileSync(`../../docs/starter-bundles/${locale}.json`, 'utf8'));
    const fixture = validateStarterBundle(JSON.parse(json));
    const cast = fixture.cast.find(({ label }) => label === (locale === 'nl' ? 'Chauffeur' : 'Driver'));
    const category = fixture.cast.find(({ id }) => id === cast?.parents?.[0]);
    assert.equal(category?.label, locale === 'nl' ? 'Logistiek' : 'Logistics');
    assert.ok(cast?.description);
    const cash = fixture.attributes.find(({ label }) => label === (locale === 'nl' ? 'Contant geld' : 'Cash'));
    assert.deepEqual(cash?.synonyms, ['Cash', 'Kapitaal', 'Startkapitaal']);
    assert.equal(
      fixture.attributes.find(({ id }) => id === cash?.parents?.[0])?.label,
      locale === 'nl' ? 'Betaalmiddel' : 'Payment method'
    );
    const affectedParty = fixture.cast.find(({ label }) => label === (locale === 'nl' ? 'Benadeelde' : 'Affected party'));
    assert.equal(
      fixture.cast.find(({ id }) => id === affectedParty?.parents?.[0])?.label,
      locale === 'nl' ? 'Begunstigde' : 'Beneficiary'
    );
    const drugs = fixture.products.find(({ label }) => label === (locale === 'nl' ? 'Verdovende middelen' : 'Controlled substances'));
    assert.deepEqual(drugs?.synonyms, ['Drugs']);
    assert.ok(drugs?.description);
    const netherlands = fixture.geoLocations.find(({ label }) => label === (locale === 'nl' ? 'Nederland' : 'Netherlands'));
    const westernEurope = fixture.geoLocations.find(({ id }) => id === netherlands?.parents?.[0]);
    const europe = fixture.geoLocations.find(({ id }) => id === westernEurope?.parents?.[0]);
    const world = fixture.geoLocations.find(({ id }) => id === europe?.parents?.[0]);
    assert.equal(world?.label, locale === 'nl' ? 'Wereld' : 'World');
    assert.deepEqual(europe?.synonyms, ['EU']);
    assert.equal(fixture.cast.some(({ label }) => label === 'Aanbieder'), false);
  }
});

test('manual transport cleanup is reflected in both starter languages', () => {
  const cleanedScenes: Record<string, number[]> = {
    'pijplijndiefstal-olieproducten': [0, 1, 2, 3, 4, 5],
    'cocaine-import-havens': [1, 3, 4],
    'synthetische-drugsproductie': [1, 4],
    arbeidsuitbuiting: [1],
    'mensenhandel-seksuele-uitbuiting': [3],
    'illegale-dumping-chemisch-afval': [2],
    'stroperij-illegale-wildhandel': [4],
    'voertuigdiefstal-export': [1, 2, 4],
    'illegale-asbestverwijdering': [4],
  };

  for (const locale of ['nl', 'en'] as const) {
    const fixture = validateStarterBundle(JSON.parse(readFileSync(`public/starter-bundles/${locale}.json`, 'utf8')));
    for (const [suffix, scenes] of Object.entries(cleanedScenes)) {
      const script = fixture.crimeScripts.find(({ id }) => id === `${locale}-starter:script:${suffix}`);
      assert.ok(script, `${locale} starter script ${suffix} is missing`);
      for (const index of scenes) {
        const scene = script.stages[index];
        assert.ok(scene, `${script.id} scene ${index} is missing`);
        for (const activity of scene.variants.flatMap(({ activities }) => activities)) {
          assert.equal(
            activity.transports?.some((id) => /:(?:container|vrachtwagen|personenauto|postzending)$/.test(id)),
            false,
            `${script.id}: ${activity.label} retains a removed transport link`
          );
        }
      }
    }

    const oil = fixture.crimeScripts.find(({ id }) => id === `${locale}-starter:script:pijplijndiefstal-olieproducten`);
    const storage = oil?.stages[4].variants[0];
    assert.ok(storage?.description?.includes(locale === 'nl' ? 'Voorraad zonder inkoopspoor' : 'Inventory without procurement trail'));
    assert.ok(storage.activities.every(({ description }) => (description || '').length >= 30));
    assert.deepEqual(storage.activities.map(({ type }) => type), [[1, 2], [1], [1, 2], [1, 2]]);
  }
});

test('barrier-model scenes describe process context without copying their titles', () => {
  const normalize = (value: string) =>
    value
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();

  ['nl', 'en'].forEach((locale) => {
    const fixture = validateStarterBundle(
      JSON.parse(readFileSync(`public/starter-bundles/${locale}.json`, 'utf8'))
    );

    fixture.crimeScripts
      .filter(({ literature }) =>
        literature.some(({ label }) => /barri[eè]remodel|barrier model/i.test(label))
      )
      .flatMap(({ stages }) => stages)
      .forEach(({ label, description }) => {
        assert.ok(description?.trim(), `${locale} scene "${label}" has a description`);
        assert.doesNotMatch(
          description,
          /(?:Fase uit|Phase from) (?:het |the )?openbare? ?CCV[- ]barrièremodel/i
        );
        assert.notEqual(normalize(description || ''), normalize(label));
        assert.equal(
          normalize(description || '').includes(normalize(label)),
          false,
          `${locale} scene description must not reveal the exact title "${label}"`
        );
      });
  });
});

test('Dutch starter scripts meet source, provenance, scene, and editorial requirements', () => {
  const fixture = validateStarterBundle(JSON.parse(readFileSync('public/starter-bundles/nl.json', 'utf8')));
  const allCastIds = new Set(fixture.cast.map(({ id }) => id));
  const allAttributeIds = new Set(fixture.attributes.map(({ id }) => id));
  const allTransportIds = new Set(fixture.transports.map(({ id }) => id));
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
    'barrieremodellen.nl',
    'hetccv.nl',
    'ilent.nl',
    'nza.nl',
    'doi.org',
    'osf.io',
  ];
  const prohibitedOperationalPhrases = [
    /stap voor stap/i,
    /\b(?:omzeil|ontwijk|vermijd)\b.{0,40}\b(?:controle|detectie|toezicht)\b/i,
    /\b(?:wis|verwijder)\b.{0,30}\b(?:sporen|logs?|logbestanden)\b/i,
    /\b(?:optimale|exacte)\b.{0,30}\b(?:verhouding|dosering|hoeveelheid|temperatuur)\b/i,
    /\b(?:recept|mengverhouding|dosering)\b.{0,30}\b(?:gram|kilogram|kg|liter|ml|procent|°c)\b/i,
    /\b(?:zo|hiermee) (?:kun|kan) je\b.{0,60}\b(?:omzeilen|ontwijken|verbergen|wissen)\b/i,
  ];
  const prohibitedActivityDescriptionPhrases = [
    /^(?:deze stap beschrijft|leg|breng|beoordeel|toets|registreer|onderzoek)\b/i,
    /leg (?:deze )?gebeurtenis/i,
    /leg vast welke partij/i,
    /bevoegde partners wegen het signaal/i,
    /zonder operationele uitvoeringsdetails/i,
  ];
  const activityDescriptions: string[] = [];
  const normalizeComparableText = (value: string): string =>
    value
      .toLocaleLowerCase()
      .replace(/["'“”‘’]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();

  fixture.crimeScripts.forEach((script) => {
    assert.equal(script.language, 'nl');
    assert.equal(script.classification, 'public');
    assert.equal(script.scriptFamilyId, script.id);
    assert.equal(script.aiGenerated, true);
    assert.equal(script.unreviewed, true);
    assert.deepEqual(script.starterOrigin, {
      bundleId: fixture.starterBundle?.id,
      bundleVersion: fixture.starterBundle?.version,
      scriptId: script.id,
    });
    assert.match(script.id, /^nl-starter:script:[a-z0-9-]+$/);
    assert.ok(script.stages.length >= 4 && script.stages.length <= 12);
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
        assert.doesNotMatch(act.label, /^(?:hoofdroute|openbaar barrièremodel)$/i);
        assert.notEqual(normalizeComparableText(act.label), normalizeComparableText(scene.label));
        assert.ok(act.activities.length >= 3 && act.activities.length <= 4);
        assert.equal(new Set(act.activities.map(({ label }) => label)).size, act.activities.length);
        assert.notEqual(act.activities[0].label, scene.label);
        assert.notEqual(act.activities[0].label, act.label);
        assert.ok(
          act.activities.every(({ label }) => !label.toLocaleLowerCase().includes(script.label.toLocaleLowerCase()))
        );
        assert.ok(act.activities.every(({ label }) => !/risicocontext voor .* afbakenen/i.test(label)));
        assert.ok(act.conditions.length >= 1);
        assert.ok(act.indicators.length >= 1);
        assert.ok(act.measures.length >= 1);
        assert.ok(act.activities.some(({ cast }) => (cast || []).length > 0));
        assert.ok(act.activities.every(({ description }) => (description || '').length >= 30));
        act.activities.forEach((activity) => {
          assert.match(activity.id, new RegExp(`^${act.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:activity:`));
          const description = activity.description || '';
          activityDescriptions.push(description);
          prohibitedActivityDescriptionPhrases.forEach((phrase) => assert.doesNotMatch(description, phrase));
          assert.ok(
            !normalizeComparableText(description).includes(normalizeComparableText(activity.label)),
            `${activity.id} repeats its label in the description`
          );
          (activity.cast || []).forEach((castId) => assert.ok(allCastIds.has(castId)));
          (activity.attributes || []).forEach((attributeId) => assert.ok(allAttributeIds.has(attributeId)));
          (activity.transports || []).forEach((transportId) => assert.ok(allTransportIds.has(transportId)));
        });
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
  assert.equal(new Set(activityDescriptions).size, activityDescriptions.length);
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
  assert.equal(new Set(everyId.map(({ id }) => id)).size, everyId.length);
});

test('Dutch starter icon requirements cover every script exactly once', () => {
  const fixture = validateStarterBundle(JSON.parse(readFileSync('public/starter-bundles/nl.json', 'utf8')));
  const manifest = JSON.parse(readFileSync('public/starter-bundles/icon-requirements.nl.json', 'utf8')) as {
    schemaVersion: number;
    requirements: Array<{ id: string; description: string; appliesTo: string[] }>;
  };
  const expectedTargets = fixture.crimeScripts.map(({ id }) => id);
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

test('English starter icon requirements cover every English script exactly once', () => {
  const fixture = validateStarterBundle(JSON.parse(readFileSync('public/starter-bundles/en.json', 'utf8')));
  const manifest = JSON.parse(readFileSync('public/starter-bundles/icon-requirements.en.json', 'utf8')) as {
    bundleId: string;
    bundleVersion: string;
    requirements: Array<{ id: string; appliesTo: string[]; iconKey: string }>;
  };

  assert.equal(manifest.bundleId, fixture.starterBundle?.id);
  assert.equal(manifest.bundleVersion, fixture.starterBundle?.version);
  assert.deepEqual(
    manifest.requirements.flatMap(({ appliesTo }) => appliesTo).sort(),
    fixture.crimeScripts.map(({ id }) => id).sort(),
  );
  manifest.requirements.forEach((requirement) => {
    assert.match(requirement.id, /^en-starter:icon:[a-z0-9-]+$/);
    assert.ok(requirement.iconKey);
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

test('English starter attribution licenses original content without relicensing sources', () => {
  const notice = readFileSync('public/starter-bundles/NOTICE.en.md', 'utf8');
  assert.match(notice, /Creative Commons Attribution 4\.0 International/i);
  assert.match(notice, /CC BY 4\.0/i);
  assert.match(notice, /AI-generated/i);
  assert.match(notice, /Unreviewed/i);
  assert.match(notice, /sources[\s\S]*(?:own|original) licences/i);
  assert.match(notice, /does not constitute legal advice/i);
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
  const copiedScript = copied.crimeScripts.find(({ id }) => id !== 'starter-script')!;
  assert.equal(copiedScript.scriptFamilyId, copiedScript.id);
  assert.equal(scriptsForMode(copied.crimeScripts, 'restricted').length, 2);
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

  assert.equal(imported.crimeScripts.length, 17);
  assert.equal(imported.crimeScripts.find(({ id }) => id === localScript.id)?.label, 'Lokale wijziging');
});

test('starter import repairs duplicate owned ids from persisted reusable acts', () => {
  const current = normalizeDataModel({
    crimeScripts: [
      {
        id: 'legacy-one',
        label: 'Legacy one',
        stages: [
          {
            id: 'legacy-scene-one',
            label: 'Scene one',
            variants: [{
              id: 'shared-act',
              label: 'Shared act',
              activities: [],
              conditions: [],
              opportunities: [],
              indicators: [],
              measures: [],
            }],
            selectedVariantId: 'shared-act',
          },
          {
            id: 'legacy-scene-two',
            label: 'Scene two',
            variants: [{
              id: 'shared-act',
              label: 'Shared act',
              activities: [],
              conditions: [],
              opportunities: [],
              indicators: [],
              measures: [],
            }],
            selectedVariantId: 'shared-act',
          },
        ],
      },
      {
        id: 'legacy-two',
        label: 'Legacy two',
        stages: [{
          id: 'legacy-scene-three',
          label: 'Scene three',
          variants: [{
            id: 'shared-act',
            label: 'Shared act',
            activities: [],
            conditions: [],
            opportunities: [],
            indicators: [],
            measures: [],
          }],
        }],
      },
    ],
  });

  const imported = importStarterBundle(current, bundle());
  const variantIds = imported.crimeScripts.flatMap((script) =>
    script.stages.flatMap((scene) => scene.variants.map(({ id }) => id))
  );

  assert.equal(imported.crimeScripts.length, 3);
  assert.equal(new Set(variantIds).size, variantIds.length);
  imported.crimeScripts.slice(0, 2).forEach((script) => {
    script.stages.forEach((scene) => {
      assert.equal(scene.variants.some(({ id }) => id === scene.selectedVariantId), true);
    });
  });
  assert.deepEqual(
    imported.crimeScripts.slice(0, 2).map(({ label }) => label),
    ['Legacy one', 'Legacy two']
  );
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

test('suggestions ignore incomplete rows created while editing repeat forms', () => {
  const model = bundle();
  model.crimeScripts[0].stages[0].variants[0].indicators.push({
    id: 'draft-indicator',
  } as Indicator);
  model.crimeScripts[0].stages[0].variants[0].measures.push({
    id: 'draft-measure',
    cat: 'other',
    partners: [],
  } as Measure);

  assert.deepEqual(
    collectStarterSuggestions(model, undefined, 'indicator', 'nl').map(({ label }) => label),
    ['Ongewone betaling']
  );
  assert.deepEqual(
    collectStarterSuggestions(model, undefined, 'measure', 'nl').map(({ label }) => label),
    ['Controleer betaling']
  );
});

test('restricted-mode suggestions prefer restricted counterpart content over the public starter', () => {
  const starter = bundle();
  const restrictedScript = structuredClone(starter.crimeScripts[0]);
  restrictedScript.id = 'restricted-script';
  restrictedScript.classification = 'restricted';
  restrictedScript.scriptFamilyId = starter.crimeScripts[0].scriptFamilyId;
  restrictedScript.stages[0].variants[0].indicators[0].description = 'Restricted investigative detail';
  const workspace = normalizeDataModel({
    ...starter,
    starterBundle: undefined,
    crimeScripts: [restrictedScript],
  });

  const suggestions = collectStarterSuggestions(workspace, starter, 'indicator', 'nl', false, 'restricted');
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].description, 'Restricted investigative detail');
  assert.equal(suggestions[0].suggestionOrigin.scriptId, 'restricted-script');
});

test('taxonomy id conflicts are remapped without changing imported meaning', () => {
  const current = normalizeDataModel({
    crimeScripts: [],
    products: [{ id: 'shared-id', label: 'Lokaal product' }],
  });

  test('starter imports remap taxonomy ids that collide with owned workspace ids', () => {
    const imported = bundle();
    const localScript = structuredClone(imported.crimeScripts[0]);
    localScript.id = 'local-script';
    localScript.stages[0].variants[0].activities = [{
      id: 'partner',
      label: 'Bestaande activiteit',
      description: 'Een lokale activiteit met dezelfde id als een startertaxonomie.',
      type: 0,
    }];
    const current = normalizeDataModel({ crimeScripts: [localScript] });

    const result = importStarterBundle(current, imported);
    const importedScript = result.crimeScripts.find(({ starterOrigin }) => starterOrigin?.scriptId === 'starter-script');
    const importedPartnerId = importedScript?.stages[0].variants[0].measures[0].partners[0];
    assert.ok(importedPartnerId);
    assert.notEqual(importedPartnerId, 'partner');
    assert.equal(result.partners.some(({ id }) => id === importedPartnerId), true);
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

test('detaching a starter script creates an independent family and clears starter origin', () => {
  const script = { ...bundle().crimeScripts[0], aiGenerated: true, unreviewed: true, starterOrigin: { bundleId: 'pax-nl', bundleVersion: '1.0.0', scriptId: 'starter-script' } };
  const detached = detachStarterScript(script);
  assert.notEqual(detached.id, script.id);
  assert.equal(detached.scriptFamilyId, detached.id);
  assert.equal(detached.starterOrigin, undefined);
  assert.equal(detached.aiGenerated, true);
  assert.equal(detached.literature.length, 1);
});

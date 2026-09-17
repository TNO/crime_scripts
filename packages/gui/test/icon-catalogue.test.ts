import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import type { DataModel } from '../src/models/data-model.ts';
import {
  BUILT_IN_ICONS,
  ICONS,
  IconOpts,
  isBuiltInIconKey,
  resolveIconSource,
} from '../src/models/icons.ts';
import { normalizeDataModel } from '../src/models/model-normalization.ts';
import { createSingleScriptExportModel } from '../src/models/single-script-export.ts';
import { getMatchingStarterBundleMetadata, validateStarterBundle } from '../src/models/starter-library.ts';

type Attribution = {
  kind: 'original' | 'third-party';
  title: string;
  creator: string;
  sourceUrl: string;
  license: string;
  svgoModified: boolean;
};

type CatalogueManifest = {
  schemaVersion: number;
  icons: Array<{
    key: string;
    label: string;
    category: string;
    file: string;
    attribution: Attribution;
  }>;
};

type RequirementsManifest = {
  requirements: Array<{ id: string; appliesTo: string[]; iconKey: string }>;
};

const publicFile = (path: string) => `public/${path}`;
const readJson = <T>(path: string): T => JSON.parse(readFileSync(publicFile(path), 'utf8')) as T;

test('every icon requirement and starter target resolves to a stable catalogue key', () => {
  const catalogue = readJson<CatalogueManifest>('icons/catalogue.json');
  const requirements = readJson<RequirementsManifest>('starter-bundles/icon-requirements.nl.json');
  const starter = readJson<DataModel>('starter-bundles/nl.json');
  const keys = new Set(catalogue.icons.map(({ key }) => key));
  const starterTargets = starter.crimeScripts.flatMap((script) => [
    [script.id, script.icon] as const,
    ...script.stages.map((scene) => [scene.id, scene.icon] as const),
  ]);
  const expectedTargetIds = starterTargets.map(([id]) => id);

  requirements.requirements.forEach(({ id, appliesTo }) => {
    assert.ok(appliesTo.length > 0, `${id} has no target`);
  });
  const requirementIds = requirements.requirements.map(({ id }) => id);
  assert.equal(new Set(requirementIds).size, requirementIds.length, 'a requirement id is duplicated');
  const mappedTargetIds = requirements.requirements.flatMap(({ appliesTo }) => appliesTo);
  assert.equal(new Set(mappedTargetIds).size, mappedTargetIds.length, 'a target is mapped more than once');
  assert.deepEqual(new Set(mappedTargetIds), new Set(expectedTargetIds));

  const requirementByTarget = new Map(
    requirements.requirements.flatMap(({ appliesTo, iconKey }) =>
      appliesTo.map((target) => [target, iconKey] as const)
    )
  );
  requirements.requirements.forEach(({ iconKey }) => {
    assert.ok(keys.has(iconKey), `${iconKey} is absent from the catalogue`);
  });
  starterTargets.forEach(([target, icon]) => {
    assert.equal(icon, requirementByTarget.get(target), target);
    assert.equal(typeof icon, 'string', `${target} has no stable icon key`);
    assert.ok(isBuiltInIconKey(icon), `${target} uses unknown icon ${String(icon)}`);
  });
});

test('catalogue files are optimized monochrome SVGs with complete attribution', () => {
  const catalogue = readJson<CatalogueManifest>('icons/catalogue.json');
  const notice = readFileSync(publicFile('icons/NOTICE.md'), 'utf8');

  assert.equal(catalogue.schemaVersion, 1);
  assert.deepEqual(
    catalogue.icons.map(({ key }) => key),
    BUILT_IN_ICONS.map(({ key }) => key)
  );
  catalogue.icons.forEach(({ key, file, attribution }) => {
    const path = publicFile(`icons/${file}`);
    assert.ok(existsSync(path), `${key} points to missing ${path}`);
    const svg = readFileSync(path, 'utf8');
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100">/);
    assert.match(svg, /<(?:path|circle|rect|polygon)\b/);
    assert.doesNotMatch(svg, /<(?:script|style|metadata|title|desc)\b|<!--|\b(?:width|height|stroke|class|id)=/);
    assert.doesNotMatch(svg, /\n|\s{2,}/);
    assert.ok(attribution.title && attribution.creator && attribution.sourceUrl && attribution.license);
    assert.equal(attribution.svgoModified, true);
    if (attribution.kind === 'third-party') {
      assert.match(attribution.license, /^(?:Public Domain|CC BY 3\.0)$/);
      assert.match(notice, new RegExp(attribution.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });
});

test('the production deployment contains the catalogue metadata, notice, and every SVG', () => {
  const catalogue = readJson<CatalogueManifest>('icons/catalogue.json');
  const deployedRoot = '../../docs/icons';

  ['nl.json', 'icon-requirements.nl.json'].forEach((file) => {
    assert.equal(
      readFileSync(`../../docs/starter-bundles/${file}`, 'utf8'),
      readFileSync(publicFile(`starter-bundles/${file}`), 'utf8')
    );
  });
  assert.equal(
    readFileSync(`${deployedRoot}/catalogue.json`, 'utf8'),
    readFileSync(publicFile('icons/catalogue.json'), 'utf8')
  );
  assert.equal(
    readFileSync(`${deployedRoot}/NOTICE.md`, 'utf8'),
    readFileSync(publicFile('icons/NOTICE.md'), 'utf8')
  );
  catalogue.icons.forEach(({ file }) => {
    assert.equal(readFileSync(`${deployedRoot}/${file}`, 'utf8'), readFileSync(publicFile(`icons/${file}`), 'utf8'));
  });
});

test('the picker is application-level and retains every legacy numeric icon value', () => {
  const legacyValues = Object.values(ICONS).filter((value): value is number => typeof value === 'number');
  const optionIds = new Set(IconOpts.map(({ id }) => id));

  legacyValues.forEach((value) => assert.ok(optionIds.has(value), `legacy icon ${value} is absent`));
  BUILT_IN_ICONS.forEach(({ key }) => assert.ok(optionIds.has(key), `${key} is absent`));
});

test('icon resolution preserves uploaded images and resolves catalogue keys', () => {
  const upload = 'data:image/png;base64,dXNlci1pbWFnZQ==';
  assert.equal(resolveIconSource(ICONS.OTHER, upload), upload);
  assert.match(resolveIconSource(BUILT_IN_ICONS[0].key, upload), /^icons\/.+\.svg$/);
  assert.equal(resolveIconSource(999_999 as ICONS, upload), undefined);
});

test('single-script export retains built-in keys and embedded uploaded images', () => {
  const model = normalizeDataModel({
    crimeScripts: [
      {
        id: 'script',
        label: 'Export',
        icon: 'builtin:port-security',
        url: 'data:image/png;base64,c2NyaXB0',
        stages: [{
          id: 'scene',
          label: 'Scene',
          icon: ICONS.OTHER,
          url: 'data:image/png;base64,c2NlbmU=',
          variants: [],
        }],
      },
    ],
  });

  const exported = createSingleScriptExportModel(model.crimeScripts[0], model, 123);
  assert.equal(exported.crimeScripts[0].icon, 'builtin:port-security');
  assert.equal(exported.crimeScripts[0].url, 'data:image/png;base64,c2NyaXB0');
  assert.equal(exported.crimeScripts[0].stages[0].icon, ICONS.OTHER);
  assert.equal(exported.crimeScripts[0].stages[0].url, 'data:image/png;base64,c2NlbmU=');
});

test('every public starter script exports as a standalone valid model', () => {
  const starter = validateStarterBundle(readJson<DataModel>('starter-bundles/nl.json'));

  starter.crimeScripts.forEach((script) => {
    const exported = validateStarterBundle(createSingleScriptExportModel(script, starter, 123));
    assert.deepEqual(exported.crimeScripts.map(({ id }) => id), [script.id]);
    assert.equal(exported.crimeScripts[0].starterOrigin?.scriptId, script.id);
    assert.equal(exported.starterBundle?.license, 'CC BY 4.0');
  });
});

test('starter metadata is only associated with scripts from the same bundle version', () => {
  const starter = validateStarterBundle(readJson<DataModel>('starter-bundles/nl.json'));
  const script = starter.crimeScripts[0];
  assert.equal(getMatchingStarterBundleMetadata(script, starter)?.license, 'CC BY 4.0');

  const mismatched = {
    ...starter,
    starterBundle: { ...starter.starterBundle!, version: '2.0.0', attribution: 'Andere attributie' },
  };
  assert.equal(getMatchingStarterBundleMetadata(script, mismatched), undefined);
  assert.equal(createSingleScriptExportModel(script, mismatched, 123).starterBundle, undefined);
});

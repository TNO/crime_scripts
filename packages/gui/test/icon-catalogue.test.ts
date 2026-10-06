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
  resolveIconSources,
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
  const starterTargets = starter.crimeScripts.map((script) =>
    [script.id, script.icon] as const
  );
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

test('supplied icons are selectable and public starter scripts show one appropriate icon', () => {
  const catalogue = readJson<CatalogueManifest>('icons/catalogue.json');
  const supplied = [
    'biogas-digester', 'company-registry-document', 'dangerous-dog', 'dog',
    'freight-truck', 'hospital', 'pitbull', 'shipping-container', 'windhond',
  ];
  for (const name of supplied) {
    assert.ok(existsSync(`src/assets/icons/${name}.svg`), `source asset ${name} is missing`);
    assert.ok(catalogue.icons.some(({ key }) => key === `builtin:${name}`));
    assert.ok(IconOpts.some(({ id }) => id === `builtin:${name}`));
  }

  const expected = new Map([
    ['cocaine-import-havens', 'builtin:shipping-container'],
    ['bijtincidenten-honden', 'builtin:dog'],
    ['co-vergisting', 'builtin:biogas-digester'],
    ['complexe-zorgstructuren', 'builtin:company-registry-document'],
    ['fake-carriers', 'builtin:freight-truck'],
  ]);
  for (const lang of ['nl', 'en']) {
    const bundle = readJson<DataModel>(`starter-bundles/${lang}.json`);
    for (const [suffix, icon] of expected) {
      const script = bundle.crimeScripts.find(({ id }) => id === `${lang}-starter:script:${suffix}`);
      assert.ok(script, `${lang} starter script ${suffix} is missing`);
      assert.equal(script.icon, icon);
      assert.deepEqual(script.icons, [icon]);
      assert.deepEqual(resolveIconSources(script.icons, script.icon), [`icons/${icon.slice(8)}.svg`]);
    }
  }
});

test('linked single-subject icons are selectable and assigned to related starter scripts', () => {
  const catalogue = readJson<CatalogueManifest>('icons/catalogue.json');
  const linked = new Map([
    ['asbestos-fibers', 'asbestos-exposure-8074144'],
    ['blast', 'blast-6297938'],
    ['bribe', 'bribe-26816'],
    ['clothing', 'clothing-5260292'],
    ['gang', 'gang-3859536'],
    ['lab-flask', 'lab-6650883'],
    ['mortgage-house', 'mortage-7360676'],
    ['oil-drop', 'oil-7301814'],
    ['souvenir-shop', 'souvenir-shop-4687505'],
  ]);
  for (const [name, source] of linked) {
    const key = `builtin:${name}`;
    assert.ok(existsSync(`src/assets/icons/${name}.png`), `source asset ${name} is missing`);
    assert.ok(catalogue.icons.some(({ key: catalogueKey }) => catalogueKey === key), `${key} is missing`);
    assert.ok(IconOpts.some(({ id }) => id === key), `${key} is not selectable`);
    const entry = catalogue.icons.find(({ key: catalogueKey }) => catalogueKey === key);
    assert.equal(entry?.attribution.kind, 'third-party');
    assert.equal(entry?.attribution.license, 'CC BY 3.0');
    assert.equal(entry?.attribution.sourceUrl, `https://thenounproject.com/icon/${source}/`);
    assert.equal(entry?.file, `${name}.png`);
    assert.deepEqual(readFileSync(publicFile(`icons/${name}.png`)), readFileSync(`src/assets/icons/${name}.png`));
  }

  const expected = new Map([
    ['synthetische-drugsproductie', 'builtin:lab-flask'],
    ['illegale-asbestverwijdering', 'builtin:asbestos-fibers'],
    ['asbestsaneringsketen', 'builtin:asbestos-fibers'],
    ['pijplijndiefstal-olieproducten', 'builtin:oil-drop'],
  ]);
  for (const lang of ['nl', 'en']) {
    const bundle = readJson<DataModel>(`starter-bundles/${lang}.json`);
    for (const [suffix, icon] of expected) {
      const script = bundle.crimeScripts.find(({ id }) => id === `${lang}-starter:script:${suffix}`);
      assert.ok(script, `${lang} starter script ${suffix} is missing`);
      assert.equal(script.icon, icon);
      assert.deepEqual(script.icons, [icon]);
      assert.deepEqual(resolveIconSources(script.icons, script.icon), [`icons/${icon.slice(8)}.png`]);
    }
  }
});

test('catalogue files are valid images with complete attribution', () => {
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
    if (file.endsWith('.svg')) {
      const svg = readFileSync(path, 'utf8');
      assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100">/);
      assert.match(svg, /<(?:path|circle|rect|polygon)\b/);
      assert.doesNotMatch(svg, /<(?:script|style|metadata|title|desc)\b|<!--|\b(?:width|height|stroke|class|id)=/);
      assert.doesNotMatch(svg, /\n|\s{2,}/);
      assert.equal(attribution.svgoModified, true);
    } else {
      assert.match(file, /\.png$/);
      assert.deepEqual(readFileSync(path).subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      assert.equal(attribution.svgoModified, false);
    }
    assert.ok(attribution.title && attribution.creator && attribution.sourceUrl && attribution.license);
    if (attribution.kind === 'third-party') {
      assert.match(attribution.license, /^(?:Public Domain|CC BY 3\.0)$/);
      assert.match(notice, new RegExp(attribution.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });
});

test('scene pictograms use one legible subject rather than a grid of miniature symbols', () => {
  const catalogue = readJson<CatalogueManifest>('icons/catalogue.json');
  const scenes = catalogue.icons.filter(({ category }) => category === 'Starter scenes');
  assert.equal(scenes.length, 59);
  for (const { key, file } of scenes) {
    const svg = readFileSync(publicFile(`icons/${file}`), 'utf8');
    assert.doesNotMatch(svg, /<g\b|transform=/, `${key} contains a nested miniature symbol`);
    assert.ok(
      (svg.match(/<(?:path|circle|rect|polygon|ellipse)\b/g) ?? []).length <= 4,
      `${key} contains too many separate miniatures`
    );
  }
});

test('public starter cards display one icon rather than shrinking a grid', () => {
  for (const language of ['nl', 'en']) {
    const bundle = readJson<DataModel>(`starter-bundles/${language}.json`);
    for (const script of bundle.crimeScripts) {
      assert.deepEqual(script.icons, [script.icon], `${script.id} displays miniature icon tiles`);
    }
  }
});

test('the production deployment contains the catalogue metadata, notice, and every icon', () => {
  const catalogue = readJson<CatalogueManifest>('icons/catalogue.json');
  const deployedRoot = '../../docs/icons';

  ['nl.json', 'en.json', 'icon-requirements.nl.json', 'icon-requirements.en.json', 'NOTICE.nl.md', 'NOTICE.en.md'].forEach((file) => {
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
    assert.deepEqual(readFileSync(`${deployedRoot}/${file}`), readFileSync(publicFile(`icons/${file}`)));
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

test('icon compositions resolve up to four symbols and retain legacy fallback', () => {
  const upload = 'data:image/png;base64,dXNlci1pbWFnZQ==';
  const iconKeys = BUILT_IN_ICONS.slice(0, 4).map(({ key }) => key);

  assert.deepEqual(resolveIconSources(undefined, iconKeys[0]), [`icons/${BUILT_IN_ICONS[0].file}`]);
  assert.deepEqual(resolveIconSources([ICONS.OTHER], undefined, upload), [upload]);
  assert.equal(resolveIconSources(iconKeys).length, 4);
  assert.deepEqual(resolveIconSources([999_999 as ICONS], iconKeys[0]), []);
});

test('model normalization promotes legacy icons and caps compositions', () => {
  const legacyIcon = BUILT_IN_ICONS[0].key;
  const model = normalizeDataModel({
    crimeScripts: [
      { id: 'legacy', label: 'Legacy', icon: legacyIcon, stages: [] },
      { id: 'composed', label: 'Composed', icons: BUILT_IN_ICONS.slice(0, 4).map(({ key }) => key), stages: [] },
    ],
  });

  assert.deepEqual(model.crimeScripts[0].icons, [legacyIcon]);
  assert.equal(model.crimeScripts[1].icons?.length, 4);
});

test('normalization and export retain script visuals but discard scene visuals', () => {
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
          variants: [{
            id: 'variant',
            label: 'Variant',
            icon: 'builtin:port-security',
            url: 'data:image/png;base64,dmFyaWFudA==',
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

  const exported = createSingleScriptExportModel(model.crimeScripts[0], model, 123);
  assert.equal(exported.crimeScripts[0].icon, 'builtin:port-security');
  assert.equal(exported.crimeScripts[0].url, 'data:image/png;base64,c2NyaXB0');
  const exportedScene = exported.crimeScripts[0].stages[0] as unknown as {
    icon?: unknown;
    url?: unknown;
  };
  assert.equal(exportedScene.icon, undefined);
  assert.equal(exportedScene.url, undefined);
  const exportedVariant = exported.crimeScripts[0].stages[0].variants[0] as unknown as {
    icon?: unknown;
    url?: unknown;
  };
  assert.equal(exportedVariant.icon, undefined);
  assert.equal(exportedVariant.url, undefined);
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

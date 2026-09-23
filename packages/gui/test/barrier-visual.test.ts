import assert from 'node:assert/strict';
import test from 'node:test';
import type { CrimeScriptReport } from '../src/utils/report-model.ts';
import {
  buildBarrierMatrix,
  calculateBarrierRasterDimensions,
  paginateBarrierMatrix,
  renderBarrierMatrixSvg,
} from '../src/utils/barrier-visual.ts';

const report: CrimeScriptReport = {
  id: 'script',
  title: 'Arbeidsuitbuiting',
  description: 'Proces en barrières.',
  classification: 'restricted',
  language: 'nl',
  products: [],
  geographicScope: [],
  aiGenerated: false,
  unreviewed: false,
  exportedAt: '2026-09-23T20:00:00.000Z',
  updatedAt: '2026-09-20T12:00:00.000Z',
  references: [],
  scenes: [
    {
      id: 'recruitment',
      number: 1,
      label: 'Werving',
      variants: [
        {
          id: 'route-a',
          label: 'Hoofdroute',
          locations: [],
          steps: [],
          conditions: [],
          indicators: [],
          barriers: [
            {
              id: 'screen',
              label: 'Controleer arbeidsbemiddelaars',
              categoryId: '1_2',
              category: 'Toegang controleren',
              categoryGroup: 'Vergroot de inspanning',
              partners: ['Gemeente', 'Politie'],
            },
          ],
        },
      ],
    },
    {
      id: 'exploitation',
      number: 2,
      label: 'Uitbuiting',
      variants: [
        {
          id: 'route-b',
          label: 'Hoofdroute',
          locations: [],
          steps: [],
          conditions: [],
          indicators: [],
          barriers: [
            {
              id: 'screen-copy',
              label: 'Controleer arbeidsbemiddelaars',
              categoryId: '1_2',
              category: 'Toegang controleren',
              categoryGroup: 'Vergroot de inspanning',
              partners: ['Politie', 'Inspectie'],
            },
            {
              id: 'report',
              label: 'Maak melden veilig',
              categoryId: '2_1',
              category: 'Toezicht uitbreiden',
              categoryGroup: 'Vergroot de risico’s',
              partners: ['Gemeente'],
            },
          ],
        },
      ],
    },
  ],
};

test('barrier matrix lists each barrier once and merges partners per scene', () => {
  const matrix = buildBarrierMatrix(report);

  assert.deepEqual(matrix.groups, [
    {
      label: 'Vergroot de inspanning',
      rows: [
        {
          key: '1_2:controleer arbeidsbemiddelaars',
          label: 'Controleer arbeidsbemiddelaars',
          category: 'Toegang controleren',
          cells: [
            { sceneId: 'recruitment', partners: ['Gemeente', 'Politie'] },
            { sceneId: 'exploitation', partners: ['Inspectie', 'Politie'] },
          ],
        },
      ],
    },
    {
      label: 'Vergroot de risico’s',
      rows: [
        {
          key: '2_1:maak melden veilig',
          label: 'Maak melden veilig',
          category: 'Toezicht uitbreiden',
          cells: [
            { sceneId: 'recruitment', partners: [] },
            { sceneId: 'exploitation', partners: ['Gemeente'] },
          ],
        },
      ],
    },
  ]);
});

test('barrier matrix renders an accessible complete SVG without duplicating barriers', () => {
  const visual = renderBarrierMatrixSvg(buildBarrierMatrix(report), {
    title: 'Barrièremodel',
    noBarriers: 'Geen barrières beschikbaar.',
    partners: 'Partners',
    classification: 'Afgeschermd',
  });

  assert.match(visual.svg, /<svg[^>]+role="img"[^>]+aria-labelledby="barrier-title barrier-description"/);
  assert.match(visual.svg, /<title id="barrier-title">Barrièremodel — Arbeidsuitbuiting — Afgeschermd<\/title>/);
  assert.match(visual.svg, /<desc id="barrier-description">Afgeschermd\./);
  assert.match(visual.svg, />Afgeschermd<\/tspan>/);
  assert.match(visual.svg, />Werving<\/tspan>/);
  assert.match(visual.svg, />Uitbuiting<\/tspan>/);
  assert.equal(visual.svg.match(/Controleer arbeidsbemiddelaars/g)?.length, 1);
  assert.match(visual.svg, /Gemeente/);
  assert.match(visual.svg, /Inspectie/);
  assert.ok(visual.width >= 1200);
  assert.ok(visual.height > 300);
});

test('barrier matrix renders an explicit empty state', () => {
  const emptyReport: CrimeScriptReport = {
    ...report,
    scenes: report.scenes.map((scene) => ({
      ...scene,
      variants: scene.variants.map((variant) => ({ ...variant, barriers: [] })),
    })),
  };

  const visual = renderBarrierMatrixSvg(buildBarrierMatrix(emptyReport), {
    title: 'Barrièremodel',
    noBarriers: 'Geen barrières beschikbaar.',
    partners: 'Partners',
    classification: 'Afgeschermd',
  });

  assert.match(visual.svg, /Geen barrières beschikbaar\./);
});

test('large barrier matrices paginate without losing or duplicating rows', () => {
  const matrix = buildBarrierMatrix(report);
  const sourceRow = matrix.groups[0].rows[0];
  matrix.groups[0].rows = Array.from({ length: 23 }, (_, index) => ({
    ...sourceRow,
    key: `${sourceRow.key}-${index}`,
    label: `${sourceRow.label} ${index + 1}`,
  }));

  const pages = paginateBarrierMatrix(matrix, 10);
  const pageRows = pages.flatMap((page) => page.groups.flatMap((group) => group.rows));

  assert.equal(pages.length, 3);
  assert.ok(pages.every((page) => page.groups.reduce((sum, group) => sum + group.rows.length, 0) <= 10));
  assert.deepEqual(pageRows.map(({ key }) => key), matrix.groups.flatMap((group) => group.rows.map(({ key }) => key)));
});

test('wide barrier matrices paginate scene columns and retain matching cells', () => {
  const matrix = buildBarrierMatrix(report);
  const sourceScene = matrix.scenes[0];
  const sourceCell = matrix.groups[0].rows[0].cells[0];
  matrix.scenes = Array.from({ length: 9 }, (_, index) => ({
    ...sourceScene,
    id: `scene-${index}`,
    number: index + 1,
  }));
  matrix.groups = matrix.groups.map((group) => ({
    ...group,
    rows: group.rows.map((row) => ({
      ...row,
      cells: matrix.scenes.map((scene) => ({ ...sourceCell, sceneId: scene.id })),
    })),
  }));

  const pages = paginateBarrierMatrix(matrix, 10, 4);

  assert.equal(pages.length, 3);
  assert.deepEqual(pages.map((page) => page.scenes.length), [4, 4, 1]);
  pages.forEach((page) => {
    const sceneIds = page.scenes.map(({ id }) => id);
    assert.ok(page.groups.every((group) =>
      group.rows.every((row) => row.cells.map(({ sceneId }) => sceneId).join() === sceneIds.join())
    ));
  });
});

test('PNG raster dimensions respect side and pixel-area budgets', () => {
  assert.deepEqual(
    calculateBarrierRasterDimensions({ width: 8192, height: 8192 }, 8192, 16_000_000),
    { width: 4000, height: 4000 }
  );
  const portrait = calculateBarrierRasterDimensions({ width: 1200, height: 6000 }, 4096, 4_000_000);
  assert.ok(portrait.width <= 4096);
  assert.ok(portrait.height <= 4096);
  assert.ok(portrait.width * portrait.height <= 4_000_000);
});

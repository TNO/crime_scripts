import type { CrimeScriptReport } from './report-model.ts';

export type BarrierMatrixCell = {
  sceneId: string;
  partners: string[];
};

export type BarrierMatrixRow = {
  key: string;
  label: string;
  category: string;
  cells: BarrierMatrixCell[];
};

export type BarrierMatrixGroup = {
  label: string;
  rows: BarrierMatrixRow[];
};

export type BarrierMatrix = {
  title: string;
  classification: CrimeScriptReport['classification'];
  scenes: Array<{ id: string; number: number; label: string }>;
  groups: BarrierMatrixGroup[];
};

export type BarrierVisualLabels = {
  title: string;
  noBarriers: string;
  partners: string;
  classification: string;
};

export type BarrierVisual = {
  svg: string;
  width: number;
  height: number;
};

const normalizedKey = (categoryId: string, label: string): string =>
  `${categoryId}:${label.trim().replace(/\s+/g, ' ').toLocaleLowerCase()}`;

export const buildBarrierMatrix = (report: CrimeScriptReport): BarrierMatrix => {
  const scenes = report.scenes.map(({ id, number, label }) => ({ id, number, label }));
  const groupOrder: string[] = [];
  const rowsByGroup = new Map<string, Map<string, {
    label: string;
    category: string;
    partnersByScene: Map<string, Set<string>>;
  }>>();

  report.scenes.forEach((scene) => {
    scene.variants.forEach((variant) => {
      variant.barriers.forEach((barrier) => {
        const groupLabel = barrier.categoryGroup || barrier.category || barrier.categoryId;
        if (!rowsByGroup.has(groupLabel)) {
          groupOrder.push(groupLabel);
          rowsByGroup.set(groupLabel, new Map());
        }
        const key = normalizedKey(barrier.categoryId, barrier.label);
        const group = rowsByGroup.get(groupLabel)!;
        const row = group.get(key) || {
          label: barrier.label,
          category: barrier.category,
          partnersByScene: new Map<string, Set<string>>(),
        };
        const partners = row.partnersByScene.get(scene.id) || new Set<string>();
        barrier.partners.forEach((partner) => partners.add(partner));
        row.partnersByScene.set(scene.id, partners);
        group.set(key, row);
      });
    });
  });

  return {
    title: report.title,
    classification: report.classification,
    scenes,
    groups: groupOrder.map((label) => ({
      label,
      rows: [...rowsByGroup.get(label)!.entries()].map(([key, row]) => ({
        key,
        label: row.label,
        category: row.category,
        cells: scenes.map(({ id }) => ({
          sceneId: id,
          partners: [...(row.partnersByScene.get(id) || [])].sort((left, right) => left.localeCompare(right)),
        })),
      })),
    })),
  };
};

export const paginateBarrierMatrix = (
  matrix: BarrierMatrix,
  maximumRows = 10,
  maximumScenes = 4
): BarrierMatrix[] => {
  if (maximumRows < 1) throw new Error('maximumRows must be at least 1.');
  if (maximumScenes < 1) throw new Error('maximumScenes must be at least 1.');
  if (matrix.groups.length === 0) return [matrix];

  const rowPages: BarrierMatrix[] = [];
  let groups: BarrierMatrixGroup[] = [];
  let rowCount = 0;
  const flush = () => {
    if (groups.length === 0) return;
    rowPages.push({ ...matrix, groups });
    groups = [];
    rowCount = 0;
  };

  matrix.groups.forEach((group) => {
    let offset = 0;
    while (offset < group.rows.length) {
      if (rowCount === maximumRows) flush();
      const available = maximumRows - rowCount;
      const rows = group.rows.slice(offset, offset + available);
      groups.push({ label: group.label, rows });
      rowCount += rows.length;
      offset += rows.length;
      if (rowCount === maximumRows) flush();
    }
  });
  flush();
  return rowPages.flatMap((page) => {
    const scenePages = Array.from(
      { length: Math.ceil(page.scenes.length / maximumScenes) },
      (_, index) => page.scenes.slice(index * maximumScenes, (index + 1) * maximumScenes)
    );
    return scenePages.map((scenes) => {
      const sceneIds = new Set(scenes.map(({ id }) => id));
      return {
        ...page,
        scenes,
        groups: page.groups.map((group) => ({
          ...group,
          rows: group.rows.map((row) => ({
            ...row,
            cells: row.cells.filter(({ sceneId }) => sceneIds.has(sceneId)),
          })),
        })),
      };
    });
  });
};

export const calculateBarrierRasterDimensions = (
  visual: Pick<BarrierVisual, 'width' | 'height'>,
  maximumDimension = 8192,
  maximumPixelArea = 16_000_000
): { width: number; height: number } => {
  if (maximumDimension < 1) throw new Error('maximumDimension must be at least 1.');
  if (maximumPixelArea < 1) throw new Error('maximumPixelArea must be at least 1.');
  const areaScale = Math.sqrt(maximumPixelArea / (visual.width * visual.height));
  const scale = Math.min(
    2,
    maximumDimension / visual.width,
    maximumDimension / visual.height,
    areaScale
  );
  return {
    width: Math.max(1, Math.floor(visual.width * scale)),
    height: Math.max(1, Math.floor(visual.height * scale)),
  };
};

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const wrapText = (value: string, maxCharacters: number): string[] => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return words.reduce((lines, word) => {
    const current = lines[lines.length - 1];
    if (!current || `${current} ${word}`.length > maxCharacters) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`;
    return lines;
  }, [] as string[]);
};

const svgTextLines = (
  lines: string[],
  x: number,
  y: number,
  options: { className: string; lineHeight: number; anchor?: 'start' | 'middle' }
): string => {
  const anchor = options.anchor || 'start';
  return `<text class="${options.className}" x="${x}" y="${y}" text-anchor="${anchor}">${lines
    .map((line, index) =>
      `<tspan x="${x}" dy="${index === 0 ? 0 : options.lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('')}</text>`;
};

export const renderBarrierMatrixSvg = (
  matrix: BarrierMatrix,
  labels: BarrierVisualLabels
): BarrierVisual => {
  const outerPadding = 36;
  const labelColumnWidth = 390;
  const sceneColumnWidth = 180;
  const titleHeight = 92;
  const sceneHeaderHeight = 108;
  const groupHeaderHeight = 42;
  const minWidth = 1200;
  const contentWidth = labelColumnWidth + Math.max(matrix.scenes.length, 1) * sceneColumnWidth;
  const width = Math.max(minWidth, outerPadding * 2 + contentWidth);
  const matrixWidth = width - outerPadding * 2;
  const resolvedSceneWidth = matrix.scenes.length > 0
    ? (matrixWidth - labelColumnWidth) / matrix.scenes.length
    : matrixWidth - labelColumnWidth;

  const rowLayouts = matrix.groups.flatMap((group) => [
    { type: 'group' as const, height: groupHeaderHeight, group },
    ...group.rows.map((row) => {
      const barrierLines = wrapText(row.label, 42);
      const categoryLines = wrapText(row.category, 46);
      const partnerLineCount = Math.max(
        1,
        ...row.cells.map((cell) => wrapText(cell.partners.join(', '), Math.max(14, Math.floor(resolvedSceneWidth / 8.5))).length)
      );
      const height = Math.max(
        84,
        24 + barrierLines.length * 20 + categoryLines.length * 16,
        28 + partnerLineCount * 18
      );
      return { type: 'row' as const, height, row, barrierLines, categoryLines };
    }),
  ]);
  const bodyHeight = rowLayouts.reduce((sum, layout) => sum + layout.height, 0);
  const emptyHeight = matrix.groups.length === 0 ? 150 : 0;
  const height = titleHeight + sceneHeaderHeight + bodyHeight + emptyHeight + outerPadding;
  const classificationColor = matrix.classification === 'restricted' ? '#9c1c2b' : '#2f5496';
  const contentDescription = matrix.groups.length > 0
    ? `${matrix.groups.reduce((sum, group) => sum + group.rows.length, 0)} barriers across ${matrix.scenes.length} scenes.`
    : labels.noBarriers;
  const description = `${labels.classification}. ${contentDescription}`;
  const classificationWidth = Math.max(128, labels.classification.length * 9 + 32);

  const svg: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="barrier-title barrier-description">`,
    `<title id="barrier-title">${escapeXml(labels.title)} — ${escapeXml(matrix.title)} — ${escapeXml(labels.classification)}</title>`,
    `<desc id="barrier-description">${escapeXml(description)}</desc>`,
    '<style>',
    '.title{font:700 28px Arial,sans-serif;fill:#17365d}.subtitle{font:400 14px Arial,sans-serif;fill:#5b6573}',
    '.classification{font:700 13px Arial,sans-serif;fill:#fff;letter-spacing:.5px}',
    '.scene-number{font:700 15px Arial,sans-serif;fill:#fff}.scene-label{font:700 15px Arial,sans-serif;fill:#17365d}',
    '.group-label{font:700 15px Arial,sans-serif;fill:#fff}.barrier-label{font:700 15px Arial,sans-serif;fill:#17365d}',
    '.category-label{font:400 12px Arial,sans-serif;fill:#5b6573}.partner-label{font:400 13px Arial,sans-serif;fill:#1f2933}',
    '.empty-label{font:400 16px Arial,sans-serif;fill:#5b6573}',
    '</style>',
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
    `<rect x="${outerPadding}" y="28" width="8" height="42" rx="4" fill="${classificationColor}"/>`,
    svgTextLines([matrix.title], outerPadding + 24, 50, { className: 'title', lineHeight: 32 }),
    svgTextLines([labels.title], outerPadding + 24, 72, { className: 'subtitle', lineHeight: 18 }),
    `<rect x="${width - outerPadding - classificationWidth}" y="35" width="${classificationWidth}" height="28" rx="14" fill="${classificationColor}"/>`,
    svgTextLines(
      [labels.classification],
      width - outerPadding - classificationWidth / 2,
      54,
      { className: 'classification', lineHeight: 16, anchor: 'middle' }
    ),
  ];

  const headerY = titleHeight;
  svg.push(
    `<rect x="${outerPadding}" y="${headerY}" width="${labelColumnWidth}" height="${sceneHeaderHeight}" fill="#eef1f4" stroke="#c9d1d9"/>`,
    svgTextLines([labels.partners], outerPadding + 18, headerY + 61, { className: 'scene-label', lineHeight: 18 })
  );
  matrix.scenes.forEach((scene, sceneIndex) => {
    const x = outerPadding + labelColumnWidth + sceneIndex * resolvedSceneWidth;
    const center = x + resolvedSceneWidth / 2;
    const sceneLines = wrapText(scene.label, Math.max(14, Math.floor(resolvedSceneWidth / 8)));
    svg.push(
      `<rect x="${x}" y="${headerY}" width="${resolvedSceneWidth}" height="${sceneHeaderHeight}" fill="#f7f9fb" stroke="#c9d1d9"/>`,
      `<circle cx="${center}" cy="${headerY + 31}" r="17" fill="#2f5496"/>`,
      svgTextLines([String(scene.number)], center, headerY + 36, {
        className: 'scene-number',
        lineHeight: 18,
        anchor: 'middle',
      }),
      svgTextLines(sceneLines, center, headerY + 68, {
        className: 'scene-label',
        lineHeight: 18,
        anchor: 'middle',
      })
    );
  });

  let y = titleHeight + sceneHeaderHeight;
  rowLayouts.forEach((layout, layoutIndex) => {
    if (layout.type === 'group') {
      svg.push(
        `<rect x="${outerPadding}" y="${y}" width="${matrixWidth}" height="${layout.height}" fill="#17365d"/>`,
        svgTextLines([layout.group.label], outerPadding + 16, y + 27, {
          className: 'group-label',
          lineHeight: 18,
        })
      );
      y += layout.height;
      return;
    }

    const rowFill = layoutIndex % 2 === 0 ? '#ffffff' : '#f9fafb';
    svg.push(
      `<rect x="${outerPadding}" y="${y}" width="${labelColumnWidth}" height="${layout.height}" fill="${rowFill}" stroke="#c9d1d9"/>`,
      svgTextLines(layout.barrierLines, outerPadding + 16, y + 26, {
        className: 'barrier-label',
        lineHeight: 20,
      }),
      svgTextLines(
        layout.categoryLines,
        outerPadding + 16,
        y + 30 + layout.barrierLines.length * 20,
        { className: 'category-label', lineHeight: 16 }
      )
    );
    layout.row.cells.forEach((cell, sceneIndex) => {
      const x = outerPadding + labelColumnWidth + sceneIndex * resolvedSceneWidth;
      const partnerLines = cell.partners.length > 0
        ? wrapText(cell.partners.join(', '), Math.max(14, Math.floor(resolvedSceneWidth / 8.5)))
        : ['—'];
      svg.push(
        `<rect x="${x}" y="${y}" width="${resolvedSceneWidth}" height="${layout.height}" fill="${cell.partners.length > 0 ? '#edf4fb' : rowFill}" stroke="#c9d1d9"/>`,
        svgTextLines(partnerLines, x + resolvedSceneWidth / 2, y + 31, {
          className: 'partner-label',
          lineHeight: 18,
          anchor: 'middle',
        })
      );
    });
    y += layout.height;
  });

  if (matrix.groups.length === 0) {
    svg.push(
      `<rect x="${outerPadding}" y="${y}" width="${matrixWidth}" height="${emptyHeight}" fill="#f7f9fb" stroke="#c9d1d9"/>`,
      svgTextLines([labels.noBarriers], width / 2, y + 82, {
        className: 'empty-label',
        lineHeight: 20,
        anchor: 'middle',
      })
    );
  }

  svg.push('</svg>');
  return { svg: svg.join(''), width, height };
};

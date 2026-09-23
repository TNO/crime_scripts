import {
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableOfContents,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import type { CrimeScript, DataModel } from '../models/data-model.ts';
import { lookupCrimeMeasure } from '../models/situational-crime-prevention.ts';
import { t } from '../services/translations.ts';
import { barrierVisualToPngBlob, createCrimeScriptBarrierVisual } from './barrier-export.ts';
import { paginateBarrierMatrix, renderBarrierMatrixSvg } from './barrier-visual.ts';
import { buildCrimeScriptReport, type CrimeScriptReport, type ReportBarrier, type ReportStep } from './report-model.ts';

const navy = '17365D';
const blue = '2F5496';
const paleBlue = 'DCE6F1';
const paleGrey = 'EEF1F4';
const midGrey = '5B6573';
const white = 'FFFFFF';
const restrictedRed = '9C1C2B';
const pageWidthTwips = convertInchesToTwip(6.55);

const border = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: 'C9D1D9',
};

const tableBorders = {
  top: border,
  bottom: border,
  left: border,
  right: border,
  insideHorizontal: border,
  insideVertical: border,
};

const readableText = (value: string): string =>
  value
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/(\*\*|__|~~)/g, '')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
    .replace(/(^|[^_])_([^_]+)_/g, '$1$2');

const textParagraphs = (value?: string): Paragraph[] =>
  value
    ? value
        .split(/\r?\n\s*\r?\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph) => new Paragraph(readableText(paragraph)))
    : [];

const labelRun = (label: string) => new TextRun({ text: label, bold: true, color: navy });

const metadataRow = (label: string, value: string): TableRow =>
  new TableRow({
    cantSplit: true,
    children: [
      new TableCell({
        width: { size: 28, type: WidthType.PERCENTAGE },
        shading: { fill: paleGrey, type: ShadingType.CLEAR },
        margins: { top: 90, bottom: 90, left: 120, right: 120 },
        children: [new Paragraph({ children: [labelRun(label)] })],
      }),
      new TableCell({
        width: { size: 72, type: WidthType.PERCENTAGE },
        margins: { top: 90, bottom: 90, left: 120, right: 120 },
        children: [new Paragraph(value)],
      }),
    ],
  });

const sectionHeading = (
  text: string,
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2
) =>
  new Paragraph({
    text,
    heading: level,
    keepNext: true,
  });

const detailParagraph = (label: string, values: string[]): Paragraph | undefined =>
  values.length > 0
    ? new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [labelRun(`${label}: `), new TextRun(values.join(', '))],
      })
    : undefined;

const stepCell = (step: ReportStep, nested = false): TableCell => {
  const details = [
    detailParagraph(t('CAST'), step.cast),
    detailParagraph(t('ATTRIBUTES'), step.attributes),
    detailParagraph(t('TRANSPORTS', step.transports.length), step.transports),
  ].filter((paragraph): paragraph is Paragraph => paragraph !== undefined);
  return new TableCell({
    width: { size: 88, type: WidthType.PERCENTAGE },
    margins: { top: 100, bottom: 100, left: nested ? 240 : 140, right: 140 },
    children: [
      new Paragraph({
        spacing: { after: step.description ? 60 : 0 },
        children: [new TextRun({ text: step.label, bold: true, color: navy })],
      }),
      ...textParagraphs(step.description),
      ...details,
    ],
  });
};

const stepRows = (step: ReportStep, nested = false): TableRow[] => [
  new TableRow({
    cantSplit: true,
    children: [
      new TableCell({
        width: { size: 12, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.TOP,
        shading: { fill: nested ? paleGrey : paleBlue, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: step.number, bold: true, color: navy })],
          }),
        ],
      }),
      stepCell(step, nested),
    ],
  }),
  ...step.children.flatMap((child) => stepRows(child, true)),
];

const labeledList = (
  title: string,
  values: Array<{ label: string; description?: string; type?: string }>
): Array<Paragraph> => {
  if (values.length === 0) return [];
  return [
    sectionHeading(title, HeadingLevel.HEADING_3),
    ...values.flatMap((value) => [
      new Paragraph({
        bullet: { level: 0 },
        keepNext: Boolean(value.description),
        children: [
          new TextRun({ text: value.label, bold: true }),
          ...(value.type ? [new TextRun({ text: ` — ${value.type}`, color: midGrey })] : []),
        ],
      }),
      ...textParagraphs(value.description),
    ]),
  ];
};

const barrierTable = (barriers: ReportBarrier[]): Table | undefined => {
  if (barriers.length === 0) return undefined;
  const headerCell = (text: string, width: number) =>
    new TableCell({
      width: { size: width, type: WidthType.PERCENTAGE },
      shading: { fill: navy, type: ShadingType.CLEAR },
      margins: { top: 90, bottom: 90, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: white })] })],
    });
  return new Table({
    width: { size: pageWidthTwips, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: tableBorders,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          headerCell(t('CATEGORY'), 24),
          headerCell(t('MEASURE'), 49),
          headerCell(t('PARTNERS'), 27),
        ],
      }),
      ...barriers.map((barrier) =>
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 24, type: WidthType.PERCENTAGE },
              shading: { fill: paleGrey, type: ShadingType.CLEAR },
              margins: { top: 90, bottom: 90, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: barrier.categoryGroup, bold: true, color: navy }),
                    ...(barrier.category
                      ? [new TextRun({ text: `\n${barrier.category}`, color: midGrey })]
                      : []),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 49, type: WidthType.PERCENTAGE },
              margins: { top: 90, bottom: 90, left: 100, right: 100 },
              children: [
                new Paragraph({
                  keepNext: Boolean(barrier.description),
                  children: [new TextRun({ text: barrier.label, bold: true })],
                }),
                ...textParagraphs(barrier.description),
              ],
            }),
            new TableCell({
              width: { size: 27, type: WidthType.PERCENTAGE },
              margins: { top: 90, bottom: 90, left: 100, right: 100 },
              children: [new Paragraph(barrier.partners.join(', ') || '—')],
            }),
          ],
        })
      ),
    ],
  });
};

const sceneOverview = (report: CrimeScriptReport): Table =>
  new Table({
    width: { size: pageWidthTwips, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: tableBorders,
    rows: report.scenes.map((scene) =>
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            shading: { fill: blue, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 120, bottom: 120, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: String(scene.number), bold: true, color: white, size: 28 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 88, type: WidthType.PERCENTAGE },
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            children: [
              new Paragraph({
                keepNext: Boolean(scene.description),
                children: [new TextRun({ text: scene.label, bold: true, color: navy, size: 24 })],
              }),
              ...textParagraphs(scene.description),
            ],
          }),
        ],
      })
    ),
  });

type BarrierImage = {
  data: Uint8Array;
  sourceWidth: number;
  sourceHeight: number;
};

const reportBody = (
  report: CrimeScriptReport,
  barrierImages: BarrierImage[] = []
): Array<Paragraph | Table | TableOfContents> => {
  const coverMetadata = [
    metadataRow(t('CLASSIFICATION'), t(report.classification === 'restricted' ? 'RESTRICTED' : 'PUBLIC')),
    metadataRow(t('LANGUAGE'), report.language === 'nl' ? 'Nederlands' : 'English'),
    metadataRow(t('PRODUCTS', report.products.length), report.products.join(', ') || '—'),
    metadataRow(t('GEOLOCATIONS', report.geographicScope.length), report.geographicScope.join(', ') || '—'),
    metadataRow(t('REVIEW_STATUS'), report.unreviewed ? t('UNREVIEWED') : t('REVIEWED')),
    metadataRow(t('UPDATED_AT'), new Date(report.updatedAt).toLocaleDateString(report.language)),
    metadataRow(t('EXPORTED_AT'), new Date(report.exportedAt).toLocaleString(report.language)),
  ];
  if (report.provenance) {
    coverMetadata.push(
      metadataRow(t('STARTER_PROVENANCE'), `${report.provenance.title} ${report.provenance.version}`)
    );
  }

  const children: Array<Paragraph | Table | TableOfContents> = [
    new Table({
      width: { size: pageWidthTwips, type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: white },
        bottom: { style: BorderStyle.NONE, size: 0, color: white },
        left: { style: BorderStyle.NONE, size: 0, color: white },
        right: { style: BorderStyle.NONE, size: 0, color: white },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: white },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: white },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: {
                fill: report.classification === 'restricted' ? restrictedRed : blue,
                type: ShadingType.CLEAR,
              },
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: t(report.classification === 'restricted' ? 'RESTRICTED' : 'PUBLIC').toUpperCase(),
                      bold: true,
                      color: white,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 500, after: 180 },
      children: [new TextRun({ text: report.title, bold: true, color: navy, size: 48 })],
    }),
    ...textParagraphs(report.description),
    new Paragraph({ spacing: { before: 360, after: 120 }, children: [new TextRun({ text: t('DETAILS'), bold: true, color: navy, size: 24 })] }),
    new Table({
      width: { size: pageWidthTwips, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      borders: tableBorders,
      rows: coverMetadata,
    }),
    ...(report.aiGenerated
      ? [
          new Paragraph({
            spacing: { before: 140 },
            children: [new TextRun({ text: t('AI_GENERATED'), italics: true, color: midGrey })],
          }),
        ]
      : []),
    ...(report.provenance?.attribution
      ? [new Paragraph({ children: [new TextRun({ text: report.provenance.attribution, italics: true, color: midGrey })] })]
      : []),
    ...(report.provenance?.license
      ? [
          new Paragraph({
            children: [
              labelRun(`${t('LICENSE')}: `),
              report.provenance.licenseUrl
                ? new ExternalHyperlink({
                    link: report.provenance.licenseUrl,
                    children: [
                      new TextRun({
                        text: report.provenance.license,
                        style: 'Hyperlink',
                      }),
                    ],
                  })
                : new TextRun(report.provenance.license),
            ],
          }),
        ]
      : []),
    ...(report.provenance?.disclaimer
      ? [
          new Paragraph({
            children: [
              labelRun(`${t('DISCLAIMER')}: `),
              new TextRun(report.provenance.disclaimer),
            ],
          }),
        ]
      : []),
    new Paragraph({ children: [new PageBreak()] }),
    sectionHeading(t('TABLE_OF_CONTENTS'), HeadingLevel.HEADING_1),
    new TableOfContents(t('TABLE_OF_CONTENTS'), { hyperlink: true, headingStyleRange: '1-3' }),
    new Paragraph({ children: [new PageBreak()] }),
    sectionHeading(t('SCRIPT_OVERVIEW'), HeadingLevel.HEADING_1),
    sceneOverview(report),
  ];
  if (barrierImages.length > 0) {
    barrierImages.forEach((barrierImage, index) => {
      const scale = Math.min(620 / barrierImage.sourceWidth, 520 / barrierImage.sourceHeight);
      const width = Math.round(barrierImage.sourceWidth * scale);
      const height = Math.round(barrierImage.sourceHeight * scale);
      if (index > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(
        sectionHeading(
          barrierImages.length > 1
            ? `${t('BARRIER_MODEL')} ${index + 1}/${barrierImages.length}`
            : t('BARRIER_MODEL'),
          HeadingLevel.HEADING_2
        ),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: 'png',
              data: barrierImage.data,
              transformation: { width, height },
              altText: {
                title: `${t('BARRIER_MODEL')} — ${report.title} — ${index + 1}/${barrierImages.length}`,
                description: t('BARRIER_MODEL_ALT'),
                name: `barrier-model-${index + 1}`,
              },
            }),
          ],
        })
      );
    });
    children.push(
      new Paragraph({
        children: [new TextRun({ text: t('BARRIER_MODEL_FALLBACK'), italics: true, color: midGrey })],
      })
    );
  }

  report.scenes.forEach((scene) => {
    children.push(
      new Paragraph({
        text: `${t('SCENE')} ${scene.number}: ${scene.label}`,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        keepNext: true,
      }),
      ...textParagraphs(scene.description)
    );
    scene.variants.forEach((variant) => {
      children.push(sectionHeading(variant.label, HeadingLevel.HEADING_2), ...textParagraphs(variant.description));
      const locations = detailParagraph(t('LOCATIONS', variant.locations.length), variant.locations);
      if (locations) children.push(locations);
      if (variant.steps.length > 0) {
        children.push(
          sectionHeading(t('ACTIVITIES'), HeadingLevel.HEADING_3),
          new Table({
            width: { size: pageWidthTwips, type: WidthType.DXA },
            layout: TableLayoutType.FIXED,
            borders: tableBorders,
            rows: variant.steps.flatMap((step) => stepRows(step)),
          })
        );
      }
      children.push(
        ...labeledList(t('CONDITIONS'), variant.conditions),
        ...labeledList(t('INDICATORS'), variant.indicators)
      );
      const barriers = barrierTable(variant.barriers);
      if (barriers) children.push(sectionHeading(t('MEASURES'), HeadingLevel.HEADING_3), barriers);
    });
  });

  if (report.references.length > 0) {
    children.push(
      new Paragraph({
        text: t('REFERENCES'),
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        keepNext: true,
      })
    );
    report.references.forEach((reference, index) => {
      const title = reference.url
        ? new ExternalHyperlink({
            link: reference.url,
            children: [new TextRun({ text: reference.label, style: 'Hyperlink', bold: true })],
          })
        : new TextRun({ text: reference.label, bold: true });
      children.push(
        new Paragraph({
          keepNext: Boolean(reference.description || reference.usedFor),
          children: [new TextRun({ text: `${index + 1}. ` }), title],
        })
      );
      if (reference.authors) {
        children.push(new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: reference.authors, italics: true })] }));
      }
      children.push(...textParagraphs(reference.description));
      if (reference.usedFor) {
        children.push(new Paragraph({ indent: { left: 240 }, children: [labelRun(`${t('USED_FOR')}: `), new TextRun(reference.usedFor)] }));
      }
    });
  }
  return children;
};

export const createCrimeScriptWordDocument = (
  crimeScript: CrimeScript,
  model: DataModel,
  exportedAt = new Date(),
  barrierImages: BarrierImage[] = []
): Document => {
  const report = buildCrimeScriptReport(crimeScript, model, lookupCrimeMeasure(), exportedAt);
  const classification = t(report.classification === 'restricted' ? 'RESTRICTED' : 'PUBLIC').toUpperCase();
  return new Document({
    creator: 'TNO',
    title: report.title,
    description: report.description,
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 21, color: '1F2933', language: { value: report.language === 'nl' ? 'nl-NL' : 'en-GB' } },
          paragraph: { spacing: { after: 120, line: 276 } },
        },
        heading1: {
          run: { font: 'Arial', size: 32, bold: true, color: navy },
          paragraph: { spacing: { before: 320, after: 160 }, keepNext: true },
        },
        heading2: {
          run: { font: 'Arial', size: 27, bold: true, color: blue },
          paragraph: { spacing: { before: 260, after: 120 }, keepNext: true },
        },
        heading3: {
          run: { font: 'Arial', size: 23, bold: true, color: navy },
          paragraph: { spacing: { before: 220, after: 100 }, keepNext: true },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.8),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, color: 'C9D1D9', size: 4 } },
                children: [
                  new TextRun({ text: report.title, bold: true, color: navy }),
                  new TextRun({ text: `  |  ${classification}`, bold: true, color: report.classification === 'restricted' ? restrictedRed : blue }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'PAX Crime Scripting  |  ', color: midGrey }),
                  new TextRun({ children: [PageNumber.CURRENT], color: midGrey }),
                  new TextRun({ text: ' / ', color: midGrey }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], color: midGrey }),
                ],
              }),
            ],
          }),
        },
        children: reportBody(report, barrierImages),
      },
    ],
  });
};

export const toWord = async (filename: string, crimeScript: CrimeScript, model: DataModel) => {
  const barrierModel = createCrimeScriptBarrierVisual(crimeScript, model);
  const barrierImages: BarrierImage[] = [];
  if (barrierModel.matrix.groups.length > 0) {
    const classification = t(
      barrierModel.matrix.classification === 'restricted' ? 'RESTRICTED' : 'PUBLIC'
    ).toUpperCase();
    for (const page of paginateBarrierMatrix(barrierModel.matrix, 6, 4)) {
      const visual = renderBarrierMatrixSvg(page, {
        title: t('BARRIER_MODEL'),
        noBarriers: t('NO_BARRIERS'),
        partners: t('PARTNERS'),
        classification,
      });
      const blob = await barrierVisualToPngBlob(visual, 2048, 4_000_000);
      barrierImages.push({
        data: new Uint8Array(await blob.arrayBuffer()),
        sourceWidth: visual.width,
        sourceHeight: visual.height,
      });
    }
  }
  const document = createCrimeScriptWordDocument(crimeScript, model, new Date(), barrierImages);
  const blob = await Packer.toBlob(document);
  saveAs(blob, filename);
};

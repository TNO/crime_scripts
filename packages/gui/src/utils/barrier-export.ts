import { saveAs } from 'file-saver';
import type { CrimeScript, DataModel } from '../models/data-model.ts';
import { lookupCrimeMeasure } from '../models/situational-crime-prevention';
import { t } from '../services/translations.ts';
import {
  buildBarrierMatrix,
  calculateBarrierRasterDimensions,
  renderBarrierMatrixSvg,
  type BarrierMatrix,
  type BarrierVisual,
} from './barrier-visual.ts';
import { buildCrimeScriptReport } from './report-model.ts';

export type CrimeScriptBarrierVisual = {
  matrix: BarrierMatrix;
  visual: BarrierVisual;
};

export const createCrimeScriptBarrierVisual = (
  crimeScript: CrimeScript,
  model: DataModel,
  exportedAt = new Date()
): CrimeScriptBarrierVisual => {
  const report = buildCrimeScriptReport(crimeScript, model, lookupCrimeMeasure(), exportedAt);
  const matrix = buildBarrierMatrix(report);
  return {
    matrix,
    visual: renderBarrierMatrixSvg(matrix, {
      title: t('BARRIER_MODEL'),
      noBarriers: t('NO_BARRIERS'),
      partners: t('PARTNERS'),
      classification: t(matrix.classification === 'restricted' ? 'RESTRICTED' : 'PUBLIC').toUpperCase(),
    }),
  };
};

export const barrierVisualToPngBlob = async (
  visual: BarrierVisual,
  maximumDimension = 8192,
  maximumPixelArea = 16_000_000
): Promise<Blob> => {
  const { width, height } = calculateBarrierRasterDimensions(
    visual,
    maximumDimension,
    maximumPixelArea
  );
  const source = new Blob([visual.svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(source);

  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(t('BARRIER_RENDER_FAILED')));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error(t('BARRIER_RENDER_FAILED'));
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!png) throw new Error(t('BARRIER_RENDER_FAILED'));
    return png;
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const toBarrierSvg = (
  filename: string,
  crimeScript: CrimeScript,
  model: DataModel
) => {
  const { visual } = createCrimeScriptBarrierVisual(crimeScript, model);
  saveAs(new Blob([visual.svg], { type: 'image/svg+xml;charset=utf-8' }), filename);
};

export const toBarrierPng = async (
  filename: string,
  crimeScript: CrimeScript,
  model: DataModel
) => {
  const { visual } = createCrimeScriptBarrierVisual(crimeScript, model);
  saveAs(await barrierVisualToPngBlob(visual), filename);
};

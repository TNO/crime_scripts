import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { CrimeScript, DataModel } from './data-model.ts';
import { normalizeUploadedDataModel } from './model-normalization.ts';
import { canShareModel, filterModelForPublicExport } from './script-classification.ts';
import { createSingleScriptExportModel } from './single-script-export.ts';

const FILE_NAME = 'script.json';
const MAX_PAYLOAD_LENGTH = 150_000;
const MAX_MODEL_BYTES = 5_000_000;

export const sharedScriptPayloadFromHash = (hash: string): string | null => {
  const queryStart = hash.indexOf('?');
  return queryStart < 0 ? null : new URLSearchParams(hash.slice(queryStart + 1)).get('shared');
};

export const encodeSharedScript = (script: CrimeScript, model: DataModel): string => {
  if (script.classification !== 'public') throw new Error('Restricted scripts cannot be shared by link.');
  const publicModel = filterModelForPublicExport(model);
  const exportModel = createSingleScriptExportModel(script, publicModel);
  if (!canShareModel(exportModel)) throw new Error('Restricted content cannot be shared by link.');

  const json = strToU8(JSON.stringify(exportModel));
  if (json.length > MAX_MODEL_BYTES) throw new Error('This script is too large to share by link.');
  const zip = zipSync({ [FILE_NAME]: json }, { level: 9 });
  const chunks: string[] = [];
  for (let offset = 0; offset < zip.length; offset += 8192) {
    chunks.push(String.fromCharCode(...zip.subarray(offset, offset + 8192)));
  }
  const payload = btoa(chunks.join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (payload.length > MAX_PAYLOAD_LENGTH) throw new Error('This script is too large to share by link.');
  return payload;
};

export const decodeSharedScript = (payload: string): DataModel => {
  if (!payload || payload.length > MAX_PAYLOAD_LENGTH || !/^[A-Za-z0-9_-]+$/.test(payload)) {
    throw new Error('Invalid shared-script link.');
  }
  const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '='));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const files = unzipSync(bytes, {
    filter: ({ name, originalSize }) => name === FILE_NAME && originalSize <= MAX_MODEL_BYTES,
  });
  if (!files[FILE_NAME] || Object.keys(files).length !== 1) throw new Error('Invalid shared-script archive.');
  const raw = JSON.parse(strFromU8(files[FILE_NAME])) as { crimeScripts?: Array<{ classification?: string }> };
  if (!raw || !Array.isArray(raw.crimeScripts) || raw.crimeScripts.length !== 1 ||
      raw.crimeScripts[0]?.classification !== 'public') {
    throw new Error('A shared link must contain one public crime script.');
  }
  const { model } = normalizeUploadedDataModel(raw);
  if (!canShareModel(model)) throw new Error('Restricted content cannot be shared by link.');
  model.previewMode = true;
  return model;
};

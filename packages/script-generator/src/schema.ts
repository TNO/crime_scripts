import type { GeneratorBrief } from './types.ts';
import { GeneratorError } from './errors.ts';

const nonEmpty = (value: unknown, path: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new GeneratorError('invalid-field', `${path} must be a non-empty string.`, path);
  }
  return value.trim();
};

export const validateBrief = (value: unknown): GeneratorBrief => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new GeneratorError('invalid-brief', 'brief.yaml must contain an object.', '$');
  }
  const brief = value as Partial<GeneratorBrief>;
  const allowed = new Set([
    'schemaVersion',
    'bundlePath',
    'scriptId',
    'subject',
    'purpose',
    'geography',
    'contentLanguage',
    'classification',
    'sourceSensitivity',
    'detail',
    'scriptIcon',
    'focus',
    'exclusions',
    'materialDirectory',
    'recursiveMaterials',
    'existingScriptId',
  ]);
  const unknown = Object.keys(brief).find((key) => !allowed.has(key));
  if (unknown) {
    throw new GeneratorError('unknown-field', `$.${unknown} is not supported.`, `$.${unknown}`);
  }
  if (brief.schemaVersion !== 1) {
    throw new GeneratorError('unsupported-schema', 'brief.yaml schemaVersion must be 1.', '$.schemaVersion');
  }
  nonEmpty(brief.bundlePath, '$.bundlePath');
  nonEmpty(brief.scriptId, '$.scriptId');
  nonEmpty(brief.subject, '$.subject');
  nonEmpty(brief.purpose, '$.purpose');
  nonEmpty(brief.geography, '$.geography');
  nonEmpty(brief.scriptIcon, '$.scriptIcon');
  if (brief.contentLanguage !== 'nl' && brief.contentLanguage !== 'en') {
    throw new GeneratorError('invalid-field', 'contentLanguage must be "nl" or "en".', '$.contentLanguage');
  }
  if (brief.classification !== 'public' && brief.classification !== 'restricted') {
    throw new GeneratorError('invalid-field', 'classification must be "public" or "restricted".', '$.classification');
  }
  if (brief.sourceSensitivity !== 'public' && brief.sourceSensitivity !== 'restricted') {
    throw new GeneratorError('invalid-field', 'sourceSensitivity must be "public" or "restricted".', '$.sourceSensitivity');
  }
  if (!['orienting', 'practical', 'operational'].includes(brief.detail || '')) {
    throw new GeneratorError('invalid-field', 'detail must be orienting, practical, or operational.', '$.detail');
  }
  for (const field of ['focus', 'exclusions'] as const) {
    const values = brief[field];
    if (
      values !== undefined &&
      (
        !Array.isArray(values) ||
        values.some((item) => typeof item !== 'string' || !item.trim())
      )
    ) {
      throw new GeneratorError('invalid-field', `${field} must contain non-empty strings.`, `$.${field}`);
    }
  }
  if (brief.materialDirectory !== undefined) nonEmpty(brief.materialDirectory, '$.materialDirectory');
  if (brief.existingScriptId !== undefined) nonEmpty(brief.existingScriptId, '$.existingScriptId');
  if (brief.existingScriptId !== undefined && brief.existingScriptId !== brief.scriptId) {
    throw new GeneratorError(
      'script-id-mismatch',
      'existingScriptId and scriptId must be identical in update mode.',
      '$.existingScriptId'
    );
  }
  if (brief.recursiveMaterials !== undefined && typeof brief.recursiveMaterials !== 'boolean') {
    throw new GeneratorError(
      'invalid-field',
      'recursiveMaterials must be a boolean.',
      '$.recursiveMaterials'
    );
  }
  return brief as GeneratorBrief;
};

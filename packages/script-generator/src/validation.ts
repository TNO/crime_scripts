import type { DataModel, ID } from '@crime-script/core/data-model';
import { findDanglingTaxonomyReferences } from '@crime-script/core/taxonomy-references';
import { GeneratorError } from './errors.ts';
import type {
  CandidateFile,
  EvidenceFile,
  ResearchLogFile,
} from './types.ts';

const object = (value: unknown, path: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new GeneratorError('invalid-field', `${path} must be an object.`, path);
  }
  return value as Record<string, unknown>;
};

const array = (value: unknown, path: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new GeneratorError('invalid-field', `${path} must be an array.`, path);
  }
  return value;
};

const string = (value: unknown, path: string, allowEmpty = false): string => {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) {
    throw new GeneratorError('invalid-field', `${path} must be a${allowEmpty ? '' : ' non-empty'} string.`, path);
  }
  return value;
};

const normalizedLabel = (value: string): string =>
  value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/["'“”‘’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const genericModusOperandiLabels = new Set([
  'default',
  'default route',
  'hoofdroute',
  'main route',
  'openbaar barrièremodel',
  'primary route',
  'regular route',
  'route',
  'standard route',
  'variant',
]);

const optionalStringArray = (value: unknown, path: string): void => {
  if (value === undefined) return;
  array(value, path).forEach((item, index) => string(item, `${path}[${index}]`));
};

const onlyKeys = (value: Record<string, unknown>, allowed: string[], path: string): void => {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown) {
    throw new GeneratorError('unknown-field', `${path}.${unknown} is not supported.`, `${path}.${unknown}`);
  }
};

const validateCandidateTaxonomy = (value: unknown, path: string): void => {
  const item = object(value, path);
  onlyKeys(item, ['key', 'id', 'label', 'description', 'synonyms', 'parentKeys'], path);
  string(item.key, `${path}.key`);
  if (item.id !== undefined) string(item.id, `${path}.id`);
  string(item.label, `${path}.label`);
  if (item.description !== undefined) string(item.description, `${path}.description`, true);
  optionalStringArray(item.synonyms, `${path}.synonyms`);
  optionalStringArray(item.parentKeys, `${path}.parentKeys`);
};

const validateActivity = (value: unknown, path: string): void => {
  const item = object(value, path);
  onlyKeys(item, [
    'key', 'existingId', 'event', 'observableTraces', 'decisionPoint', 'parentKey',
    'castKeys', 'attributeKeys', 'transportKeys',
  ], path);
  string(item.key, `${path}.key`);
  if (item.existingId !== undefined) string(item.existingId, `${path}.existingId`);
  string(item.event, `${path}.event`);
  optionalStringArray(item.observableTraces, `${path}.observableTraces`);
  if (!Array.isArray(item.observableTraces) || item.observableTraces.length === 0) {
    throw new GeneratorError('invalid-field', `${path}.observableTraces must not be empty.`, `${path}.observableTraces`);
  }
  if (item.decisionPoint !== undefined) string(item.decisionPoint, `${path}.decisionPoint`);
  if (item.parentKey !== undefined) string(item.parentKey, `${path}.parentKey`);
  optionalStringArray(item.castKeys, `${path}.castKeys`);
  optionalStringArray(item.attributeKeys, `${path}.attributeKeys`);
  optionalStringArray(item.transportKeys, `${path}.transportKeys`);
};

const validateIndicator = (value: unknown, path: string): void => {
  const item = object(value, path);
  onlyKeys(item, [
    'key', 'existingId', 'observation', 'corroboration', 'alternativeExplanations', 'relevance',
  ], path);
  string(item.key, `${path}.key`);
  if (item.existingId !== undefined) string(item.existingId, `${path}.existingId`);
  string(item.observation, `${path}.observation`);
  optionalStringArray(item.corroboration, `${path}.corroboration`);
  optionalStringArray(item.alternativeExplanations, `${path}.alternativeExplanations`);
  string(item.relevance, `${path}.relevance`);
};

const validateMeasure = (value: unknown, path: string): void => {
  const item = object(value, path);
  onlyKeys(item, [
    'key', 'existingId', 'label', 'category', 'partnerKeys', 'decisionMoment', 'intendedEffect',
  ], path);
  string(item.key, `${path}.key`);
  if (item.existingId !== undefined) string(item.existingId, `${path}.existingId`);
  string(item.label, `${path}.label`);
  string(item.category, `${path}.category`);
  optionalStringArray(item.partnerKeys, `${path}.partnerKeys`);
  if (!Array.isArray(item.partnerKeys) || item.partnerKeys.length === 0) {
    throw new GeneratorError('invalid-field', `${path}.partnerKeys must not be empty.`, `${path}.partnerKeys`);
  }
  string(item.decisionMoment, `${path}.decisionMoment`);
  string(item.intendedEffect, `${path}.intendedEffect`);
};

const validateCondition = (value: unknown, path: string): void => {
  const item = object(value, path);
  onlyKeys(item, ['key', 'existingId', 'label', 'description', 'type'], path);
  string(item.key, `${path}.key`);
  if (item.existingId !== undefined) string(item.existingId, `${path}.existingId`);
  string(item.label, `${path}.label`);
  if (item.description !== undefined) string(item.description, `${path}.description`, true);
  if (!['Prerequisite', 'Facilitator', 'Enforcement'].includes(String(item.type))) {
    throw new GeneratorError('invalid-field', `${path}.type is not a supported condition type.`, `${path}.type`);
  }
};

export const validateCandidate = (value: unknown): CandidateFile => {
  const root = object(value, '$');
  onlyKeys(root, ['schemaVersion', 'script', 'taxonomies', 'safetyReview'], '$');
  if (root.schemaVersion !== 1) {
    throw new GeneratorError('unsupported-schema', 'candidate.json schemaVersion must be 1.', '$.schemaVersion');
  }
  const script = object(root.script, '$.script');
  onlyKeys(script, [
    'label', 'description', 'owner', 'productKeys', 'geoLocationKeys', 'stages', 'removeIds',
  ], '$.script');
  string(script.label, '$.script.label');
  string(script.description, '$.script.description');
  if (script.owner !== undefined) string(script.owner, '$.script.owner');
  optionalStringArray(script.productKeys, '$.script.productKeys');
  optionalStringArray(script.geoLocationKeys, '$.script.geoLocationKeys');
  optionalStringArray(script.removeIds, '$.script.removeIds');
  array(script.stages, '$.script.stages').forEach((stageValue, stageIndex) => {
    const path = `$.script.stages[${stageIndex}]`;
    const stage = object(stageValue, path);
    onlyKeys(stage, ['key', 'existingId', 'label', 'description', 'core', 'variants'], path);
    string(stage.key, `${path}.key`);
    if (stage.existingId !== undefined) string(stage.existingId, `${path}.existingId`);
    const stageLabel = string(stage.label, `${path}.label`);
    string(stage.description, `${path}.description`);
    if (stage.core !== undefined && typeof stage.core !== 'boolean') {
      throw new GeneratorError('invalid-field', `${path}.core must be a boolean.`, `${path}.core`);
    }
    const variants = array(stage.variants, `${path}.variants`);
    if (!variants.length) {
      throw new GeneratorError('invalid-field', `${path}.variants must not be empty.`, `${path}.variants`);
    }
    variants.forEach((variantValue, variantIndex) => {
      const variantPath = `${path}.variants[${variantIndex}]`;
      const variant = object(variantValue, variantPath);
      onlyKeys(variant, [
        'key', 'existingId', 'label', 'description', 'locationKeys', 'activities',
        'indicators', 'measures', 'conditions',
      ], variantPath);
      string(variant.key, `${variantPath}.key`);
      if (variant.existingId !== undefined) string(variant.existingId, `${variantPath}.existingId`);
      const variantLabel = string(variant.label, `${variantPath}.label`);
      if (
        genericModusOperandiLabels.has(normalizedLabel(variantLabel)) ||
        normalizedLabel(variantLabel) === normalizedLabel(stageLabel)
      ) {
        throw new GeneratorError(
          'invalid-field',
          `${variantPath}.label must describe the modus operandi instead of using a generic or repeated stage label.`,
          `${variantPath}.label`
        );
      }
      if (variant.description !== undefined) string(variant.description, `${variantPath}.description`, true);
      optionalStringArray(variant.locationKeys, `${variantPath}.locationKeys`);
      const activities = array(variant.activities, `${variantPath}.activities`);
      if (!activities.length) {
        throw new GeneratorError(
          'invalid-field',
          `${variantPath}.activities must not be empty.`,
          `${variantPath}.activities`
        );
      }
      activities
        .forEach((item, index) => validateActivity(item, `${variantPath}.activities[${index}]`));
      const firstActivity = object(activities[0], `${variantPath}.activities[0]`);
      const firstActivityLabel = string(firstActivity.event, `${variantPath}.activities[0].event`);
      if (normalizedLabel(variantLabel) === normalizedLabel(firstActivityLabel)) {
        throw new GeneratorError(
          'invalid-field',
          `${variantPath}.label must describe the modus operandi instead of repeating the first activity label.`,
          `${variantPath}.label`
        );
      }
      if (variant.indicators !== undefined) array(variant.indicators, `${variantPath}.indicators`)
        .forEach((item, index) => validateIndicator(item, `${variantPath}.indicators[${index}]`));
      if (variant.measures !== undefined) array(variant.measures, `${variantPath}.measures`)
        .forEach((item, index) => validateMeasure(item, `${variantPath}.measures[${index}]`));
      if (variant.conditions !== undefined) array(variant.conditions, `${variantPath}.conditions`)
        .forEach((item, index) => validateCondition(item, `${variantPath}.conditions[${index}]`));
    });
  });

  const taxonomies = object(root.taxonomies, '$.taxonomies');
  const names = ['cast', 'attributes', 'products', 'transports', 'locations', 'geoLocations', 'partners'];
  onlyKeys(taxonomies, names, '$.taxonomies');
  names.forEach((name) => array(taxonomies[name], `$.taxonomies.${name}`)
    .forEach((item, index) => validateCandidateTaxonomy(item, `$.taxonomies.${name}[${index}]`)));

  const safety = object(root.safetyReview, '$.safetyReview');
  onlyKeys(safety, [
    'containsStepByStepInstructions', 'containsExploitableParameters', 'containsEvasionTactics', 'notes',
  ], '$.safetyReview');
  ['containsStepByStepInstructions', 'containsExploitableParameters', 'containsEvasionTactics']
    .forEach((field) => {
      if (safety[field] !== false) {
        throw new GeneratorError('unsafe-candidate', `$.safetyReview.${field} must be false.`, `$.safetyReview.${field}`);
      }
    });
  string(safety.notes, '$.safetyReview.notes', true);
  return value as CandidateFile;
};

export const validateEvidence = (value: unknown): EvidenceFile => {
  const root = object(value, '$');
  onlyKeys(root, ['schemaVersion', 'sources', 'claims'], '$');
  if (root.schemaVersion !== 1) {
    throw new GeneratorError('unsupported-schema', 'evidence.json schemaVersion must be 1.', '$.schemaVersion');
  }
  array(root.sources, '$.sources').forEach((sourceValue, sourceIndex) => {
    const path = `$.sources[${sourceIndex}]`;
    const source = object(sourceValue, path);
    onlyKeys(source, [
      'key', 'existingId', 'title', 'kind', 'state', 'url', 'filename', 'publisher', 'authors',
      'literatureType', 'publicationDate', 'accessedAt', 'contentHash', 'reliability',
      'secondaryHistorical', 'passages',
    ], path);
    string(source.key, `${path}.key`);
    if (source.existingId !== undefined) string(source.existingId, `${path}.existingId`);
    string(source.title, `${path}.title`);
    if (!['web', 'local'].includes(String(source.kind))) {
      throw new GeneratorError('invalid-field', `${path}.kind must be web or local.`, `${path}.kind`);
    }
    if (!['valid', 'needs-review', 'orphaned', 'invalid'].includes(String(source.state))) {
      throw new GeneratorError('invalid-field', `${path}.state is invalid.`, `${path}.state`);
    }
    ['url', 'filename', 'publisher', 'authors', 'publicationDate', 'accessedAt']
      .forEach((field) => {
        if (source[field] !== undefined) string(source[field], `${path}.${field}`, true);
      });
    if (source.literatureType !== undefined &&
      (!Number.isInteger(source.literatureType) || Number(source.literatureType) < 1 || Number(source.literatureType) > 15)) {
      throw new GeneratorError('invalid-field', `${path}.literatureType must be a valid numeric literature type.`, `${path}.literatureType`);
    }
    if (!/^[a-f0-9]{64}$/i.test(string(source.contentHash, `${path}.contentHash`))) {
      throw new GeneratorError(
        'invalid-field',
        `${path}.contentHash must be a SHA-256 hexadecimal digest.`,
        `${path}.contentHash`
      );
    }
    string(source.reliability, `${path}.reliability`);
    if (source.secondaryHistorical !== undefined && typeof source.secondaryHistorical !== 'boolean') {
      throw new GeneratorError('invalid-field', `${path}.secondaryHistorical must be a boolean.`, `${path}.secondaryHistorical`);
    }
    array(source.passages, `${path}.passages`).forEach((passageValue, passageIndex) => {
      const passagePath = `${path}.passages[${passageIndex}]`;
      const passage = object(passageValue, passagePath);
      onlyKeys(passage, ['text', 'locator'], passagePath);
      string(passage.text, `${passagePath}.text`);
      if (passage.locator !== undefined) string(passage.locator, `${passagePath}.locator`, true);
    });
  });
  array(root.claims, '$.claims').forEach((claimValue, claimIndex) => {
    const path = `$.claims[${claimIndex}]`;
    const claim = object(claimValue, path);
    onlyKeys(claim, ['nodeKey', 'sourceKeys', 'note', 'state'], path);
    string(claim.nodeKey, `${path}.nodeKey`);
    optionalStringArray(claim.sourceKeys, `${path}.sourceKeys`);
    if (claim.note !== undefined) string(claim.note, `${path}.note`, true);
    if (claim.state !== undefined &&
      !['valid', 'needs-review', 'orphaned', 'invalid', 'unsubstantiated-after-human-edit'].includes(String(claim.state))) {
      throw new GeneratorError('invalid-field', `${path}.state is invalid.`, `${path}.state`);
    }
  });
  return value as EvidenceFile;
};

export const validateResearchLog = (value: unknown): ResearchLogFile => {
  const root = object(value, '$');
  onlyKeys(root, [
    'schemaVersion', 'entries', 'contradictionSearchCompleted', 'missingPerspectiveSearchCompleted',
  ], '$');
  if (root.schemaVersion !== 1) {
    throw new GeneratorError('unsupported-schema', 'research-log.json schemaVersion must be 1.', '$.schemaVersion');
  }
  array(root.entries, '$.entries').forEach((entryValue, index) => {
    const path = `$.entries[${index}]`;
    const entry = object(entryValue, path);
    onlyKeys(entry, ['query', 'url', 'visitedAt', 'decision', 'reason'], path);
    if (entry.query !== undefined) string(entry.query, `${path}.query`);
    if (entry.url !== undefined) string(entry.url, `${path}.url`);
    if (entry.query === undefined && entry.url === undefined) {
      throw new GeneratorError('invalid-field', `${path} requires a query or URL.`, path);
    }
    string(entry.visitedAt, `${path}.visitedAt`);
    if (!['accepted', 'rejected'].includes(String(entry.decision))) {
      throw new GeneratorError('invalid-field', `${path}.decision is invalid.`, `${path}.decision`);
    }
    string(entry.reason, `${path}.reason`);
  });
  ['contradictionSearchCompleted', 'missingPerspectiveSearchCompleted'].forEach((field) => {
    if (typeof root[field] !== 'boolean') {
      throw new GeneratorError('invalid-field', `$.${field} must be a boolean.`, `$.${field}`);
    }
  });
  return value as ResearchLogFile;
};

const collectIds = (model: DataModel): ID[] => [
  ...model.crimeScripts.flatMap((script) => [
    script.id,
    ...script.literature.map(({ id }) => id),
    ...(script.tracks || []).map(({ id }) => id),
    ...script.stages.flatMap((stage) => [
      stage.id,
      ...stage.variants.flatMap((variant) => [
        variant.id,
        ...variant.activities.map(({ id }) => id),
        ...variant.conditions.map(({ id }) => id),
        ...variant.indicators.map(({ id }) => id),
        ...variant.measures.map(({ id }) => id),
        ...variant.opportunities.map(({ id }) => id),
      ]),
    ]),
  ]),
  ...model.cast.map(({ id }) => id),
  ...model.attributes.map(({ id }) => id),
  ...model.locations.map(({ id }) => id),
  ...model.geoLocations.map(({ id }) => id),
  ...model.products.map(({ id }) => id),
  ...model.transports.map(({ id }) => id),
  ...model.partners.map(({ id }) => id),
];

export const validateDataModel = (model: DataModel): void => {
  const seen = new Set<ID>();
  const duplicate = collectIds(model).find((id) => seen.has(id) || !seen.add(id));
  if (duplicate) {
    throw new GeneratorError('duplicate-id', `Standalone JSON contains duplicate ID "${duplicate}".`, '$');
  }
  const dangling = findDanglingTaxonomyReferences(model);
  if (dangling.length) {
    throw new GeneratorError(
      'dangling-reference',
      `Standalone JSON contains missing taxonomy reference "${dangling[0].itemId}".`,
      '$'
    );
  }
  model.crimeScripts.forEach((script, scriptIndex) => {
    const stageById = new Map(script.stages.map((stage) => [stage.id, stage]));
    script.stages.forEach((stage, stageIndex) => {
      const variantIds = new Set(stage.variants.map(({ id }) => id));
      if (stage.selectedVariantId && !variantIds.has(stage.selectedVariantId)) {
        throw new GeneratorError(
          'dangling-owned-reference',
          `Stage "${stage.label}" selects missing variant "${stage.selectedVariantId}".`,
          `$.crimeScripts[${scriptIndex}].stages[${stageIndex}].selectedVariantId`
        );
      }
      stage.variants.forEach((variant, variantIndex) => {
        const activities = new Map(variant.activities.map((activity) => [activity.id, activity]));
        variant.activities.forEach((activity, activityIndex) => {
          if (!activity.parentId) return;
          const parent = activities.get(activity.parentId);
          if (!parent || parent.parentId) {
            throw new GeneratorError(
              'dangling-owned-reference',
              `Activity "${activity.label}" has an invalid or nested parent.`,
              `$.crimeScripts[${scriptIndex}].stages[${stageIndex}].variants[${variantIndex}].activities[${activityIndex}].parentId`
            );
          }
        });
      });
    });
    (script.tracks || []).forEach((track, trackIndex) => {
      Object.entries(track.sceneVariants).forEach(([stageId, variantId]) => {
        const stage = stageById.get(stageId);
        if (!stage || (variantId && !stage.variants.some(({ id }) => id === variantId))) {
          throw new GeneratorError(
            'dangling-owned-reference',
            `Track "${track.label}" contains an invalid stage or variant reference.`,
            `$.crimeScripts[${scriptIndex}].tracks[${trackIndex}].sceneVariants.${stageId}`
          );
        }
      });
    });
  });
};

export const validateStandaloneModel = (model: DataModel): void => {
  if (model.crimeScripts.length !== 1) {
    throw new GeneratorError('invalid-standalone', 'Standalone JSON must contain exactly one crime script.', '$.crimeScripts');
  }
  validateDataModel(model);
};

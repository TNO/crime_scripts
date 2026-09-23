import { BUILT_IN_ICONS, isBuiltInIconKey } from '@crime-script/core/icons';
import { normalizeDataModel } from '@crime-script/core/model-normalization';
import { createSingleScriptExportModel } from '@crime-script/core/single-script-export';
import type {
  CrimeScript,
  DataModel,
  Hierarchical,
  ID,
  Literature,
} from '@crime-script/core/data-model';
import type { TaxonomyName } from '@crime-script/core/taxonomy-references';
import { GeneratorError } from './errors.ts';
import { normalizedLabel, slugify, textSimilarity } from './text.ts';
import type {
  CandidateFile,
  EvidenceFile,
  EvidenceSource,
  GeneratorBrief,
  GeneratorIssue,
} from './types.ts';

const taxonomyNames: TaxonomyName[] = [
  'cast',
  'attributes',
  'products',
  'transports',
  'locations',
  'geoLocations',
  'partners',
];

type TaxonomyMaps = Record<TaxonomyName, Map<string, ID>>;

export type BuildResult = {
  model: DataModel;
  issues: GeneratorIssue[];
  newTaxonomy: Array<{ taxonomy: TaxonomyName; id: ID; label: string }>;
  keyToId: Record<string, ID>;
  sourceKeyToLiteratureId: Record<string, ID>;
};

export type BuildOptions = {
  allowClassificationChange?: boolean;
  allowDeletions?: boolean;
};

const allModelIds = (model: DataModel): Set<ID> => {
  const ids = new Set<ID>();
  taxonomyNames.forEach((name) => model[name].forEach(({ id }) => ids.add(id)));
  model.crimeScripts.forEach((script) => {
    ids.add(script.id);
    script.literature.forEach(({ id }) => ids.add(id));
    script.stages.forEach((scene) => {
      ids.add(scene.id);
      scene.variants.forEach((variant) => {
        ids.add(variant.id);
        [
          ...variant.activities,
          ...variant.conditions,
          ...variant.opportunities,
          ...variant.indicators,
          ...variant.measures,
        ].forEach(({ id }) => ids.add(id));
      });
    });
    script.tracks?.forEach(({ id }) => ids.add(id));
  });
  return ids;
};

const uniqueId = (base: string, usedIds: Set<ID>): ID => {
  let value = base;
  let suffix = 2;
  while (usedIds.has(value)) value = `${base}-${suffix++}`;
  usedIds.add(value);
  return value;
};

const collectOwnedIds = (script: CrimeScript): Set<ID> => {
  const ids = new Set<ID>([script.id]);
  script.literature.forEach(({ id }) => ids.add(id));
  script.stages.forEach((scene) => {
    ids.add(scene.id);
    scene.variants.forEach((variant) => {
      ids.add(variant.id);
      [
        ...variant.activities,
        ...variant.conditions,
        ...variant.opportunities,
        ...variant.indicators,
        ...variant.measures,
      ].forEach(({ id }) => ids.add(id));
    });
  });
  script.tracks?.forEach(({ id }) => ids.add(id));
  return ids;
};

const collectStructuralOwnedIds = (script: CrimeScript): Set<ID> => {
  const ids = new Set<ID>([script.id]);
  script.stages.forEach((scene) => {
    ids.add(scene.id);
    scene.variants.forEach((variant) => {
      ids.add(variant.id);
      [
        ...variant.activities,
        ...variant.conditions,
        ...variant.opportunities,
        ...variant.indicators,
        ...variant.measures,
      ].forEach(({ id }) => ids.add(id));
    });
  });
  return ids;
};

const collectOwnedKinds = (script: CrimeScript): Map<ID, string> => {
  const kinds = new Map<ID, string>([[script.id, 'script']]);
  script.literature.forEach(({ id }) => kinds.set(id, 'literature'));
  script.stages.forEach((scene) => {
    kinds.set(scene.id, 'scene');
    scene.variants.forEach((variant) => {
      kinds.set(variant.id, 'variant');
      variant.activities.forEach(({ id }) => kinds.set(id, 'activity'));
      variant.conditions.forEach(({ id }) => kinds.set(id, 'condition'));
      variant.opportunities.forEach(({ id }) => kinds.set(id, 'opportunity'));
      variant.indicators.forEach(({ id }) => kinds.set(id, 'indicator'));
      variant.measures.forEach(({ id }) => kinds.set(id, 'measure'));
    });
  });
  script.tracks?.forEach(({ id }) => kinds.set(id, 'track'));
  return kinds;
};

const assertSafetyReview = (candidate: CandidateFile) => {
  const safety = candidate.safetyReview as CandidateFile['safetyReview'] & Record<string, unknown>;
  const blocked = [
    'containsStepByStepInstructions',
    'containsExploitableParameters',
    'containsEvasionTactics',
  ].filter((key) => safety[key] !== false);
  if (blocked.length > 0 || !safety.notes?.trim()) {
    throw new GeneratorError(
      'unsafe-candidate',
      'The candidate safety review must explicitly reject executable, exploitable, and evasion detail and include notes.',
      '$.safetyReview',
      blocked
    );
  }
};

const assertCandidateShape = (candidate: CandidateFile) => {
  if (candidate.schemaVersion !== 1) {
    throw new GeneratorError('unsupported-schema', 'candidate.json schemaVersion must be 1.', '$.schemaVersion');
  }
  if (!candidate.script?.label?.trim() || !candidate.script.description?.trim()) {
    throw new GeneratorError('invalid-candidate', 'The script requires a label and description.', '$.script');
  }
  if (!Array.isArray(candidate.script.stages) || candidate.script.stages.length === 0) {
    throw new GeneratorError('invalid-candidate', 'The script requires at least one stage.', '$.script.stages');
  }
  taxonomyNames.forEach((name) => {
    if (!Array.isArray(candidate.taxonomies?.[name])) {
      throw new GeneratorError('invalid-candidate', `Missing taxonomy array "${name}".`, `$.taxonomies.${name}`);
    }
  });
  const nodeKeys = new Set<string>();
  candidate.script.stages.forEach((stage, stageIndex) => {
    const nodes = [
      { key: stage.key, path: `$.script.stages[${stageIndex}].key` },
      ...stage.variants.flatMap((variant, variantIndex) => [
        { key: variant.key, path: `$.script.stages[${stageIndex}].variants[${variantIndex}].key` },
        ...[
          ...variant.activities,
          ...(variant.indicators || []),
          ...(variant.measures || []),
          ...(variant.conditions || []),
        ].map(({ key }) => ({
          key,
          path: `$.script.stages[${stageIndex}].variants[${variantIndex}]`,
        })),
      ]),
    ];
    nodes.forEach(({ key, path }) => {
      if (!key?.trim() || nodeKeys.has(key)) {
        throw new GeneratorError('duplicate-key', `Invalid or duplicate node key "${key}".`, path);
      }
      nodeKeys.add(key);
    });
  });
  assertSafetyReview(candidate);
};

const taxonomyCandidates = (
  items: Array<Hierarchical & { id: ID; label: string }>,
  label: string
) => {
  const wanted = normalizedLabel(label);
  return items.filter((item) =>
    normalizedLabel(item.label) === wanted ||
    item.synonyms?.some((synonym) => normalizedLabel(synonym) === wanted)
  );
};

const resolveTaxonomies = (
  bundle: DataModel,
  candidate: CandidateFile,
  scriptId: ID,
  usedIds: Set<ID>
): {
  model: DataModel;
  maps: TaxonomyMaps;
  newTaxonomy: BuildResult['newTaxonomy'];
  suggestions: GeneratorIssue[];
} => {
  const model = structuredClone(bundle);
  const maps = Object.fromEntries(
    taxonomyNames.map((name) => [name, new Map<string, ID>()])
  ) as TaxonomyMaps;
  const newTaxonomy: BuildResult['newTaxonomy'] = [];
  const suggestions: GeneratorIssue[] = [];

  taxonomyNames.forEach((name) => {
    const keys = new Set<string>();
    candidate.taxonomies[name].forEach((source, index) => {
      const path = `$.taxonomies.${name}[${index}]`;
      if (!source.key?.trim() || !source.label?.trim()) {
        throw new GeneratorError('invalid-taxonomy', 'Taxonomy items require key and label.', path);
      }
      if (keys.has(source.key)) {
        throw new GeneratorError('duplicate-key', `Duplicate taxonomy key "${source.key}".`, `${path}.key`);
      }
      keys.add(source.key);
      const byId = source.id ? model[name].find(({ id }) => id === source.id) : undefined;
      const byLabel = taxonomyCandidates(model[name], source.label);
      if (source.id && !byId) {
        throw new GeneratorError('unknown-taxonomy-id', `Taxonomy ID "${source.id}" does not exist.`, `${path}.id`);
      }
      if (!byId && byLabel.length > 1) {
        throw new GeneratorError(
          'ambiguous-taxonomy',
          `Taxonomy label "${source.label}" matches multiple existing items.`,
          `${path}.label`,
          byLabel.map(({ id }) => id)
        );
      }
      const existing = byId || byLabel[0];
      if (existing) {
        maps[name].set(source.key, existing.id);
        return;
      }
      const sourceSynonyms = new Set(
        (source.synonyms || []).map(normalizedLabel).filter(Boolean)
      );
      const possibleMatches = model[name].filter((item) =>
        sourceSynonyms.has(normalizedLabel(item.label)) ||
        item.synonyms?.some((synonym) => sourceSynonyms.has(normalizedLabel(synonym))) ||
        textSimilarity(source.label, item.label) >= 0.65
      );
      if (possibleMatches.length) {
        suggestions.push({
          code: 'taxonomy-match-candidate',
          path: `${path}.label`,
          message:
            `"${source.label}" may match existing ${name}: ` +
            possibleMatches.map(({ id, label }) => `"${label}" (${id})`).join(', ') +
            '. Set id explicitly to reuse one; no automatic fuzzy or translation merge was applied.',
          severity: 'warning',
        });
      }
      const id = uniqueId(
        `${scriptId}:taxonomy:${slugify(name)}:${slugify(source.label) || slugify(source.key)}`,
        usedIds
      );
      model[name].push({
        id,
        label: source.label.trim(),
        description: source.description?.trim() || undefined,
        synonyms: source.synonyms?.map((value) => value.trim()).filter(Boolean),
      });
      maps[name].set(source.key, id);
      newTaxonomy.push({ taxonomy: name, id, label: source.label.trim() });
    });
  });

  taxonomyNames.forEach((name) => {
    candidate.taxonomies[name].forEach((source) => {
      const id = maps[name].get(source.key)!;
      const item = model[name].find((candidateItem) => candidateItem.id === id);
      if (!item || !source.parentKeys?.length) return;
      item.parents = source.parentKeys.map((parentKey) => {
        const parentId = maps[name].get(parentKey);
        if (!parentId) {
          throw new GeneratorError(
            'unknown-taxonomy-key',
            `Unknown ${name} parent key "${parentKey}".`,
            `$.taxonomies.${name}.${source.key}.parentKeys`
          );
        }
        return parentId;
      });
    });
  });

  return { model, maps, newTaxonomy, suggestions };
};

const requireTaxonomyIds = (
  maps: TaxonomyMaps,
  taxonomy: TaxonomyName,
  keys: string[] | undefined,
  path: string
): ID[] =>
  (keys || []).map((key, index) => {
    const id = maps[taxonomy].get(key);
    if (!id) {
      throw new GeneratorError(
        'unknown-taxonomy-key',
        `Unknown ${taxonomy} key "${key}".`,
        `${path}[${index}]`
      );
    }
    return id;
  });

const sourceKeySet = (evidence: EvidenceFile): Set<string> => {
  const keys = new Set<string>();
  evidence.sources.forEach((source, index) => {
    if (!source.key?.trim() || keys.has(source.key)) {
      throw new GeneratorError('duplicate-source-key', `Invalid or duplicate source key "${source.key}".`, `$.sources[${index}].key`);
    }
    keys.add(source.key);
    if (source.state === 'invalid') {
      throw new GeneratorError(
        'invalid-evidence-source',
        `Source "${source.key}" is marked invalid and must be repaired or removed.`,
        `$.sources[${index}].state`
      );
    }
    if (source.state === 'valid' && (!/^[a-f0-9]{64}$/i.test(source.contentHash) || source.passages.length === 0)) {
      throw new GeneratorError(
        'incomplete-source',
        `Valid source "${source.key}" requires a SHA-256 content hash and supporting passage.`,
        `$.sources[${index}]`
      );
    }
    if (source.kind === 'web') {
      try {
        const url = new URL(source.url || '');
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
      } catch {
        throw new GeneratorError('invalid-source-url', `Source "${source.key}" has an unsafe URL.`, `$.sources[${index}].url`);
      }
    }
    if (
      source.kind === 'local' &&
      (
        !source.filename ||
        /^([/\\]|[A-Za-z]:)/.test(source.filename) ||
        source.filename.split(/[\\/]/).includes('..')
      )
    ) {
      throw new GeneratorError(
        'invalid-local-source',
        `Local source "${source.key}" requires a safe relative filename.`,
        `$.sources[${index}].filename`
      );
    }
  });
  return keys;
};

const validateEvidence = (
  candidate: CandidateFile,
  evidence: EvidenceFile,
  researchComplete: boolean
): Map<string, string[]> => {
  if (evidence.schemaVersion !== 1) {
    throw new GeneratorError('unsupported-schema', 'evidence.json schemaVersion must be 1.', '$.schemaVersion');
  }
  if (!researchComplete) {
    throw new GeneratorError(
      'research-incomplete',
      'Contradiction and missing-perspective research must be completed before build.',
      '$.research-log'
    );
  }
  const sourceKeys = sourceKeySet(evidence);
  const validSources = new Set(
    evidence.sources.filter(({ state }) => state === 'valid').map(({ key }) => key)
  );
  const claims = new Map<string, string[]>();
  evidence.claims.forEach((claim, index) => {
    if (!claim.nodeKey?.trim() || claims.has(claim.nodeKey)) {
      throw new GeneratorError('duplicate-claim', `Invalid or duplicate claim "${claim.nodeKey}".`, `$.claims[${index}].nodeKey`);
    }
    claim.sourceKeys.forEach((key) => {
      if (!sourceKeys.has(key)) {
        throw new GeneratorError('unknown-source-key', `Claim references unknown source "${key}".`, `$.claims[${index}].sourceKeys`);
      }
    });
    const usable = claim.state === undefined || claim.state === 'valid';
    claims.set(
      claim.nodeKey,
      usable ? claim.sourceKeys.filter((key) => validSources.has(key)) : []
    );
  });

  const required = candidate.script.stages.flatMap((stage) => [
    ...(stage.core === false ? [] : [stage.key]),
    ...stage.variants.flatMap((variant) => [
      ...variant.activities.map(({ key }) => key),
      ...(variant.indicators || []).map(({ key }) => key),
      ...(variant.measures || []).map(({ key }) => key),
    ]),
  ]);
  required.forEach((key) => {
    if ((claims.get(key) || []).length === 0) {
      throw new GeneratorError('missing-evidence', `Node "${key}" has no valid evidence.`, `$.claims.${key}`);
    }
  });
  return claims;
};

export const sourceToLiterature = (
  source: EvidenceSource,
  scriptId: ID,
  usedIds: Set<ID>,
  usedFor: string,
  retainedId?: ID
): Literature => ({
  id: retainedId || uniqueId(`${scriptId}:source:${slugify(source.key) || 'source'}`, usedIds),
  label: source.title.trim(),
  description: [
    source.kind === 'local' && source.filename ? `Local file: ${source.filename}.` : '',
    source.reliability.trim(),
  ].filter(Boolean).join(' '),
  authors: source.authors?.trim(),
  type: source.literatureType,
  usedFor,
  url: source.kind === 'web' ? source.url : undefined,
});

const activityDescription = (
  traces: string[],
  decisionPoint: string | undefined
): string => [
  traces.length ? `Observable traces: ${traces.join('; ')}.` : '',
  decisionPoint?.trim() ? `Decision point: ${decisionPoint.trim()}.` : '',
].filter(Boolean).join(' ');

const indicatorDescription = (
  corroboration: string[],
  alternatives: string[],
  relevance: string
): string => [
  `Corroborate with: ${corroboration.join('; ')}.`,
  `Consider alternatives: ${alternatives.join('; ')}.`,
  `Relevance: ${relevance.trim()}.`,
].join(' ');

const measureDescription = (decisionMoment: string, intendedEffect: string): string =>
  `Decision moment: ${decisionMoment.trim()}. Intended effect: ${intendedEffect.trim()}.`;

const assertUniqueDescriptions = (values: Array<{ path: string; description: string }>) => {
  values.forEach(({ path, description }) => {
    if (!description.trim()) {
      throw new GeneratorError('empty-description', 'Generated descriptions cannot be empty.', path);
    }
  });
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      const first = values[left];
      const second = values[right];
      const exact = normalizedLabel(first.description) === normalizedLabel(second.description);
      const similarity = textSimilarity(first.description, second.description);
      if (exact || similarity >= 0.92) {
        throw new GeneratorError(
          'duplicate-description',
          `Descriptions at "${first.path}" and "${second.path}" are too similar.`,
          second.path,
          { similarity }
        );
      }
    }
  }
};

export const buildStandaloneCandidate = (
  bundleInput: unknown,
  brief: GeneratorBrief,
  candidate: CandidateFile,
  evidence: EvidenceFile,
  researchComplete: boolean,
  now = Date.now(),
  options: BuildOptions = {}
): BuildResult => {
  assertCandidateShape(candidate);
  if (!isBuiltInIconKey(brief.scriptIcon)) {
    throw new GeneratorError(
      'unknown-script-icon',
      `scriptIcon "${brief.scriptIcon}" is not in the built-in catalogue.`,
      '$.scriptIcon',
      BUILT_IN_ICONS.map(({ key }) => key)
    );
  }
  const bundle = normalizeDataModel(bundleInput, brief.classification);
  const existing = bundle.crimeScripts.find(({ id }) => id === (brief.existingScriptId || brief.scriptId));
  if (brief.existingScriptId && !existing) {
    throw new GeneratorError(
      'missing-target-script',
      `Existing script "${brief.existingScriptId}" is not present in the bundle.`,
      '$.existingScriptId'
    );
  }
  if (!brief.existingScriptId && bundle.crimeScripts.some(({ id }) => id === brief.scriptId)) {
    throw new GeneratorError('script-id-collision', `Script ID "${brief.scriptId}" already exists.`, '$.scriptId');
  }
  if (existing && existing.classification !== brief.classification && !options.allowClassificationChange) {
    throw new GeneratorError(
      'classification-change-confirmation-required',
      'Changing classification requires explicit confirmation before build.',
      '$.classification'
    );
  }

  const claims = validateEvidence(candidate, evidence, researchComplete);
  const existingOwnedIds = existing ? collectOwnedIds(existing) : new Set<ID>();
  const existingKinds = existing ? collectOwnedKinds(existing) : new Map<ID, string>();
  const removals = new Set(candidate.script.removeIds || []);
  if (existing && removals.size > 0 && !options.allowDeletions) {
    throw new GeneratorError(
      'deletion-confirmation-required',
      'Explicit node removals require confirmation before build.',
      '$.script.removeIds'
    );
  }
  removals.forEach((id) => {
    if (!existing || !existingOwnedIds.has(id) || id === existing.id) {
      throw new GeneratorError(
        'invalid-removal',
        `ID "${id}" cannot be removed from the target script.`,
        '$.script.removeIds'
      );
    }
  });
  const usedIds = allModelIds(bundle);
  if (existing) {
    existingOwnedIds.forEach((id) => usedIds.delete(id));
    existingOwnedIds.forEach((id) => {
      if (!removals.has(id)) usedIds.add(id);
    });
  }
  usedIds.add(brief.scriptId);
  const taxonomy = resolveTaxonomies(bundle, candidate, brief.scriptId, usedIds);
  const keyToId: Record<string, ID> = { $script: brief.scriptId };
  const candidateOwnedIds = new Set<ID>([brief.scriptId]);
  const claimedExistingIds = new Set<ID>();
  const idFor = (kind: string, key: string, existingId: ID | undefined, path: string): ID => {
    if (existingId) {
      if (!existingOwnedIds.has(existingId)) {
        throw new GeneratorError('unknown-existing-id', `ID "${existingId}" is not owned by the target script.`, path);
      }
      if (existingKinds.get(existingId) !== kind) {
        throw new GeneratorError(
          'existing-id-kind-mismatch',
          `ID "${existingId}" belongs to ${existingKinds.get(existingId)}, not ${kind}.`,
          path
        );
      }
      if (claimedExistingIds.has(existingId)) {
        throw new GeneratorError(
          'duplicate-existing-id',
          `Existing ID "${existingId}" is assigned more than once.`,
          path
        );
      }
      claimedExistingIds.add(existingId);
      candidateOwnedIds.add(existingId);
      keyToId[key] = existingId;
      return existingId;
    }
    const id = uniqueId(`${brief.scriptId}:${kind}:${slugify(key) || 'item'}`, usedIds);
    candidateOwnedIds.add(id);
    keyToId[key] = id;
    return id;
  };

  const stages = candidate.script.stages.map((stage, stageIndex) => {
    const sceneId = idFor('scene', stage.key, stage.existingId, `$.script.stages[${stageIndex}].existingId`);
    const variants = stage.variants.map((variant, variantIndex) => {
      const base = `$.script.stages[${stageIndex}].variants[${variantIndex}]`;
      if (variant.activities.length === 0) {
        throw new GeneratorError(
          'invalid-variant',
          'Every variant requires at least one activity.',
          `${base}.activities`
        );
      }
      const variantId = idFor('variant', variant.key, variant.existingId, `${base}.existingId`);
      const existingVariant = variant.existingId
        ? existing?.stages.flatMap(({ variants }) => variants).find(({ id }) => id === variant.existingId)
        : undefined;
      existingVariant?.opportunities
        .filter(({ id }) => !removals.has(id))
        .forEach(({ id }) => candidateOwnedIds.add(id));
      const activityIds = new Map<string, ID>();
      variant.activities.forEach((activity, activityIndex) => {
        if (activityIds.has(activity.key)) {
          throw new GeneratorError('duplicate-key', `Duplicate activity key "${activity.key}".`, `${base}.activities[${activityIndex}].key`);
        }
        activityIds.set(
          activity.key,
          idFor('activity', activity.key, activity.existingId, `${base}.activities[${activityIndex}].existingId`)
        );
      });
      const activities = variant.activities.map((activity, activityIndex) => {
        const description = activityDescription(activity.observableTraces, activity.decisionPoint);
        if (!activity.event?.trim() || activity.observableTraces.length === 0) {
          throw new GeneratorError(
            'invalid-activity',
            'Activities require an event and at least one observable trace.',
            `${base}.activities[${activityIndex}]`
          );
        }
        const cast = requireTaxonomyIds(taxonomy.maps, 'cast', activity.castKeys, `${base}.activities[${activityIndex}].castKeys`);
        const attributes = requireTaxonomyIds(
          taxonomy.maps,
          'attributes',
          activity.attributeKeys,
          `${base}.activities[${activityIndex}].attributeKeys`
        );
        const transports = requireTaxonomyIds(
          taxonomy.maps,
          'transports',
          activity.transportKeys,
          `${base}.activities[${activityIndex}].transportKeys`
        );
        const type = [
          ...(cast.length ? [1] : []),
          ...(attributes.length ? [2] : []),
          ...(transports.length ? [4] : []),
        ];
        const parentId = activity.parentKey ? activityIds.get(activity.parentKey) : undefined;
        if (activity.parentKey && (!parentId || variant.activities.find(({ key }) => key === activity.parentKey)?.parentKey)) {
          throw new GeneratorError(
            'invalid-activity-parent',
            `Activity "${activity.key}" has an unknown or nested parent "${activity.parentKey}".`,
            `${base}.activities[${activityIndex}].parentKey`
          );
        }
        return {
          id: activityIds.get(activity.key)!,
          label: activity.event.trim(),
          description,
          parentId,
          type: type.length ? type : 0,
          cast,
          attributes,
          transports,
        };
      });
      const indicators = (variant.indicators || []).map((indicator, indicatorIndex) => {
        if (
          !indicator.observation?.trim() ||
          indicator.corroboration.length === 0 ||
          indicator.alternativeExplanations.length === 0 ||
          !indicator.relevance?.trim()
        ) {
          throw new GeneratorError(
            'invalid-indicator',
            'Indicators require observation, corroboration, alternatives, and relevance.',
            `${base}.indicators[${indicatorIndex}]`
          );
        }
        return {
          id: idFor('indicator', indicator.key, indicator.existingId, `${base}.indicators[${indicatorIndex}].existingId`),
          label: indicator.observation.trim(),
          description: indicatorDescription(
            indicator.corroboration,
            indicator.alternativeExplanations,
            indicator.relevance
          ),
        };
      });
      const measures = (variant.measures || []).map((measure, measureIndex) => ({
        id: idFor('measure', measure.key, measure.existingId, `${base}.measures[${measureIndex}].existingId`),
        label: measure.label.trim(),
        description: measureDescription(measure.decisionMoment, measure.intendedEffect),
        cat: measure.category.trim(),
        partners: requireTaxonomyIds(
          taxonomy.maps,
          'partners',
          measure.partnerKeys,
          `${base}.measures[${measureIndex}].partnerKeys`
        ),
      }));
      measures.forEach((measure, measureIndex) => {
        if (!measure.label || !measure.cat || measure.partners.length === 0) {
          throw new GeneratorError(
            'invalid-measure',
            'Measures require label, category, and at least one responsible partner.',
            `${base}.measures[${measureIndex}]`
          );
        }
      });
      const conditions = (variant.conditions || []).map((condition, conditionIndex) => ({
        id: idFor('condition', condition.key, condition.existingId, `${base}.conditions[${conditionIndex}].existingId`),
        label: condition.label.trim(),
        description: condition.description?.trim(),
        type: condition.type,
      }));
      return {
        id: variantId,
        label: variant.label.trim(),
        description: variant.description?.trim(),
        locationIds: requireTaxonomyIds(taxonomy.maps, 'locations', variant.locationKeys, `${base}.locationKeys`),
        activities,
        conditions,
        opportunities: structuredClone(
          existingVariant?.opportunities.filter(({ id }) => !removals.has(id)) || []
        ),
        indicators,
        measures,
      };
    });
    if (variants.length === 0) {
      throw new GeneratorError('invalid-stage', 'Every stage requires at least one variant.', `$.script.stages[${stageIndex}].variants`);
    }
    return {
      id: sceneId,
      label: stage.label.trim(),
      description: stage.description.trim(),
      selectedVariantId: variants[0].id,
      variants,
    };
  });

  if (existing) {
    const protectedIds = [...collectStructuralOwnedIds(existing)]
      .filter((id) => id !== existing.id && !removals.has(id));
    const omitted = protectedIds.filter((id) => !candidateOwnedIds.has(id));
    if (omitted.length > 0) {
      throw new GeneratorError(
        'implicit-deletion',
        'Existing nodes are missing without an explicit removal request.',
        '$.script',
        omitted
      );
    }
    const retainedRemoval = [...removals].find((id) => candidateOwnedIds.has(id));
    if (retainedRemoval) {
      throw new GeneratorError(
        'conflicting-removal',
        `ID "${retainedRemoval}" is both retained and marked for removal.`,
        '$.script.removeIds'
      );
    }
  }

  const usedSourceKeys = new Set([...claims.values()].flat());
  const sourceUses = new Map<string, string[]>();
  claims.forEach((sourceKeys, nodeKey) => sourceKeys.forEach((sourceKey) =>
    sourceUses.set(sourceKey, [...(sourceUses.get(sourceKey) || []), nodeKey])
  ));
  const existingLiterature = new Map(existing?.literature.map((item) => [item.id, item]) || []);
  const matchedLiteratureIds = new Set<ID>();
  const sourceKeyToLiteratureId: Record<string, ID> = {};
  const literature = evidence.sources
    .filter(({ key, state }) => state === 'valid' && usedSourceKeys.has(key))
    .map((source, index) => {
      let retained = source.existingId ? existingLiterature.get(source.existingId) : undefined;
      retained ||= existingLiterature.get(
        `${brief.scriptId}:source:${slugify(source.key) || 'source'}`
      );
      retained ||= existing?.literature.find((item) =>
        (source.url && item.url === source.url) ||
        normalizedLabel(item.label) === normalizedLabel(source.title)
      );
      if (source.existingId && !retained) {
        throw new GeneratorError(
          'unknown-existing-literature',
          `Evidence source "${source.key}" references unknown literature ID "${source.existingId}".`,
          `$.sources[${index}].existingId`
        );
      }
      if (retained && matchedLiteratureIds.has(retained.id)) {
        throw new GeneratorError(
          'duplicate-existing-literature',
          `Literature ID "${retained.id}" is mapped by more than one evidence source.`,
          `$.sources[${index}].existingId`
        );
      }
      if (retained) {
        matchedLiteratureIds.add(retained.id);
        usedIds.add(retained.id);
      }
      const item = sourceToLiterature(
        source,
        brief.scriptId,
        usedIds,
        (sourceUses.get(source.key) || []).join(', '),
        retained?.id
      );
      sourceKeyToLiteratureId[source.key] = item.id;
      return item;
    });
  existing?.literature
    .filter(({ id }) => !matchedLiteratureIds.has(id) && !removals.has(id))
    .forEach((item) => literature.push(structuredClone(item)));
  const script: CrimeScript = {
    id: brief.scriptId,
    scriptFamilyId: existing?.scriptFamilyId || brief.scriptId,
    classification: brief.classification,
    label: candidate.script.label.trim(),
    description: candidate.script.description.trim(),
    owner: candidate.script.owner?.trim() || existing?.owner || '',
    updated: now,
    reviewer: [],
    status: 1,
    literature,
    stages,
    tracks: structuredClone(existing?.tracks || []).filter(({ id }) => !removals.has(id)).map((track) => {
      const validVariants = new Map(
        stages.map((stage) => [
          stage.id,
          new Set(stage.variants.map(({ id }) => id)),
        ] as const)
      );
      return {
        ...track,
        sceneVariants: Object.fromEntries(
          Object.entries(track.sceneVariants)
            .filter(([sceneId, variantId]) =>
              variantId !== undefined && validVariants.get(sceneId)?.has(variantId)
            )
        ),
      };
    }),
    productIds: requireTaxonomyIds(taxonomy.maps, 'products', candidate.script.productKeys, '$.script.productKeys'),
    geoLocationIds: requireTaxonomyIds(
      taxonomy.maps,
      'geoLocations',
      candidate.script.geoLocationKeys,
      '$.script.geoLocationKeys'
    ),
    language: brief.contentLanguage,
    icon: brief.scriptIcon,
    icons: [brief.scriptIcon],
    aiGenerated: true,
    unreviewed: true,
  };
  const descriptions = [
    { path: '$.script.description', description: script.description || '' },
    ...script.stages.flatMap((stage, stageIndex) => [
      { path: `$.script.stages[${stageIndex}].description`, description: stage.description || '' },
      ...stage.variants.flatMap((variant, variantIndex) => [
        ...variant.activities.map((item, index) => ({
          path: `$.script.stages[${stageIndex}].variants[${variantIndex}].activities[${index}].description`,
          description: item.description || '',
        })),
        ...variant.indicators.map((item, index) => ({
          path: `$.script.stages[${stageIndex}].variants[${variantIndex}].indicators[${index}].description`,
          description: item.description || '',
        })),
        ...variant.measures.map((item, index) => ({
          path: `$.script.stages[${stageIndex}].variants[${variantIndex}].measures[${index}].description`,
          description: item.description || '',
        })),
      ]),
    ]),
  ];
  assertUniqueDescriptions(descriptions);

  taxonomy.model.crimeScripts = [
    ...taxonomy.model.crimeScripts.filter(({ id }) => id !== existing?.id),
    script,
  ];
  const model = createSingleScriptExportModel(script, taxonomy.model, now);
  return {
    model,
    issues: [
      ...taxonomy.suggestions,
      ...evidence.sources
        .filter(({ state }) => state !== 'valid')
        .map((source) => ({
          code: `source-${source.state}`,
          path: `evidence.sources.${source.key}`,
          message: `Source "${source.title}" is ${source.state}.`,
          severity: source.state === 'invalid' ? 'error' as const : 'warning' as const,
        })),
    ],
    newTaxonomy: taxonomy.newTaxonomy,
    keyToId,
    sourceKeyToLiteratureId,
  };
};

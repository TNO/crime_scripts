import type {
  CrimeScript,
  DataModel,
  ID,
  Indicator,
  Literature,
  Measure,
  StarterBundleMetadata,
  SuggestionOrigin,
} from './data-model';
import { normalizeDataModel } from './model-normalization.ts';

export type ConflictAction = 'skip' | 'replace' | 'copy';
export type ImportConflictChoices = Record<ID, ConflictAction>;
export type SuggestionKind = 'indicator' | 'measure';
export type StarterSuggestion = (Indicator | Measure) & {
  suggestionOrigin: SuggestionOrigin;
  language: 'nl' | 'en';
  sources: Literature[];
};

export const getMatchingStarterBundleMetadata = (
  crimeScript: Pick<CrimeScript, 'starterOrigin'>,
  model: Pick<DataModel, 'starterBundle'>
) => {
  const { starterOrigin } = crimeScript;
  const { starterBundle } = model;
  return starterOrigin &&
    starterBundle?.id === starterOrigin.bundleId &&
    starterBundle.version === starterOrigin.bundleVersion
    ? starterBundle
    : undefined;
};

export const suggestionKey = ({ suggestionOrigin }: StarterSuggestion): string =>
  [
    suggestionOrigin.bundleId,
    suggestionOrigin.bundleVersion,
    suggestionOrigin.scriptId,
    suggestionOrigin.itemId,
    suggestionOrigin.kind,
  ].join(':');

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const requireString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Starter bundle requires ${field}.`);
  return value;
};

const validateMetadata = (value: StarterBundleMetadata | undefined): StarterBundleMetadata => {
  if (!value || typeof value !== 'object') throw new Error('Starter bundle metadata is missing.');
  requireString(value.id, 'starterBundle.id');
  requireString(value.version, 'starterBundle.version');
  requireString(value.title, 'starterBundle.title');
  requireString(value.publishedAt, 'starterBundle.publishedAt');
  if (value.locale !== 'nl' && value.locale !== 'en') throw new Error('Starter bundle locale is invalid.');
  return value;
};

/** Normalize and strictly validate runtime structure and all model references. */
export const validateStarterBundle = (input: unknown): DataModel => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Starter bundle must be an object.');
  }
  const raw = input as Record<string, unknown>;
  if (raw.schemaVersion !== 3) throw new Error('Starter bundle schemaVersion must be 3.');
  ['crimeScripts', 'cast', 'attributes', 'locations', 'geoLocations', 'products', 'transports', 'partners']
    .forEach((field) => {
      if (!Array.isArray(raw[field])) throw new Error(`Starter bundle field "${field}" must be an array.`);
    });
  (raw.crimeScripts as Array<Record<string, unknown>>).forEach((script) => {
    if (!script || typeof script !== 'object' || Array.isArray(script)) {
      throw new Error('Starter bundle crime scripts must be objects.');
    }
    if (script.language !== 'nl' && script.language !== 'en') {
      throw new Error(`Starter script "${String(script.id)}" has an invalid language.`);
    }
    if (typeof script.aiGenerated !== 'boolean') {
      throw new Error(`Starter script "${String(script.id)}" requires aiGenerated.`);
    }
    ['literature', 'stages', 'productIds'].forEach((field) => {
      if (!Array.isArray(script[field])) {
        throw new Error(`Starter script "${String(script.id)}" field "${field}" must be an array.`);
      }
    });
  });
  const model = normalizeDataModel(input);
  validateMetadata(model.starterBundle);
  const ids = (items: Array<{ id: ID }>) => new Set(items.map(({ id }) => id));
  const cast = ids(model.cast);
  const attributes = ids(model.attributes);
  const locations = ids(model.locations);
  const transports = ids(model.transports);
  const products = ids(model.products);
  const geoLocations = ids(model.geoLocations);
  const partners = ids(model.partners);
  const assertRefs = (refs: ID[] | undefined, known: Set<ID>, type: string) =>
    (refs || []).forEach((id) => {
      if (!known.has(id)) throw new Error(`Starter bundle has missing ${type} reference "${id}".`);
    });

  const allIds = new Set<ID>();
  const register = (item: { id: ID; label: string }, type: string) => {
    requireString(item.id, `${type}.id`);
    requireString(item.label, `${type}.label`);
    if (allIds.has(item.id)) throw new Error(`Starter bundle has duplicate id "${item.id}".`);
    allIds.add(item.id);
  };
  [...model.cast, ...model.attributes, ...model.locations, ...model.transports, ...model.products,
    ...model.geoLocations, ...model.partners].forEach((item) => register(item, 'taxonomy item'));
  const assertParents = (items: Array<{ id: ID; parents?: ID[] }>, type: string) => {
    const known = ids(items);
    items.forEach((item) => assertRefs(item.parents, known, `${type} parent`));
  };
  assertParents(model.cast, 'cast');
  assertParents(model.attributes, 'attribute');
  assertParents(model.locations, 'location');
  assertParents(model.transports, 'transport');
  assertParents(model.products, 'product');
  assertParents(model.geoLocations, 'geographic location');
  assertParents(model.partners, 'partner');
  model.crimeScripts.forEach((script) => {
    register(script, 'crime script');
    assertRefs(script.productIds, products, 'product');
    assertRefs(script.geoLocationIds, geoLocations, 'geographic location');
    script.literature.forEach((source) => register(source, 'source'));
    script.stages.forEach((scene) => {
      register(scene, 'scene');
      scene.variants.forEach((act) => {
        register(act, 'activity group');
        assertRefs(act.locationIds, locations, 'location');
        act.activities.forEach((activity) => {
          register(activity, 'activity');
          assertRefs(activity.cast, cast, 'cast');
          assertRefs(activity.attributes, attributes, 'attribute');
          assertRefs(activity.transports, transports, 'transport');
        });
        act.conditions.forEach((condition) => register(condition, 'condition'));
        act.opportunities.forEach((opportunity) => register(opportunity, 'opportunity'));
        act.indicators.forEach((indicator) => register(indicator, 'indicator'));
        act.measures.forEach((measure) => {
          register(measure, 'measure');
          assertRefs(measure.partners, partners, 'partner');
        });
      });
      if (scene.selectedVariantId && !scene.variants.some(({ id }) => id === scene.selectedVariantId)) {
        throw new Error(`Scene "${scene.id}" selects a missing activity group.`);
      }
    });
    (script.tracks || []).forEach((track) => {
      register(track, 'track');
      Object.entries(track.sceneVariants).forEach(([sceneId, variantId]) => {
        const scene = script.stages.find(({ id }) => id === sceneId);
        if (!scene || (variantId && !scene.variants.some(({ id }) => id === variantId))) {
          throw new Error(`Track "${track.id}" has an invalid scene or activity-group reference.`);
        }
      });
    });
  });
  return model;
};

const withStarterOrigin = (script: CrimeScript, bundle: StarterBundleMetadata): CrimeScript => ({
  ...structuredClone(script),
  starterOrigin: { bundleId: bundle.id, bundleVersion: bundle.version, scriptId: script.id },
});

export const findStarterConflicts = (current: DataModel, bundle: DataModel): CrimeScript[] => {
  const metadata = validateMetadata(bundle.starterBundle);
  return bundle.crimeScripts.filter((source) =>
    current.crimeScripts.some(({ id, starterOrigin }) =>
      id === source.id ||
      (starterOrigin?.bundleId === metadata.id && starterOrigin.scriptId === source.id)
    )
  );
};

const remapScriptTaxonomies = (
  script: CrimeScript,
  remaps: {
    cast: Map<ID, ID>;
    attributes: Map<ID, ID>;
    locations: Map<ID, ID>;
    transports: Map<ID, ID>;
    products: Map<ID, ID>;
    geoLocations: Map<ID, ID>;
    partners: Map<ID, ID>;
  }
): CrimeScript => ({
  ...structuredClone(script),
  productIds: script.productIds.map((id) => remaps.products.get(id) || id),
  geoLocationIds: script.geoLocationIds?.map((id) => remaps.geoLocations.get(id) || id),
  stages: script.stages.map((scene) => ({
    ...structuredClone(scene),
    variants: scene.variants.map((act) => ({
      ...structuredClone(act),
      locationIds: act.locationIds?.map((id) => remaps.locations.get(id) || id),
      activities: act.activities.map((activity) => ({
        ...structuredClone(activity),
        cast: activity.cast?.map((id) => remaps.cast.get(id) || id),
        attributes: activity.attributes?.map((id) => remaps.attributes.get(id) || id),
        transports: activity.transports?.map((id) => remaps.transports.get(id) || id),
      })),
      measures: act.measures.map((measure) => ({
        ...structuredClone(measure),
        partners: measure.partners.map((id) => remaps.partners.get(id) || id),
      })),
    })),
  })),
});

const copyOwnedScript = (script: CrimeScript): CrimeScript => {
  const copy = structuredClone(script);
  const remappedIds = new Map<ID, ID>();
  const remapItem = (item: { id: ID }) => {
    const id = newId();
    remappedIds.set(item.id, id);
    item.id = id;
  };
  remapItem(copy);
  copy.literature.forEach(remapItem);
  copy.stages.forEach((scene) => {
    remapItem(scene);
    scene.variants.forEach((act) => {
      remapItem(act);
      act.activities.forEach(remapItem);
      act.conditions.forEach(remapItem);
      act.opportunities.forEach(remapItem);
      act.indicators.forEach(remapItem);
      act.measures.forEach(remapItem);
    });
  });
  (copy.tracks || []).forEach(remapItem);
  copy.stages.forEach((scene) => {
    scene.selectedVariantId = scene.selectedVariantId
      ? remappedIds.get(scene.selectedVariantId)
      : undefined;
    scene.variants.forEach((act) => {
      act.opportunities.forEach((item) => {
        item.parents = item.parents?.map((id) => remappedIds.get(id) || id);
      });
      act.indicators.forEach((item) => {
        item.parents = item.parents?.map((id) => remappedIds.get(id) || id);
      });
    });
  });
  (copy.tracks || []).forEach((track) => {
    track.sceneVariants = Object.fromEntries(
      Object.entries(track.sceneVariants).map(([sceneId, variantId]) => [
        remappedIds.get(sceneId) || sceneId,
        variantId ? remappedIds.get(variantId) || variantId : undefined,
      ])
    );
  });
  return copy;
};

const mergeTaxonomy = <T extends { id: ID; label: string; parents?: ID[] }>(
  current: T[],
  imported: T[]
): { items: T[]; importedIds: Map<ID, ID> } => {
  const items = structuredClone(current);
  const added: T[] = [];
  const byId = new Map(items.map((item) => [item.id, item]));
  const byLabel = new Map(items.map((item) => [item.label.trim().toLocaleLowerCase(), item.id]));
  const importedIds = new Map<ID, ID>();
  imported.forEach((source) => {
    const labelKey = source.label.trim().toLocaleLowerCase();
    const sameLabelId = byLabel.get(labelKey);
    const sameId = byId.get(source.id);
    if (sameLabelId) {
      importedIds.set(source.id, sameLabelId);
      return;
    }
    const item = structuredClone(source);
    if (sameId) item.id = newId();
    items.push(item);
    added.push(item);
    byId.set(item.id, item);
    byLabel.set(labelKey, item.id);
    importedIds.set(source.id, item.id);
  });
  added.forEach((item) => {
    item.parents = item.parents?.map((id) => importedIds.get(id) || id);
  });
  return { items, importedIds };
};

export const importStarterBundle = (
  currentInput: DataModel,
  bundleInput: DataModel,
  choices: ImportConflictChoices = {}
): DataModel => {
  const current = normalizeDataModel(currentInput);
  const bundle = validateStarterBundle(bundleInput);
  const metadata = bundle.starterBundle!;
  const result = structuredClone(current);
  const cast = mergeTaxonomy(result.cast, bundle.cast);
  const attributes = mergeTaxonomy(result.attributes, bundle.attributes);
  const locations = mergeTaxonomy(result.locations, bundle.locations);
  const geoLocations = mergeTaxonomy(result.geoLocations, bundle.geoLocations);
  const products = mergeTaxonomy(result.products, bundle.products);
  const transports = mergeTaxonomy(result.transports, bundle.transports);
  const partners = mergeTaxonomy(result.partners, bundle.partners);
  const remaps = { cast: cast.importedIds, attributes: attributes.importedIds, locations: locations.importedIds,
    geoLocations: geoLocations.importedIds, products: products.importedIds, transports: transports.importedIds,
    partners: partners.importedIds };
  bundle.crimeScripts.map((script) => remapScriptTaxonomies(script, remaps)).forEach((source) => {
    const index = result.crimeScripts.findIndex(({ id, starterOrigin }) =>
      id === source.id ||
      (starterOrigin?.bundleId === metadata.id && starterOrigin.scriptId === source.id)
    );
    const action = index < 0 ? 'replace' : choices[source.id] || 'skip';
    if (action === 'skip') return;
    const imported = action === 'copy'
      ? copyOwnedScript(withStarterOrigin(source, metadata))
      : withStarterOrigin(source, metadata);
    if (index >= 0 && action === 'replace') result.crimeScripts[index] = imported;
    else result.crimeScripts.push(imported);
  });
  result.starterBundle = metadata;
  result.cast = cast.items;
  result.attributes = attributes.items;
  result.locations = locations.items;
  result.geoLocations = geoLocations.items;
  result.products = products.items;
  result.transports = transports.items;
  result.partners = partners.items;
  return result;
};

export const collectStarterSuggestions = (
  workspace: DataModel,
  bundle: DataModel | undefined,
  kind: SuggestionKind,
  language: 'nl' | 'en',
  includeOtherLanguages = false
): StarterSuggestion[] => {
  const seen = new Set<string>();
  const suggestions: StarterSuggestion[] = [];
  const visit = (model: DataModel, metadata?: StarterBundleMetadata) =>
    model.crimeScripts.forEach((script) => {
      if (!includeOtherLanguages && script.language !== language) return;
      script.stages.forEach((scene) => scene.variants.forEach((act) => {
        const items = kind === 'indicator' ? act.indicators : act.measures;
        items.forEach((item) => {
          if (item.derivedFrom) return;
          const key = `${kind}:${item.label.trim().toLocaleLowerCase()}`;
          if (seen.has(key)) return;
          seen.add(key);
          const origin: SuggestionOrigin = {
            bundleId: script.starterOrigin?.bundleId || metadata?.id || 'workspace',
            bundleVersion: script.starterOrigin?.bundleVersion || metadata?.version || String(model.version),
            scriptId: script.id,
            itemId: item.id,
            kind,
          };
          suggestions.push({
            ...structuredClone(item),
            suggestionOrigin: origin,
            language: script.language,
            sources: structuredClone(script.literature),
          });
        });
      }));
    });
  if (bundle) visit(bundle, bundle.starterBundle);
  visit(workspace);
  return suggestions;
};

export const copySuggestion = (suggestion: StarterSuggestion): Indicator | Measure => {
  const { suggestionOrigin, language: _language, sources, ...item } = structuredClone(suggestion);
  return {
    ...item,
    id: newId(),
    derivedFrom: suggestionOrigin,
    inheritedSources: sources,
  };
};

const normalizedWords = (value: string) =>
  value.toLocaleLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/);

export const hasCloseDuplicate = (label: string, suggestions: Array<{ label: string }>): boolean => {
  const normalizedLabel = normalizedWords(label).join(' ');
  const wanted = new Set(normalizedWords(label));
  return suggestions.some(({ label: candidate }) => {
    const normalizedCandidate = normalizedWords(candidate).join(' ');
    const words = new Set(normalizedWords(candidate));
    const overlap = [...wanted].filter((word) => words.has(word)).length;
    const distance = editDistance(normalizedLabel, normalizedCandidate);
    return overlap / Math.max(wanted.size, words.size) >= 0.6 ||
      1 - distance / Math.max(normalizedLabel.length, normalizedCandidate.length) >= 0.8;
  });
};

const editDistance = (left: string, right: string): number => {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[right.length];
};

export const saveAsNewSuggestion = <T extends Indicator | Measure>(item: T): T => {
  const copy = structuredClone(item);
  copy.id = newId();
  delete copy.derivedFrom;
  return copy;
};

export const detachStarterScript = (script: CrimeScript): CrimeScript => {
  const detached = structuredClone(script);
  detached.id = newId();
  delete detached.starterOrigin;
  return detached;
};

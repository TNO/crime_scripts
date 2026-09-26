import type {
  STATUS,
  ContentLanguage,
  CrimeScript,
  DataModel,
  ID,
  ScriptClassification,
  ScriptMode,
} from './data-model.ts';

export const scriptsForMode = (scripts: CrimeScript[], mode: ScriptMode): CrimeScript[] => {
  if (mode === 'public') return scripts.filter(({ classification }) => classification === 'public');

  const byFamily = new Map<ID, CrimeScript>();
  scripts.forEach((script) => {
    const current = byFamily.get(script.scriptFamilyId);
    if (!current || (current.classification === 'public' && script.classification === 'restricted')) {
      byFamily.set(script.scriptFamilyId, script);
    }
  });
  return Array.from(byFamily.values());
};

export const sanitizeRelatedScriptReferences = (scripts: CrimeScript[]): CrimeScript[] => {
  const scriptsById = new Map(scripts.map((script) => [script.id, script]));
  return scripts.map((script) => ({
    ...script,
    stages: script.stages.map((scene) => ({
      ...scene,
      variants: scene.variants.map((act) => ({
        ...act,
        activities: act.activities.map((activity) => ({
          ...activity,
          relatedScriptIds: Array.isArray(activity.relatedScriptIds)
            ? Array.from(new Set(
              activity.relatedScriptIds.filter((id) => {
                const target = scriptsById.get(id);
                return target !== undefined && target.scriptFamilyId !== script.scriptFamilyId;
              })
            ))
            : undefined,
        })),
      })),
    })),
  }));
};

export const withoutCrimeScript = (model: DataModel, scriptId: ID): DataModel => {
  const copy = structuredClone(model);
  copy.crimeScripts = sanitizeRelatedScriptReferences(
    copy.crimeScripts.filter(({ id }) => id !== scriptId)
  );
  return copy;
};

export const createScriptForMode = (
  mode: ScriptMode,
  id: ID,
  language: ContentLanguage,
  updated = Date.now()
): CrimeScript => ({
  id,
  scriptFamilyId: id,
  classification: mode,
  label: '',
  owner: '',
  updated,
  reviewer: [],
  status: 1 as STATUS,
  literature: [],
  stages: [],
  productIds: [],
  language,
  aiGenerated: false,
});

const visitIds = (model: DataModel, visit: (id: ID) => void) => {
  [
    ...model.cast,
    ...model.attributes,
    ...model.locations,
    ...model.geoLocations,
    ...model.products,
    ...model.transports,
    ...model.partners,
  ].forEach(({ id }) => visit(id));
  model.crimeScripts.forEach((script) => {
    visit(script.id);
    script.literature.forEach(({ id }) => visit(id));
    script.stages.forEach((scene) => {
      visit(scene.id);
      scene.variants.forEach((act) => {
        visit(act.id);
        [...act.activities, ...act.conditions, ...act.opportunities, ...act.indicators, ...act.measures]
          .forEach(({ id }) => visit(id));
      });
    });
    (script.tracks || []).forEach(({ id }) => visit(id));
  });
};

export const hasRestrictedCounterpart = (model: DataModel, script: CrimeScript): boolean =>
  model.crimeScripts.some(
    (candidate) =>
      candidate.id !== script.id &&
      candidate.scriptFamilyId === script.scriptFamilyId &&
      candidate.classification === 'restricted'
  );

export const createRestrictedCounterpart = (
  model: DataModel,
  source: CrimeScript,
  createId: () => ID
): CrimeScript => {
  if (source.classification !== 'public') throw new Error('Only a public script can have a restricted version.');
  if (hasRestrictedCounterpart(model, source)) throw new Error('A restricted counterpart already exists.');

  const usedIds = new Set<ID>();
  visitIds(model, (id) => usedIds.add(id));
  const remapped = new Map<ID, ID>();
  const nextId = (original: ID) => {
    let id = createId();
    while (usedIds.has(id)) id = createId();
    usedIds.add(id);
    remapped.set(original, id);
    return id;
  };
  const copy = structuredClone(source);
  copy.id = nextId(source.id);
  copy.classification = 'restricted';
  copy.scriptFamilyId = source.scriptFamilyId;
  copy.starterOrigin = undefined;
  copy.updated = Date.now();
  copy.literature.forEach((item) => (item.id = nextId(item.id)));
  copy.stages.forEach((scene) => {
    scene.id = nextId(scene.id);
    scene.variants.forEach((act) => {
      act.id = nextId(act.id);
      act.activities.forEach((item) => (item.id = nextId(item.id)));
      act.conditions.forEach((item) => (item.id = nextId(item.id)));
      act.opportunities.forEach((item) => (item.id = nextId(item.id)));
      act.indicators.forEach((item) => (item.id = nextId(item.id)));
      act.measures.forEach((item) => (item.id = nextId(item.id)));
    });
  });
  (copy.tracks || []).forEach((item) => (item.id = nextId(item.id)));
  copy.stages.forEach((scene) => {
    scene.selectedVariantId = scene.selectedVariantId
      ? remapped.get(scene.selectedVariantId) || scene.selectedVariantId
      : undefined;
    scene.variants.forEach((act) => {
      act.activities.forEach((item) => {
        item.relatedScriptIds = item.relatedScriptIds
          ?.map((id) => remapped.get(id) || id)
          .filter((id) => id !== copy.id);
      });
      act.opportunities.forEach((item) => {
        item.parents = item.parents?.map((id) => remapped.get(id) || id);
      });
      act.indicators.forEach((item) => {
        item.parents = item.parents?.map((id) => remapped.get(id) || id);
      });
    });
  });
  (copy.tracks || []).forEach((track) => {
    track.sceneVariants = Object.fromEntries(
      Object.entries(track.sceneVariants).map(([sceneId, variantId]) => [
        remapped.get(sceneId) || sceneId,
        variantId ? remapped.get(variantId) || variantId : undefined,
      ])
    );
  });
  return copy;
};

const referencedTaxonomyIds = (scripts: CrimeScript[]) => {
  const ids = {
    cast: new Set<ID>(),
    attributes: new Set<ID>(),
    locations: new Set<ID>(),
    geoLocations: new Set<ID>(),
    products: new Set<ID>(),
    transports: new Set<ID>(),
    partners: new Set<ID>(),
  };
  scripts.forEach((script) => {
    script.productIds.forEach((id) => ids.products.add(id));
    (script.geoLocationIds || []).forEach((id) => ids.geoLocations.add(id));
    script.stages.forEach((scene) => scene.variants.forEach((act) => {
      (act.locationIds || []).forEach((id) => ids.locations.add(id));
      act.activities.forEach((activity) => {
        (activity.cast || []).forEach((id) => ids.cast.add(id));
        (activity.attributes || []).forEach((id) => ids.attributes.add(id));
        (activity.transports || []).forEach((id) => ids.transports.add(id));
      });
      act.measures.forEach((measure) => measure.partners.forEach((id) => ids.partners.add(id)));
    }));
  });
  return ids;
};

export const filterModelForPublicExport = (model: DataModel): DataModel => {
  const crimeScripts = sanitizeRelatedScriptReferences(
    structuredClone(model.crimeScripts.filter(({ classification }) => classification === 'public'))
  );
  const ids = referencedTaxonomyIds(crimeScripts);
  const include = <T extends { id: ID; parents?: ID[] }>(items: T[], direct: Set<ID>) => {
    const included = new Set(direct);
    let changed = true;
    while (changed) {
      changed = false;
      items.filter(({ id }) => included.has(id)).forEach(({ parents }) =>
        (parents || []).forEach((id) => {
          if (!included.has(id)) {
            included.add(id);
            changed = true;
          }
        })
      );
    }
    return items.filter(({ id }) => included.has(id));
  };
  return {
    ...structuredClone(model),
    crimeScripts,
    cast: include(model.cast, ids.cast),
    attributes: include(model.attributes, ids.attributes),
    locations: include(model.locations, ids.locations),
    geoLocations: include(model.geoLocations, ids.geoLocations),
    products: include(model.products, ids.products),
    transports: include(model.transports, ids.transports),
    partners: include(model.partners, ids.partners),
  };
};

export const hasRestrictedContent = (value: DataModel | Partial<CrimeScript>): boolean =>
  'crimeScripts' in value
    ? value.crimeScripts.some(({ classification }) => classification === 'restricted')
    : value.classification === 'restricted';

export const canShareModel = (model: DataModel): boolean => !hasRestrictedContent(model);

export const classifiedExportFilename = (
  label: string,
  classification: ScriptClassification,
  extension: 'json' | 'docx' | 'svg' | 'png'
): string => `${label.trim().replace(/\s+/g, '_')}_${classification.toUpperCase()}.${extension}`;

export const classificationHeader = (classification: ScriptClassification): string =>
  `Classification: **${classification.toUpperCase()}**`;

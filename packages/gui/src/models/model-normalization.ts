import type { Act, Activity, CrimeScript, DataModel, ID, Scene, ServiceProvider } from './data-model';

type LegacyActivity = Activity & { sp?: ID[] };

type LegacyScene = Omit<Scene, 'variants' | 'selectedVariantId'> & {
  ids?: ID[];
  actId?: ID;
  variants?: Act[];
  selectedVariantId?: ID;
};

type LegacyCrimeScript = Omit<CrimeScript, 'stages'> & {
  stages?: LegacyScene[];
};

type LegacyDataModel = Omit<DataModel, 'schemaVersion' | 'crimeScripts'> & {
  schemaVersion?: number;
  crimeScripts?: LegacyCrimeScript[];
  acts?: Act[];
  serviceProviders?: ServiceProvider[];
};

const clone = <T>(value: T): T => structuredClone(value);

const normalizeAct = (act: Act): Act => ({
  ...clone(act),
  activities: (act.activities || []).map((activity: LegacyActivity) => {
    const { sp, ...currentActivity } = clone(activity);
    return {
      ...currentActivity,
      cast: [...(currentActivity.cast || []), ...(sp || [])],
    };
  }),
  conditions: clone(act.conditions || []),
  indicators: clone(act.indicators || []).map((item) => ({
    ...item,
    inheritedSources: item.inheritedSources ? clone(item.inheritedSources) : undefined,
  })),
  measures: clone(act.measures || []).map((item) => ({
    ...item,
    cat: item.cat || 'other',
    partners: item.partners || [],
    inheritedSources: item.inheritedSources ? clone(item.inheritedSources) : undefined,
  })),
  opportunities: clone(act.opportunities || []),
});

export const normalizeDataModel = (input: unknown): DataModel => {
  if (!input || typeof input !== 'object') {
    throw new Error('Crime-script model must be an object.');
  }

  const legacy = clone(input) as LegacyDataModel;
  const actLookup = new Map((legacy.acts || []).map((act) => [act.id, act]));
  const crimeScripts = (legacy.crimeScripts || []).map((crimeScript) => {
    const sceneIdChanges = new Map<ID, ID>();
    const usedSceneIds = new Set((crimeScript.stages || []).map((scene) => scene.id));
    const stages = (crimeScript.stages || []).map((scene, sceneIndex) => {
      const variants = scene.variants
        ? scene.variants.map(normalizeAct)
        : (scene.ids || []).map((actId) => {
            const act = actLookup.get(actId);
            if (!act) {
              throw new Error(
                `Legacy act reference "${actId}" is missing in crime script "${crimeScript.label}", scene "${scene.label}".`
              );
            }
            return normalizeAct(act);
          });

      const { ids: _ids, actId: _actId, ...currentScene } = scene;
      const selectedVariantId = scene.selectedVariantId || scene.actId || variants[0]?.id;
      const legacyActWasScene = Boolean(scene.id && scene.ids?.includes(scene.id));
      let sceneId = scene.id;
      if (legacyActWasScene) {
        const baseId = `${crimeScript.id}-scene-${sceneIndex + 1}`;
        sceneId = baseId;
        let suffix = 2;
        while (usedSceneIds.has(sceneId)) {
          sceneId = `${baseId}-${suffix++}`;
        }
        sceneIdChanges.set(scene.id, sceneId);
        usedSceneIds.add(sceneId);
      }
      const legacyAct = legacyActWasScene ? variants.find((variant) => variant.id === scene.id) : undefined;
      const legacyActWithSceneMetadata = legacyAct as (Act & { isGeneric?: boolean }) | undefined;
      const sceneVariants = legacyActWasScene
        ? variants.map((variant) => {
            const { isGeneric: _isGeneric, ...currentVariant } = variant as Act & { isGeneric?: boolean };
            return currentVariant;
          })
        : variants;
      return {
        ...currentScene,
        id: sceneId,
        label: legacyAct?.label || currentScene.label,
        description: legacyAct?.description || currentScene.description,
        icon: legacyAct?.icon || currentScene.icon,
        url: legacyAct?.url || currentScene.url,
        isGeneric: legacyActWithSceneMetadata?.isGeneric ?? currentScene.isGeneric,
        variants: sceneVariants,
        selectedVariantId: variants.some((variant) => variant.id === selectedVariantId)
          ? selectedVariantId
          : variants[0]?.id,
      };
    });
    const tracks = crimeScript.tracks?.map((track) => ({
      ...track,
      sceneVariants: Object.fromEntries(
        Object.entries(track.sceneVariants).map(([sceneId, variantId]) => [
          sceneIdChanges.get(sceneId) || sceneId,
          variantId,
        ])
      ),
    }));
    return {
      ...crimeScript,
      icons: (crimeScript.icons?.length
        ? crimeScript.icons
        : crimeScript.icon !== undefined
          ? [crimeScript.icon]
          : undefined)?.slice(0, 4),
      owner: crimeScript.owner || '',
      updated: crimeScript.updated || legacy.lastUpdate || Date.now(),
      reviewer: crimeScript.reviewer || [],
      status: crimeScript.status || 1,
      literature: (crimeScript.literature || []).map((source) => ({ ...source })),
      productIds: crimeScript.productIds || [],
      language: crimeScript.language === 'en' ? 'en' : 'nl',
      aiGenerated: crimeScript.aiGenerated === true,
      stages,
      tracks,
    };
  });
  const {
    acts: _acts,
    schemaVersion: _schemaVersion,
    serviceProviders,
    cast = [],
    attributes = [],
    locations = [],
    geoLocations = [],
    products = [],
    transports = [],
    partners = [],
    ...currentModel
  } = legacy;

  return {
    ...currentModel,
    schemaVersion: 3,
    version: legacy.version || 1,
    lastUpdate: legacy.lastUpdate || Date.now(),
    crimeScripts,
    cast: [...cast, ...(serviceProviders || [])],
    attributes,
    locations,
    geoLocations,
    products,
    transports,
    partners,
    starterBundle: legacy.starterBundle,
  } as DataModel;
};

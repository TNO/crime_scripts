import type {
  Act,
  Activity,
  CrimeScript,
  DataModel,
  ID,
  Scene,
  ScriptClassification,
  ServiceProvider,
} from './data-model';

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

export type LegacyActRepair = {
  actId: ID;
  crimeScriptLabel: string;
  sceneLabel: string;
  kind: 'relinked' | 'placeholder';
  sourceActId?: ID;
};

const clone = <T>(value: T): T => structuredClone(value);
const V48_PUBLIC_SCRIPT_IDS = new Set<ID>(['id060ecbd5']);

const collectActReferenceIds = (act: Act): Set<ID> =>
  new Set([
    ...(act.locationIds || []),
    ...(act.activities || []).flatMap((activity: LegacyActivity) => [
      ...(activity.cast || []),
      ...(activity.sp || []),
      ...(activity.attributes || []),
      ...(activity.transports || []),
    ]),
    ...(act.measures || []).flatMap((measure) => measure.partners || []),
  ]);

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

const normalizeDataModelInternal = (
  input: unknown,
  defaultClassification: ScriptClassification,
  repairs?: LegacyActRepair[]
): DataModel => {
  if (!input || typeof input !== 'object') {
    throw new Error('Crime-script model must be an object.');
  }

  const legacy = clone(input) as LegacyDataModel;
  const actLookup = new Map((legacy.acts || []).map((act) => [act.id, act]));
  const referencedActIds = new Set(
    (legacy.crimeScripts || []).flatMap((crimeScript) =>
      (crimeScript.stages || []).flatMap((scene) => scene.ids || [])
    )
  );
  const unreferencedActs = (legacy.acts || []).filter((act) => !referencedActIds.has(act.id));
  const claimedRecoveryActIds = new Set<ID>();
  const crimeScripts = (legacy.crimeScripts || []).map((crimeScript) => {
    const sceneIdChanges = new Map<ID, ID>();
    const usedSceneIds = new Set((crimeScript.stages || []).map((scene) => scene.id));
    const scriptReferenceIds = new Set(
      (crimeScript.stages || [])
        .flatMap((scene) => scene.ids || [])
        .map((actId) => actLookup.get(actId))
        .filter((act): act is Act => Boolean(act))
        .flatMap((act) => [...collectActReferenceIds(act)])
    );
    const stages = (crimeScript.stages || []).map((scene, sceneIndex) => {
      const variants = scene.variants
        ? scene.variants.map(normalizeAct)
        : (scene.ids || []).map((actId) => {
            const act = actLookup.get(actId);
            if (act) return normalizeAct(act);
            if (!repairs) {
              throw new Error(
                `Legacy act reference "${actId}" is missing in crime script "${crimeScript.label}", scene "${scene.label}".`
              );
            }

            const matchingOrphans = unreferencedActs.filter(
              (candidate) =>
                !claimedRecoveryActIds.has(candidate.id) &&
                candidate.label.trim().toLocaleLowerCase() === scene.label.trim().toLocaleLowerCase() &&
                [...collectActReferenceIds(candidate)].some((id) => scriptReferenceIds.has(id))
            );
            const recoveredAct = matchingOrphans.length === 1 ? matchingOrphans[0] : undefined;
            if (recoveredAct) claimedRecoveryActIds.add(recoveredAct.id);
            repairs.push({
              actId,
              crimeScriptLabel: crimeScript.label,
              sceneLabel: scene.label,
              kind: recoveredAct ? 'relinked' : 'placeholder',
              sourceActId: recoveredAct?.id,
            });
            return normalizeAct(
              recoveredAct
                ? { ...recoveredAct, id: actId }
                : {
                    id: actId,
                    label: scene.label,
                    description: scene.description,
                    icon: scene.icon,
                    url: scene.url,
                    activities: [],
                    conditions: [],
                    indicators: [],
                    measures: [],
                    opportunities: [],
                  }
            );
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
      classification:
        crimeScript.classification === 'public' || crimeScript.classification === 'restricted'
          ? crimeScript.classification
          : legacy.version === 48 && !V48_PUBLIC_SCRIPT_IDS.has(crimeScript.id)
            ? 'restricted'
            : defaultClassification,
      scriptFamilyId: crimeScript.scriptFamilyId || crimeScript.id,
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

export const normalizeDataModel = (
  input: unknown,
  defaultClassification: ScriptClassification = 'public'
): DataModel => normalizeDataModelInternal(input, defaultClassification);

export const normalizeUploadedDataModel = (
  input: unknown,
  defaultClassification: ScriptClassification = 'public'
): { model: DataModel; repairs: LegacyActRepair[] } => {
  const repairs: LegacyActRepair[] = [];
  return {
    model: normalizeDataModelInternal(input, defaultClassification, repairs),
    repairs,
  };
};

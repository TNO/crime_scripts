import type {
  Activity,
  Cast,
  CrimeScript,
  ID,
  Scene,
  ScriptMode,
  Track,
} from './data-model.ts';
import { scriptsForMode } from './script-classification.ts';

export const selectedSceneVariant = (scene: Scene) =>
  scene.variants.find(({ id }) => id === scene.selectedVariantId) || scene.variants[0];

export const sceneOutlineDetails = (scene: Scene) => {
  const selectedVariant = selectedSceneVariant(scene);
  return {
    activityCount: selectedVariant?.activities.length || 0,
    selectedVariantLabel: selectedVariant?.label,
    variantCount: scene.variants.length,
  };
};

export const resolveActivityRoles = (activity: Activity, cast: Cast[]) => {
  const castById = new Map(cast.map((role) => [role.id, role]));
  return Array.from(new Set(activity.cast || []))
    .map((id) => castById.get(id))
    .filter((role): role is Cast => Boolean(role));
};

export const activityMatchesRole = (activity: Activity, roleId?: ID) =>
  !roleId || Boolean(activity.cast?.includes(roleId));

export const selectableRelatedScripts = (
  currentScript: CrimeScript,
  scripts: CrimeScript[],
  mode: ScriptMode
): CrimeScript[] =>
  scriptsForMode(scripts, mode)
    .filter(({ scriptFamilyId }) => scriptFamilyId !== currentScript.scriptFamilyId);

export const relatedScriptsForActivity = (
  activity: Activity,
  currentScript: CrimeScript,
  scripts: CrimeScript[],
  mode: ScriptMode
): CrimeScript[] => {
  const visibleScripts = selectableRelatedScripts(currentScript, scripts, mode);
  const allById = new Map(scripts.map((script) => [script.id, script]));
  const visibleById = new Map(visibleScripts.map((script) => [script.id, script]));
  const visibleByFamily = new Map(visibleScripts.map((script) => [script.scriptFamilyId, script]));
  const resolved = (Array.isArray(activity.relatedScriptIds) ? activity.relatedScriptIds : []).map((id) => {
    const target = allById.get(id);
    return visibleById.get(id) || (target && visibleByFamily.get(target.scriptFamilyId));
  });
  return Array.from(
    new Map(
      resolved
        .filter((script): script is CrimeScript =>
          script !== undefined && script.scriptFamilyId !== currentScript.scriptFamilyId
        )
        .map((script) => [script.id, script])
    ).values()
  );
};

export const sceneVariantSelection = (scenes: Scene[]) =>
  Object.fromEntries(
    scenes
      .filter(({ variants }) => variants.length > 1)
      .map((scene) => [scene.id, selectedSceneVariant(scene)?.id] as const)
      .filter((entry): entry is readonly [ID, ID] => Boolean(entry[1]))
  );

const selectionsEqual = (
  left: Record<ID, ID | undefined>,
  right: Record<ID, ID | undefined>
) => {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key]);
};

export const findMatchingTrack = (
  tracks: Track[],
  selection: Record<ID, ID | undefined>
) => {
  const variableSceneIds = Object.keys(selection);
  return tracks.find((track) =>
    variableSceneIds.length > 0
      ? variableSceneIds.every((sceneId) => track.sceneVariants[sceneId] === selection[sceneId])
      : selectionsEqual(track.sceneVariants, selection)
  );
};

export const applyTrackSelection = (scenes: Scene[], track: Track) => {
  scenes.forEach((scene) => {
    const variantId = track.sceneVariants[scene.id];
    if (variantId && scene.variants.some(({ id }) => id === variantId)) {
      scene.selectedVariantId = variantId;
    }
  });
};

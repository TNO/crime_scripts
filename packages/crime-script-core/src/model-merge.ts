import type { DataModel } from './data-model';
import { importStandaloneScript } from './starter-library.ts';

export const mergeDataModels = (current: DataModel, imported: DataModel): DataModel => {
  let result: DataModel = {
    ...structuredClone(current),
    crimeScripts: [],
  };
  current.crimeScripts.forEach((script) => {
    result = importStandaloneScript(result, { ...structuredClone(current), crimeScripts: [script] });
  });
  const usedFamilyIds = new Set(result.crimeScripts.map(({ scriptFamilyId }) => scriptFamilyId));
  const usedScriptIds = new Set(result.crimeScripts.map(({ id }) => id));
  const importedFamilyIds = new Set(imported.crimeScripts.map(({ scriptFamilyId }) => scriptFamilyId));
  const familyRemaps = new Map<string, string>();
  importedFamilyIds.forEach((familyId) => {
    const familyScripts = imported.crimeScripts.filter((script) => script.scriptFamilyId === familyId);
    const independentIdCopy =
      familyScripts.length === 1 &&
      familyScripts[0].id === familyId &&
      usedScriptIds.has(familyScripts[0].id);
    if (independentIdCopy) return;
    const scriptIdCollision = familyScripts.some((script) => usedScriptIds.has(script.id));
    if (!usedFamilyIds.has(familyId) && !scriptIdCollision) {
      usedFamilyIds.add(familyId);
      return;
    }
    const base = `${familyId}-imported`;
    let replacement = base;
    let suffix = 2;
    while (usedFamilyIds.has(replacement) || importedFamilyIds.has(replacement)) {
      replacement = `${base}-${suffix++}`;
    }
    familyRemaps.set(familyId, replacement);
    usedFamilyIds.add(replacement);
  });
  imported.crimeScripts.forEach((source) => {
    const script = structuredClone(source);
    script.scriptFamilyId = familyRemaps.get(script.scriptFamilyId) || script.scriptFamilyId;
    result = importStandaloneScript(result, { ...structuredClone(imported), crimeScripts: [script] });
  });
  result.version = Math.max(current.version, imported.version);
  result.lastUpdate = Math.max(current.lastUpdate, imported.lastUpdate);
  result.previewMode = false;
  result.starterBundle = imported.starterBundle || current.starterBundle;
  return result;
};

import { join } from 'node:path';
import { assertCandidateNodeKeys } from './build.ts';
import { GeneratorError } from './errors.ts';
import { readJson, writeJson } from './io.ts';
import type {
  CandidateFile,
  CandidateStage,
  CandidateTaxonomies,
  EvidenceClaim,
  EvidenceFile,
} from './types.ts';
import { validateCandidate, validateEvidence } from './validation.ts';
import { workspaceFiles } from './workspace.ts';

const candidatePath = (workspace: string) => join(workspace, workspaceFiles.candidate);
const evidencePath = (workspace: string) => join(workspace, workspaceFiles.evidence);

const readCandidate = async (workspace: string) =>
  validateCandidate(await readJson(candidatePath(workspace)));

const sceneKeys = (scene: CandidateStage): string[] => [
  scene.key,
  ...scene.variants.flatMap((variant) => [
    variant.key,
    ...variant.activities.map(({ key }) => key),
    ...(variant.indicators || []).map(({ key }) => key),
    ...(variant.measures || []).map(({ key }) => key),
    ...(variant.conditions || []).map(({ key }) => key),
  ]),
];

export const initCandidate = async (workspace: string, file: string): Promise<void> => {
  const candidate = validateCandidate(await readJson(file));
  if (candidate.script.stages.length > 0) {
    throw new GeneratorError('invalid-field', 'Candidate header must have an empty script.stages array.', '$.script.stages');
  }
  await writeJson(candidatePath(workspace), candidate);
};

export const addTaxonomy = async (
  workspace: string, file: string, taxonomy: keyof CandidateTaxonomies
): Promise<string> => {
  const candidate = await readCandidate(workspace);
  const item = await readJson(file) as CandidateTaxonomies[typeof taxonomy][number];
  if (candidate.taxonomies[taxonomy].some(({ key }) => key === item?.key)) {
    throw new GeneratorError('duplicate-key', `Taxonomy key "${item.key}" already exists in ${taxonomy}.`, `$.taxonomies.${taxonomy}`);
  }
  const next: CandidateFile = {
    ...candidate,
    taxonomies: { ...candidate.taxonomies, [taxonomy]: [...candidate.taxonomies[taxonomy], item] },
  };
  validateCandidate(next);
  await writeJson(candidatePath(workspace), next, { overwrite: true });
  return item.key;
};

export const addScene = async (workspace: string, file: string, replace = false): Promise<string> => {
  const candidate = await readCandidate(workspace);
  const scene = await readJson(file) as CandidateStage;
  const index = candidate.script.stages.findIndex(({ key }) => key === scene?.key);
  if (index >= 0 && !replace) {
    throw new GeneratorError('duplicate-key', `Scene key "${scene.key}" already exists; use --replace to revise it.`, '$.script.stages');
  }
  const stages = [...candidate.script.stages];
  if (index >= 0) stages[index] = scene;
  else stages.push(scene);
  const next: CandidateFile = { ...candidate, script: { ...candidate.script, stages } };
  validateCandidate(next);
  assertCandidateNodeKeys(next);
  await writeJson(candidatePath(workspace), next, { overwrite: true });
  return scene.key;
};

export const addActivity = async (
  workspace: string, file: string, sceneKey: string, variantKey: string
): Promise<string> => {
  const candidate = await readCandidate(workspace);
  const sceneIndex = candidate.script.stages.findIndex(({ key }) => key === sceneKey);
  if (sceneIndex < 0) throw new GeneratorError('unknown-scene-key', `Unknown scene key "${sceneKey}".`, '--scene-key');
  const scene = candidate.script.stages[sceneIndex];
  const variantIndex = scene.variants.findIndex(({ key }) => key === variantKey);
  if (variantIndex < 0) {
    throw new GeneratorError('unknown-variant-key', `Unknown M.O. variant key "${variantKey}".`, '--variant-key');
  }
  const activity = await readJson(file) as CandidateStage['variants'][number]['activities'][number];
  const variants = [...scene.variants];
  variants[variantIndex] = {
    ...variants[variantIndex],
    activities: [...variants[variantIndex].activities, activity],
  };
  const stages = [...candidate.script.stages];
  stages[sceneIndex] = { ...scene, variants };
  const next: CandidateFile = { ...candidate, script: { ...candidate.script, stages } };
  validateCandidate(next);
  assertCandidateNodeKeys(next);
  await writeJson(candidatePath(workspace), next, { overwrite: true });
  return activity.key;
};

export const addSource = async (workspace: string, file: string, replace = false): Promise<string> => {
  const evidence = validateEvidence(await readJson(evidencePath(workspace)));
  const source = await readJson(file) as EvidenceFile['sources'][number];
  const index = evidence.sources.findIndex(({ key }) => key === source?.key);
  if (index >= 0 && !replace) {
    throw new GeneratorError('duplicate-source-key', `Source key "${source.key}" already exists; use --replace to revise it.`, '$.sources');
  }
  const sources = [...evidence.sources];
  if (index >= 0) sources[index] = source;
  else sources.push(source);
  const next: EvidenceFile = { ...evidence, sources };
  validateEvidence(next);
  await writeJson(evidencePath(workspace), next, { overwrite: true });
  return source.key;
};

export const addSceneClaims = async (
  workspace: string, file: string, sceneKey: string, replace = false
): Promise<number> => {
  const candidate = await readCandidate(workspace);
  const scene = candidate.script.stages.find(({ key }) => key === sceneKey);
  if (!scene) throw new GeneratorError('unknown-scene-key', `Unknown scene key "${sceneKey}".`, '--scene-key');
  const rawClaims = await readJson(file);
  if (!Array.isArray(rawClaims)) {
    throw new GeneratorError('invalid-field', 'Scene claims must be a JSON array.', file);
  }
  const claims = rawClaims as EvidenceClaim[];
  const allowed = new Set(sceneKeys(scene));
  const invalid = claims.find((claim) =>
    !claim || typeof claim !== 'object' || !allowed.has(claim.nodeKey));
  if (invalid) {
    throw new GeneratorError('unknown-scene-node', `A claim does not belong to scene "${sceneKey}".`, file);
  }
  const evidence = validateEvidence(await readJson(evidencePath(workspace)));
  const previous = evidence.claims.filter(({ nodeKey }) => allowed.has(nodeKey));
  if (previous.length > 0 && !replace) {
    throw new GeneratorError('duplicate-claim', `Scene "${sceneKey}" already has claims; use --replace to revise them.`, '$.claims');
  }
  const next: EvidenceFile = {
    ...evidence,
    claims: [...evidence.claims.filter(({ nodeKey }) => !allowed.has(nodeKey)), ...claims],
  };
  validateEvidence(next);
  const keys = new Set<string>();
  for (const claim of next.claims) {
    if (keys.has(claim.nodeKey)) {
      throw new GeneratorError('duplicate-claim', `Duplicate claim "${claim.nodeKey}".`, '$.claims');
    }
    keys.add(claim.nodeKey);
  }
  const sourceKeys = new Set(next.sources.map(({ key }) => key));
  const unknownSource = claims.flatMap(({ sourceKeys: keys }) => keys)
    .find((key) => !sourceKeys.has(key));
  if (unknownSource) {
    throw new GeneratorError('unknown-source-key', `Unknown evidence source "${unknownSource}".`, file);
  }
  await writeJson(evidencePath(workspace), next, { overwrite: true });
  return claims.length;
};

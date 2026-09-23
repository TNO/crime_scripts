import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { normalizeUploadedDataModel } from '@crime-script/core/model-normalization';
import { importStandaloneScript } from '@crime-script/core/starter-library';
import type { CrimeScript, DataModel, ID, Labelled } from '@crime-script/core/data-model';
import { buildStandaloneCandidate, sourceToLiterature } from './build.ts';
import { GeneratorError } from './errors.ts';
import { pathExists, readJson, readVersionOneJson, writeJson } from './io.ts';
import { sha256, slugify } from './text.ts';
import type {
  CandidateFile,
  EvidenceFile,
  GeneratorIssue,
  ResearchLogFile,
  StatusResult,
  WorkspaceState,
} from './types.ts';
import {
  validateCandidate,
  validateDataModel,
  validateEvidence,
  validateResearchLog,
  validateStandaloneModel,
} from './validation.ts';
import {
  assertPreparedMaterialsCurrent,
  loadBrief,
  resolveBriefPath,
  workspaceFiles,
} from './workspace.ts';

type LoadedWorkspace = {
  brief: Awaited<ReturnType<typeof loadBrief>>;
  state: WorkspaceState;
  bundle: DataModel;
  candidate: CandidateFile;
  evidence: EvidenceFile;
  research: ResearchLogFile;
};

const loadState = async (workspacePath: string): Promise<WorkspaceState> => {
  const path = join(workspacePath, workspaceFiles.state);
  if (!await pathExists(path)) {
    throw new GeneratorError('prepare-required', 'Run prepare before this command.', path);
  }
  const state = await readVersionOneJson(
    path,
    ['bundleHash', 'briefHash', 'normalizedBundlePath']
  ) as Partial<WorkspaceState>;
  if (state.schemaVersion !== 1 || !state.bundleHash || !state.briefHash || !state.normalizedBundlePath) {
    throw new GeneratorError('invalid-state', 'Workspace state is incomplete or unsupported.', path);
  }
  return state as WorkspaceState;
};

const loadWorkspace = async (workspacePath: string): Promise<LoadedWorkspace> => {
  const brief = await loadBrief(workspacePath);
  const state = await loadState(workspacePath);
  await assertPreparedInputsCurrent(workspacePath, { brief, state });
  const candidatePath = join(workspacePath, workspaceFiles.candidate);
  if (!await pathExists(candidatePath)) {
    throw new GeneratorError(
      'candidate-required',
      `Create ${workspaceFiles.candidate} from the prepared context before building.`,
      candidatePath
    );
  }
  const bundle = normalizeUploadedDataModel(
    await readJson(join(workspacePath, state.normalizedBundlePath)),
    brief.classification
  ).model;
  validateDataModel(bundle);
  const loaded = {
    brief,
    state,
    bundle,
    candidate: validateCandidate(await readVersionOneJson(candidatePath, ['script', 'taxonomies'])),
    evidence: validateEvidence(await readVersionOneJson(
      join(workspacePath, workspaceFiles.evidence),
      ['sources', 'claims']
    )),
    research: validateResearchLog(await readVersionOneJson(
      join(workspacePath, workspaceFiles.researchLog),
      ['entries', 'contradictionSearchCompleted', 'missingPerspectiveSearchCompleted']
    )),
  };
  validateEvidenceProvenance(loaded.evidence, state);
  await assertRestrictedResearchPrivacy(workspacePath, loaded);
  return loaded;
};

const validateEvidenceProvenance = (evidence: EvidenceFile, state: WorkspaceState): void => {
  const materialByPath = new Map(state.materials.flatMap((material) => [
    [material.sourcePath, material] as const,
    [basename(material.sourcePath), material] as const,
  ]));
  evidence.sources.forEach((source, index) => {
    const path = `$.sources[${index}]`;
    if (source.kind === 'web') {
      if (!source.url || !/^https?:\/\//i.test(source.url) || !source.accessedAt) {
        throw new GeneratorError(
          'invalid-web-provenance',
          `Web source "${source.key}" requires an HTTP(S) URL and accessedAt date.`,
          path
        );
      }
      return;
    }
    if (!source.filename) {
      throw new GeneratorError(
        'invalid-local-provenance',
        `Local source "${source.key}" requires a filename.`,
        path
      );
    }
    const material = materialByPath.get(source.filename);
    if (!material || ![material.sourceHash, material.markdownHash].includes(source.contentHash)) {
      throw new GeneratorError(
        'invalid-local-provenance',
        `Local source "${source.key}" does not match a prepared material hash.`,
        path
      );
    }
  });
};

const normalizedWords = (value: string): string[] =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

export const findRestrictedResearchLeak = (
  contents: string[],
  brief: LoadedWorkspace['brief'],
  research: ResearchLogFile,
  materialNames: string[] = []
): number | undefined => {
  if (brief.sourceSensitivity !== 'restricted') return undefined;
  const sensitivePhrases = new Set<string>();
  const sensitiveIdentifiers = new Set<string>();
  const approvedText = normalizedWords([
    brief.subject,
    brief.purpose,
    brief.geography,
    ...(brief.focus || []),
  ].join(' ')).join(' ');
  for (const content of contents) {
    const words = normalizedWords(content);
    for (let size = 3; size <= 6; size += 1) {
      for (let index = 0; index <= words.length - size; index += 1) {
        const phrase = words.slice(index, index + size).join(' ');
        if (!approvedText.includes(phrase)) sensitivePhrases.add(phrase);
      }
    }
    content.match(/\b[\p{Lu}][\p{Ll}\p{M}'’-]{1,}(?:\s+[\p{Lu}][\p{Ll}\p{M}'’-]{1,})+\b/gu)
      ?.forEach((name) => {
        const normalized = normalizedWords(name).join(' ');
        if (!approvedText.includes(normalized)) sensitivePhrases.add(normalized);
      });
    content.match(/\b(?=[A-Za-z0-9._/-]*\d)(?=[A-Za-z0-9._/-]*[A-Za-z])[A-Za-z0-9][A-Za-z0-9._/-]+\b/g)
      ?.forEach((identifier) => {
        const normalized = normalizedWords(identifier).join(' ');
        if (!approvedText.includes(normalized)) sensitiveIdentifiers.add(normalized);
      });
  }
  for (const [index, entry] of research.entries.entries()) {
    const raw = [entry.query, entry.url].filter(Boolean).join(' ');
    const decoded = raw.replace(/(?:%[0-9a-f]{2})+/gi, (encoded) => {
      try {
        return decodeURIComponent(encoded);
      } catch {
        return ' ';
      }
    });
    const exposed = normalizedWords(`${raw} ${decoded}`).join(' ');
    const decodedExposed = ` ${normalizedWords(decoded).join(' ')} `;
    let copiedPhrase = false;
    for (const phrase of sensitivePhrases) {
      if (exposed.includes(phrase)) {
        copiedPhrase = true;
        break;
      }
    }
    if (copiedPhrase) {
      return index;
    }
    if ([...sensitiveIdentifiers].some((identifier) =>
      decodedExposed.includes(` ${identifier} `)
    )) {
      return index;
    }
    const leakedFilename = materialNames.some((sourcePath) => {
      const filename = basename(sourcePath, extname(sourcePath));
      const words = normalizedWords(filename);
      const fingerprint = words.join(' ');
      const compactIdentifier = filename.length >= 3 && /\d/.test(filename) && /[A-Za-z]/.test(filename);
      const distinctivePhrase = words.length >= 2 && fingerprint.length >= 6;
      const longStem = filename.length >= 12;
      return !approvedText.includes(fingerprint) &&
        (compactIdentifier || distinctivePhrase || longStem) &&
        exposed.includes(fingerprint);
    });
    if (leakedFilename) {
      return index;
    }
  }
  return undefined;
};

const assertRestrictedResearchPrivacy = async (
  workspacePath: string,
  loaded: LoadedWorkspace
): Promise<void> => {
  if (loaded.brief.sourceSensitivity !== 'restricted') return;
  const contents = await Promise.all(
    loaded.state.materials.map((material) =>
      readFile(resolve(workspacePath, material.markdownPath), 'utf8')
    )
  );
  const leakingEntry = findRestrictedResearchLeak(
    contents,
    loaded.brief,
    loaded.research,
    loaded.state.materials.map(({ sourcePath }) => sourcePath)
  );
  if (leakingEntry !== undefined) {
    throw new GeneratorError(
      'restricted-query-leak',
      'A research query or URL contains text, a name, an identifier, or a filename copied from restricted local material.',
      `$.entries[${leakingEntry}]`
    );
  }
};

const assertPreparedInputsCurrent = async (
  workspacePath: string,
  loaded: Pick<LoadedWorkspace, 'brief' | 'state'>
): Promise<void> => {
  const liveBrief = await loadBrief(workspacePath);
  if (sha256(JSON.stringify(liveBrief)) !== loaded.state.briefHash) {
    throw new GeneratorError(
      'prepare-required',
      'brief.yaml changed after prepare; run prepare again.',
      workspaceFiles.brief
    );
  }
  const bundlePath = resolveBriefPath(workspacePath, loaded.brief.bundlePath);
  const liveBundle = normalizeUploadedDataModel(
    await readJson(bundlePath),
    loaded.brief.classification
  ).model;
  validateDataModel(liveBundle);
  if (sha256(JSON.stringify(liveBundle)) !== loaded.state.bundleHash) {
    throw new GeneratorError(
      'prepare-required',
      'The source bundle changed after prepare; run prepare again.',
      loaded.brief.bundlePath
    );
  }
  const normalizedPath = join(workspacePath, loaded.state.normalizedBundlePath);
  if (!await pathExists(normalizedPath)) {
    throw new GeneratorError(
      'prepare-required',
      'The prepared normalized bundle is missing; run prepare again.',
      loaded.state.normalizedBundlePath
    );
  }
  const normalizedBundle = normalizeUploadedDataModel(
    await readJson(normalizedPath),
    loaded.brief.classification
  ).model;
  validateDataModel(normalizedBundle);
  if (sha256(JSON.stringify(normalizedBundle)) !== loaded.state.bundleHash) {
    throw new GeneratorError(
      'prepare-required',
      'The prepared normalized bundle changed after prepare; run prepare again.',
      loaded.state.normalizedBundlePath
    );
  }
  await assertPreparedMaterialsCurrent(workspacePath, loaded.brief, loaded.state);
};

const researchComplete = (research: ResearchLogFile): boolean =>
  research.contradictionSearchCompleted && research.missingPerspectiveSearchCompleted;

const sourceAgeYears = (publicationDate: string | undefined, now: number): number | undefined => {
  if (!publicationDate) return undefined;
  const timestamp = Date.parse(publicationDate);
  if (Number.isNaN(timestamp)) return undefined;
  return Math.max(0, Math.floor((now - timestamp) / (365.25 * 24 * 60 * 60 * 1000)));
};

const comparableBuild = (model: DataModel): string => {
  const copy = structuredClone(model);
  copy.lastUpdate = 0;
  copy.crimeScripts.forEach((script) => {
    script.updated = 0;
  });
  const canonicalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  };
  return JSON.stringify(canonicalize(copy));
};

const issueFor = (error: unknown): GeneratorIssue => {
  if (error instanceof GeneratorError) {
    return {
      code: error.code,
      path: error.path || '$',
      message: error.message,
      severity: 'error',
    };
  }
  return {
    code: 'unexpected-error',
    path: '$',
    message: error instanceof Error ? error.message : String(error),
    severity: 'error',
  };
};

export const getWorkspaceStatus = async (workspacePath: string): Promise<StatusResult> => {
  const artifacts: Record<string, string> = {};
  if (!await pathExists(join(workspacePath, workspaceFiles.state))) {
    return { ok: false, issues: [], nextAction: 'prepare', artifacts };
  }
  artifacts.context = workspaceFiles.context;
  try {
    const brief = await loadBrief(workspacePath);
    const state = await loadState(workspacePath);
    await assertPreparedInputsCurrent(workspacePath, { brief, state });
    if (!await pathExists(join(workspacePath, workspaceFiles.candidate))) {
      return { ok: false, issues: [], nextAction: 'write-candidate', artifacts };
    }
    const loaded = await loadWorkspace(workspacePath);
    const result = buildStandaloneCandidate(
      loaded.bundle,
      loaded.brief,
      loaded.candidate,
      loaded.evidence,
      researchComplete(loaded.research),
      Date.now(),
      { allowClassificationChange: true, allowDeletions: true }
    );
    const issues = [...result.issues];
    if (
      loaded.brief.existingScriptId &&
      loaded.bundle.crimeScripts.find(({ id }) => id === loaded.brief.existingScriptId)?.classification !==
        loaded.brief.classification
    ) {
      issues.push({
        code: 'classification-change-confirmation-required',
        path: '$.classification',
        message: 'The update changes script classification and requires explicit confirmation at build.',
        severity: 'warning',
      });
    }
    if ((loaded.candidate.script.removeIds || []).length > 0) {
      issues.push({
        code: 'deletion-confirmation-required',
        path: '$.script.removeIds',
        message: 'The update deletes existing nodes and requires explicit confirmation at build.',
        severity: 'warning',
      });
    }
    if (await pathExists(join(workspacePath, workspaceFiles.lastBuild))) {
      const lastBuild = normalizeUploadedDataModel(
        await readJson(join(workspacePath, workspaceFiles.lastBuild)),
        loaded.brief.classification
      ).model;
      if (comparableBuild(lastBuild) === comparableBuild(result.model)) {
        artifacts.lastBuild = workspaceFiles.lastBuild;
        const reportPath = join(workspacePath, workspaceFiles.buildReport);
        if (await pathExists(reportPath)) {
          const report = await readJson(reportPath) as { output?: unknown };
          if (typeof report.output === 'string') {
            const standalonePath = resolve(workspacePath, report.output);
            if (await pathExists(standalonePath)) {
              const reviewed = normalizeUploadedDataModel(
                await readJson(standalonePath),
                loaded.brief.classification
              ).model;
              validateStandaloneModel(reviewed);
              artifacts.reviewedStandalone = report.output;
              if (comparableBuild(reviewed) !== comparableBuild(lastBuild)) {
                return { ok: true, issues, nextAction: 'merge', artifacts };
              }
            }
          }
        }
        return { ok: true, issues, nextAction: 'review', artifacts };
      }
    }
    return { ok: true, issues, nextAction: 'build', artifacts };
  } catch (error) {
    const issue = issueFor(error);
    return {
      ok: false,
      issues: [issue],
      nextAction: [
        'missing-evidence',
        'research-incomplete',
        'invalid-web-provenance',
        'invalid-local-provenance',
        'invalid-evidence-source',
        'restricted-query-leak',
      ].includes(issue.code)
        ? 'add-evidence'
        : issue.code === 'prepare-required'
          ? 'prepare'
          : 'fix-candidate',
      artifacts,
    };
  }
};

export type BuildCommandOptions = {
  output?: string;
  overwrite?: boolean;
  confirmClassificationChange?: boolean;
  confirmDeletions?: boolean;
};

export const buildWorkspace = async (
  workspacePath: string,
  options: BuildCommandOptions = {}
): Promise<{ output: string; report: string }> => {
  const loaded = await loadWorkspace(workspacePath);
  const now = Date.now();
  const result = buildStandaloneCandidate(
    loaded.bundle,
    loaded.brief,
    loaded.candidate,
    loaded.evidence,
    researchComplete(loaded.research),
    now,
    {
      allowClassificationChange: options.confirmClassificationChange,
      allowDeletions: options.confirmDeletions,
    }
  );
  validateStandaloneModel(result.model);
  const bundlePath = resolveBriefPath(workspacePath, loaded.brief.bundlePath);
  const output = options.output
    ? resolve(options.output)
    : join(dirname(bundlePath), `${slugify(result.model.crimeScripts[0].label)}.standalone.json`);
  if (!options.overwrite && await pathExists(output)) {
    throw new GeneratorError('output-exists', `Refusing to overwrite existing file ${output}.`, output);
  }
  await writeJson(output, result.model, { overwrite: options.overwrite });
  await writeJson(join(workspacePath, workspaceFiles.lastBuild), result.model, { overwrite: true });
  const reportPath = join(workspacePath, workspaceFiles.buildReport);
  await writeJson(reportPath, {
    schemaVersion: 1,
    builtAt: new Date(now).toISOString(),
    output: relative(workspacePath, output),
    scriptId: result.model.crimeScripts[0].id,
    issues: result.issues,
    newTaxonomy: result.newTaxonomy,
    keyToId: result.keyToId,
    sourceKeyToLiteratureId: result.sourceKeyToLiteratureId,
    evidence: {
      sources: loaded.evidence.sources.map((source) => ({
        key: source.key,
        title: source.title,
        kind: source.kind,
        state: source.state,
        publicationDate: source.publicationDate,
        accessedAt: source.accessedAt,
        ageYears: sourceAgeYears(source.publicationDate, now),
      })),
      claims: loaded.evidence.claims,
    },
  }, { overwrite: true });
  return { output, report: reportPath };
};

export type ReviewAnswer = {
  nodeId: ID;
  evidenceStillApplies: boolean;
  sourceKeys?: string[];
};

const validateReviewAnswersFile = (value: unknown, path: string): ReviewAnswer[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new GeneratorError('invalid-review-answers', 'Review answers must be an object.', path);
  }
  const root = value as Record<string, unknown>;
  if (
    root.schemaVersion !== 1 ||
    !Array.isArray(root.answers) ||
    Object.keys(root).some((key) => !['schemaVersion', 'answers'].includes(key))
  ) {
    throw new GeneratorError(
      'invalid-review-answers',
      'Review answers must use schemaVersion 1 and contain only an answers array.',
      path
    );
  }
  const seen = new Set<ID>();
  return root.answers.map((value, index) => {
    const answerPath = `${path}.answers[${index}]`;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new GeneratorError('invalid-review-answers', 'Review answer must be an object.', answerPath);
    }
    const answer = value as Record<string, unknown>;
    if (
      typeof answer.nodeId !== 'string' ||
      !answer.nodeId.trim() ||
      typeof answer.evidenceStillApplies !== 'boolean' ||
      Object.keys(answer).some((key) =>
        !['nodeId', 'evidenceStillApplies', 'sourceKeys'].includes(key)
      ) ||
      (
        answer.sourceKeys !== undefined &&
        (
          !Array.isArray(answer.sourceKeys) ||
          answer.sourceKeys.some((key) => typeof key !== 'string' || !key.trim())
        )
      )
    ) {
      throw new GeneratorError('invalid-review-answers', 'Review answer has invalid fields.', answerPath);
    }
    if (seen.has(answer.nodeId)) {
      throw new GeneratorError(
        'invalid-review-answers',
        `Duplicate review answer for node "${answer.nodeId}".`,
        answerPath
      );
    }
    seen.add(answer.nodeId);
    return {
      nodeId: answer.nodeId,
      evidenceStillApplies: answer.evidenceStillApplies,
      sourceKeys: answer.sourceKeys as string[] | undefined,
    };
  });
};

export type ReviewPrompt = (
  node: {
    id: ID;
    label: string;
    before: unknown;
    after: unknown;
    hasExistingEvidence: boolean;
    existingSourceKeys: string[];
  }
) => Promise<ReviewAnswer>;

const ownedNodes = (script: CrimeScript): Map<ID, Labelled> => new Map([
  [script.id, script],
  ...script.stages.flatMap((stage) => [
    [stage.id, stage] as [ID, Labelled],
    ...stage.variants.flatMap((variant) => [
      [variant.id, variant] as [ID, Labelled],
      ...variant.activities.map((item) => [item.id, item] as [ID, Labelled]),
      ...variant.conditions.map((item) => [item.id, item] as [ID, Labelled]),
      ...variant.indicators.map((item) => [item.id, item] as [ID, Labelled]),
      ...variant.measures.map((item) => [item.id, item] as [ID, Labelled]),
      ...variant.opportunities.map((item) => [item.id, item] as [ID, Labelled]),
    ]),
  ]),
]);

const changedNodes = (before: CrimeScript, after: CrimeScript): Array<{
  id: ID;
  label: string;
  before: Labelled | undefined;
  after: Labelled;
}> => {
  const oldNodes = ownedNodes(before);
  const evidenceRelevantValue = (node: Labelled): unknown => {
    const value = node as Labelled & {
      stages?: unknown[];
      variants?: unknown[];
      activities?: unknown[];
      locationIds?: ID[];
      owner?: string;
      productIds?: ID[];
      geoLocationIds?: ID[];
      classification?: string;
    };
    if (value.stages) {
      return {
        label: value.label,
        description: value.description,
        owner: value.owner,
        productIds: value.productIds,
        geoLocationIds: value.geoLocationIds,
        classification: value.classification,
      };
    }
    if (value.variants) return { label: value.label, description: value.description };
    if (value.activities) {
      return { label: value.label, description: value.description, locationIds: value.locationIds };
    }
    return node;
  };
  return [...ownedNodes(after).entries()]
    .filter(([id, node]) =>
      !oldNodes.has(id) ||
      JSON.stringify(evidenceRelevantValue(oldNodes.get(id)!)) !==
        JSON.stringify(evidenceRelevantValue(node))
    )
    .map(([id, node]) => ({
      id,
      label: node.label,
      before: oldNodes.get(id),
      after: node,
    }));
};

const deletedNodeIds = (before: CrimeScript, after: CrimeScript): ID[] => {
  const retained = ownedNodes(after);
  return [...ownedNodes(before).keys()].filter((id) => id !== before.id && !retained.has(id));
};

const applyEvidenceReview = (
  evidence: EvidenceFile,
  keyToId: Record<string, ID>,
  answers: ReviewAnswer[]
): EvidenceFile => {
  const knownSourceKeys = new Set(evidence.sources.map(({ key }) => key));
  const keyById = new Map(Object.entries(keyToId).map(([key, id]) => [id, key]));
  const answerByKey = new Map(
    answers
      .map((answer) => [keyById.get(answer.nodeId) || `human-edit:${answer.nodeId}`, answer] as const)
  );
  const claims = evidence.claims.map((claim) => {
    const answer = answerByKey.get(claim.nodeKey);
    if (!answer) return claim;
    if (answer.evidenceStillApplies) return { ...claim, state: 'valid' as const };
    const unknownSource = answer.sourceKeys?.find((key) => !knownSourceKeys.has(key));
    if (unknownSource) {
      throw new GeneratorError(
        'unknown-source-key',
        `Evidence review references unknown source "${unknownSource}".`,
        claim.nodeKey
      );
    }
    return {
      ...claim,
      sourceKeys: answer.sourceKeys || [],
      state: answer.sourceKeys?.length ? 'valid' as const : 'unsubstantiated-after-human-edit' as const,
    };
  });
  answerByKey.forEach((answer, nodeKey) => {
    if (claims.some((claim) => claim.nodeKey === nodeKey)) return;
    if (answer.evidenceStillApplies) {
      throw new GeneratorError(
        'missing-existing-evidence',
        `Node "${nodeKey}" has no existing evidence to retain.`,
        nodeKey
      );
    }
    const unknownSource = answer.sourceKeys?.find((key) => !knownSourceKeys.has(key));
    if (unknownSource) {
      throw new GeneratorError(
        'unknown-source-key',
        `Evidence review references unknown source "${unknownSource}".`,
        nodeKey
      );
    }
    claims.push({
      nodeKey,
      sourceKeys: answer.sourceKeys || [],
      state: answer.evidenceStillApplies || answer.sourceKeys?.length
        ? 'valid'
        : 'unsubstantiated-after-human-edit',
    });
  });
  return { ...evidence, claims };
};

const reconcileReviewedLiterature = (
  script: CrimeScript,
  evidence: EvidenceFile,
  report: {
    keyToId?: Record<string, ID>;
    sourceKeyToLiteratureId?: Record<string, ID>;
  }
): void => {
  const nodes = ownedNodes(script);
  const sourceByKey = new Map(evidence.sources.map((source) => [source.key, source]));
  const uses = new Map<string, string[]>();
  evidence.claims
    .filter(({ state }) => state === 'valid')
    .forEach((claim) => {
      const nodeId = report.keyToId?.[claim.nodeKey] ||
        (claim.nodeKey.startsWith('human-edit:')
          ? claim.nodeKey.slice('human-edit:'.length)
          : undefined);
      const node = nodeId ? nodes.get(nodeId) : undefined;
      if (!node) return;
      claim.sourceKeys.forEach((sourceKey) => {
        const labels = uses.get(sourceKey) || [];
        labels.push(node.label);
        uses.set(sourceKey, labels);
      });
    });

  const managedIds = new Set(Object.values(report.sourceKeyToLiteratureId || {}));
  const usedIds = new Set<ID>();
  const collectIds = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(collectIds);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, unknown>;
    if (typeof object.id === 'string') usedIds.add(object.id);
    Object.values(object).forEach(collectIds);
  };
  collectIds(script);
  managedIds.forEach((id) => usedIds.delete(id));

  const matchedIds = new Set<ID>();
  const generated = [...uses.entries()].map(([sourceKey, labels]) => {
    const source = sourceByKey.get(sourceKey);
    if (!source || (source.state && source.state !== 'valid')) {
      throw new GeneratorError(
        'invalid-replacement-source',
        `Evidence source "${sourceKey}" is not valid for the reviewed script.`,
        sourceKey
      );
    }
    let retained = source.existingId
      ? script.literature.find(({ id }) => id === source.existingId)
      : undefined;
    retained ||= script.literature.find((item) =>
      (source.url && item.url === source.url) ||
      item.label.trim().toLocaleLowerCase() === source.title.trim().toLocaleLowerCase()
    );
    const reportedId = report.sourceKeyToLiteratureId?.[sourceKey];
    retained ||= reportedId
      ? script.literature.find(({ id }) => id === reportedId)
      : undefined;
    if (source.existingId && !retained) {
      throw new GeneratorError(
        'unknown-existing-literature',
        `Evidence source "${sourceKey}" references unknown literature ID "${source.existingId}".`,
        sourceKey
      );
    }
    const item = sourceToLiterature(
      source,
      script.id,
      usedIds,
      [...new Set(labels)].join(', '),
      retained?.id
    );
    matchedIds.add(item.id);
    return item;
  });

  const preserved = script.literature.filter(({ id }) =>
    !managedIds.has(id) && !matchedIds.has(id)
  );
  script.literature = [...generated, ...preserved];
};

export type MergeCommandOptions = {
  standalone: string;
  bundle?: string;
  output?: string;
  overwrite?: boolean;
  confirmed: boolean;
  confirmClassificationChange?: boolean;
  confirmDeletions?: boolean;
  reviewAnswers?: string;
  reviewPrompt?: ReviewPrompt;
};

export const mergeWorkspace = async (
  workspacePath: string,
  options: MergeCommandOptions
): Promise<{ output: string; report: string; changedNodes: number }> => {
  if (!options.confirmed) {
    throw new GeneratorError(
      'merge-confirmation-required',
      'Merge is a persistent operation and requires --yes.',
      '$'
    );
  }
  const brief = await loadBrief(workspacePath);
  const state = await loadState(workspacePath);
  const bundlePath = options.bundle
    ? resolve(options.bundle)
    : resolveBriefPath(workspacePath, brief.bundlePath);
  const current = normalizeUploadedDataModel(await readJson(bundlePath), brief.classification).model;
  validateDataModel(current);
  const targetId = brief.existingScriptId || brief.scriptId;
  const currentTarget = current.crimeScripts.find(({ id }) => id === targetId);
  if (brief.existingScriptId) {
    if (!currentTarget || sha256(JSON.stringify(currentTarget)) !== state.targetScriptHash) {
      throw new GeneratorError(
        'target-script-changed',
        'The target script changed after prepare. Re-prepare and reconcile the update before merging.',
        `crimeScripts.${targetId}`
      );
    }
  } else if (currentTarget) {
    throw new GeneratorError('script-id-collision', `Script ID "${targetId}" now exists in the bundle.`, '$.scriptId');
  }

  const standalone = normalizeUploadedDataModel(
    await readJson(resolve(options.standalone)),
    brief.classification
  ).model;
  validateStandaloneModel(standalone);
  const editedScript = standalone.crimeScripts[0];
  if (editedScript.id !== brief.scriptId) {
    throw new GeneratorError(
      'script-id-mismatch',
      `Standalone script ID "${editedScript.id}" does not match brief script ID "${brief.scriptId}".`,
      '$.crimeScripts[0].id'
    );
  }
  const priorClassification = currentTarget?.classification || brief.classification;
  if (
    editedScript.classification !== priorClassification &&
    !options.confirmClassificationChange
  ) {
    throw new GeneratorError(
      'classification-change-confirmation-required',
      `GUI review changed classification from ${priorClassification} to ${editedScript.classification}.`,
      '$.crimeScripts[0].classification'
    );
  }
  const bundleBase = basename(bundlePath, extname(bundlePath));
  const output = options.output
    ? resolve(options.output)
    : join(dirname(bundlePath), `${bundleBase}-${slugify(editedScript.label)}.json`);
  if (!options.overwrite && await pathExists(output)) {
    throw new GeneratorError('output-exists', `Refusing to overwrite existing file ${output}.`, output);
  }
  const lastBuildPath = join(workspacePath, workspaceFiles.lastBuild);
  if (!await pathExists(lastBuildPath)) {
    throw new GeneratorError('build-required', 'No last build exists for GUI edit comparison.', lastBuildPath);
  }
  const lastBuild = normalizeUploadedDataModel(await readJson(lastBuildPath), brief.classification).model;
  const changes = changedNodes(lastBuild.crimeScripts[0], editedScript);
  const deletions = deletedNodeIds(lastBuild.crimeScripts[0], editedScript);
  if (deletions.length && !options.confirmDeletions) {
    throw new GeneratorError(
      'deletion-confirmation-required',
      `GUI review deleted ${deletions.length} node(s); merge requires --confirm-deletions.`,
      '$.crimeScripts[0]',
      deletions
    );
  }
  const report = await readJson(join(workspacePath, workspaceFiles.buildReport)) as {
    keyToId?: Record<string, ID>;
    sourceKeyToLiteratureId?: Record<string, ID>;
  };
  const evidencePath = join(workspacePath, workspaceFiles.evidence);
  const currentEvidence = validateEvidence(await readVersionOneJson(
    evidencePath,
    ['sources', 'claims']
  ));
  const keyById = new Map(
    Object.entries(report.keyToId || {}).map(([key, id]) => [id, key])
  );
  const evidencedKeys = new Set(
    currentEvidence.claims
      .filter(({ sourceKeys }) => sourceKeys.length > 0)
      .map(({ nodeKey }) => nodeKey)
  );
  let answers: ReviewAnswer[] = [];
  if (changes.length) {
    if (options.reviewAnswers) {
      answers = validateReviewAnswersFile(
        await readJson(resolve(options.reviewAnswers)),
        options.reviewAnswers
      );
    } else if (options.reviewPrompt) {
      for (const change of changes) {
        const nodeKey = keyById.get(change.id) || '';
        const existingSourceKeys = currentEvidence.claims.find((claim) =>
          claim.nodeKey === nodeKey
        )?.sourceKeys || [];
        answers.push(await options.reviewPrompt({
          ...change,
          hasExistingEvidence: evidencedKeys.has(nodeKey),
          existingSourceKeys,
        }));
      }
    } else {
      throw new GeneratorError(
        'evidence-review-required',
        `${changes.length} edited node(s) require evidence review. Provide --review-answers or run interactively.`,
        '$'
      );
    }
    const answered = new Set(answers.map(({ nodeId }) => nodeId));
    const missing = changes.find(({ id }) => !answered.has(id));
    if (missing) {
      throw new GeneratorError(
        'incomplete-review-answers',
        `Evidence review answer is missing for edited node "${missing.label}" (${missing.id}).`,
        missing.id
      );
    }
    const changedIds = new Set(changes.map(({ id }) => id));
    const extra = answers.find(({ nodeId }) => !changedIds.has(nodeId));
    if (extra) {
      throw new GeneratorError(
        'unexpected-review-answer',
        `Evidence review includes unchanged or unknown node "${extra.nodeId}".`,
        extra.nodeId
      );
    }
  }

  const evidence = applyEvidenceReview(
    currentEvidence,
    report.keyToId || {},
    answers
  );
  const deletedKeys = new Set(
    Object.entries(report.keyToId || {})
      .filter(([, id]) => deletions.includes(id))
      .map(([key]) => key)
  );
  evidence.claims = evidence.claims.map((claim) =>
    deletedKeys.has(claim.nodeKey)
      ? { ...claim, state: 'orphaned' as const }
      : claim
  );
  validateEvidence(evidence);
  validateEvidenceProvenance(evidence, state);
  reconcileReviewedLiterature(editedScript, evidence, report);
  validateStandaloneModel(standalone);
  await writeJson(evidencePath, evidence, { overwrite: true });

  const withoutTarget: DataModel = {
    ...current,
    crimeScripts: current.crimeScripts.filter(({ id }) => id !== targetId),
  };
  const merged = importStandaloneScript(withoutTarget, standalone);
  merged.previewMode = false;
  merged.lastUpdate = Date.now();
  await writeJson(output, merged, { overwrite: options.overwrite });
  const reportPath = join(workspacePath, workspaceFiles.mergeReport);
  await writeJson(reportPath, {
    schemaVersion: 1,
    mergedAt: new Date(merged.lastUpdate).toISOString(),
    output: relative(workspacePath, output),
    scriptId: editedScript.id,
    mode: currentTarget ? 'update' : 'new',
    changedNodeIds: changes.map(({ id }) => id),
    deletedNodeIds: deletions,
    evidenceReview: answers,
  }, { overwrite: true });
  return { output, report: reportPath, changedNodes: changes.length };
};

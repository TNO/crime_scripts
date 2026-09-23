import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { normalizeUploadedDataModel } from '@crime-script/core/model-normalization';
import type {
  DataModel,
  Hierarchical,
  ScriptClassification,
} from '@crime-script/core/data-model';
import { GeneratorError } from './errors.ts';
import {
  assertRegularFile,
  pathExists,
  readJson,
  readVersionOneJson,
  readVersionOneYaml,
  writeJson,
  writeYaml,
} from './io.ts';
import { validateBrief } from './schema.ts';
import { sha256, slugify } from './text.ts';
import type {
  CandidateTaxonomies,
  EvidenceFile,
  GeneratorBrief,
  GeneratorContext,
  PreparedSource,
  ResearchLogFile,
  WorkspaceState,
} from './types.ts';
import { validateDataModel, validateEvidence } from './validation.ts';

export const workspaceFiles = {
  brief: 'brief.yaml',
  candidate: 'candidate.json',
  evidence: 'evidence.json',
  researchLog: 'research-log.json',
  state: 'state.json',
  normalizedBundle: 'prepared/normalized-bundle.json',
  context: 'prepared/context.json',
  materials: 'prepared/materials',
  lastBuild: 'artifacts/last-build.json',
  buildReport: 'reports/build-report.json',
  mergeReport: 'reports/merge-report.json',
} as const;

const emptyEvidence = (): EvidenceFile => ({
  schemaVersion: 1,
  sources: [],
  claims: [],
});

const emptyResearchLog = (): ResearchLogFile => ({
  schemaVersion: 1,
  entries: [],
  contradictionSearchCompleted: false,
  missingPerspectiveSearchCompleted: false,
});

const normalizeRelativePath = (path: string): string => path.split('\\').join('/');

export const defaultWorkspacePath = (bundlePath: string, subject: string): string => {
  const extension = extname(bundlePath);
  const bundleBase = basename(bundlePath, extension);
  return join(dirname(resolve(bundlePath)), `${bundleBase}-work`, slugify(subject));
};

export const initializeWorkspace = async (
  workspacePath: string,
  brief: GeneratorBrief,
  overwrite = false
): Promise<void> => {
  await assertRegularFile(resolve(workspacePath, brief.bundlePath));
  await writeYaml(join(workspacePath, workspaceFiles.brief), brief, { overwrite });
  if (!await pathExists(join(workspacePath, workspaceFiles.evidence))) {
    await writeJson(join(workspacePath, workspaceFiles.evidence), emptyEvidence());
  }
  if (!await pathExists(join(workspacePath, workspaceFiles.researchLog))) {
    await writeJson(join(workspacePath, workspaceFiles.researchLog), emptyResearchLog());
  }
};

export const loadBrief = async (workspacePath: string): Promise<GeneratorBrief> =>
  validateBrief(await readVersionOneYaml(
    join(workspacePath, workspaceFiles.brief),
    ['bundlePath', 'scriptId', 'subject']
  ));

export const resolveBriefPath = (workspacePath: string, path: string): string =>
  isAbsolute(path) ? path : resolve(workspacePath, path);

export const assertPreparedMaterialsCurrent = async (
  workspacePath: string,
  brief: GeneratorBrief,
  state: WorkspaceState
): Promise<void> => {
  const currentSources = brief.materialDirectory
    ? await collectMaterialFiles(
      resolveBriefPath(workspacePath, brief.materialDirectory),
      brief.recursiveMaterials === true
    )
    : [];
  const currentByPath = new Map<string, string>();
  for (const source of currentSources) {
    currentByPath.set(source.relativePath, sha256(await readFile(source.absolutePath)));
  }
  const preparedByPath = new Map(state.materials.map((item) => [item.sourcePath, item]));
  if (
    currentByPath.size !== preparedByPath.size ||
    [...currentByPath].some(([path, hash]) => preparedByPath.get(path)?.sourceHash !== hash)
  ) {
    throw new GeneratorError(
      'prepare-required',
      'Local source files changed after prepare; run prepare again.',
      brief.materialDirectory || '$.materialDirectory'
    );
  }
  for (const material of state.materials) {
    const markdownPath = resolve(workspacePath, material.markdownPath);
    let markdown: Buffer;
    try {
      markdown = await readFile(markdownPath);
    } catch {
      throw new GeneratorError(
        'prepare-required',
        `Prepared material is missing: ${material.markdownPath}`,
        material.markdownPath
      );
    }
    if (sha256(markdown) !== material.markdownHash) {
      throw new GeneratorError(
        'prepare-required',
        `Prepared material changed after prepare: ${material.markdownPath}`,
        material.markdownPath
      );
    }
  }
};

const taxonomyContext = (model: DataModel): CandidateTaxonomies => {
  const convert = (items: Array<Hierarchical & { id: string; label: string; description?: string }>) =>
    items.map((item) => ({
      key: item.id,
      id: item.id,
      label: item.label,
      description: item.description,
      synonyms: item.synonyms,
      parentKeys: item.parents,
    }));
  return {
    cast: convert(model.cast),
    attributes: convert(model.attributes),
    products: convert(model.products),
    transports: convert(model.transports),
    locations: convert(model.locations),
    geoLocations: convert(model.geoLocations),
    partners: convert(model.partners),
  };
};

const collectMaterialFiles = async (
  directory: string,
  recursive: boolean,
  root = directory
): Promise<Array<{ absolutePath: string; relativePath: string }>> => {
  const result: Array<{ absolutePath: string; relativePath: string }> = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name.startsWith('~$') || entry.isSymbolicLink()) continue;
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (recursive) result.push(...await collectMaterialFiles(absolutePath, recursive, root));
      continue;
    }
    if (!entry.isFile()) continue;
    const extension = extname(entry.name).toLowerCase();
    if (!['.md', '.txt', '.docx', '.pdf', '.xlsx', '.csv'].includes(extension)) continue;
    result.push({
      absolutePath,
      relativePath: normalizeRelativePath(relative(root, absolutePath)),
    });
  }
  return result.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
};

const doclingVersion = (): string | undefined => {
  const result = spawnSync('docling', ['--version'], { encoding: 'utf8' });
  if (result.status !== 0) return undefined;
  return (result.stdout || result.stderr).trim();
};

const convertMaterial = async (
  source: { absolutePath: string; relativePath: string },
  version: string | undefined
): Promise<{ markdown: string; converter: 'direct' | 'docling'; converterVersion?: string }> => {
  const extension = extname(source.absolutePath).toLowerCase();
  if (['.md', '.txt', '.csv'].includes(extension)) {
    return { markdown: await readFile(source.absolutePath, 'utf8'), converter: 'direct' };
  }
  if (!version) {
    const fallback = extension === '.xlsx'
      ? 'Install Docling or export the workbook to CSV.'
      : 'Install Docling, or convert DOCX/text-native PDF locally at https://erikvullings.github.io/word-convert/.';
    throw new GeneratorError(
      'docling-unavailable',
      `Docling is required to convert ${source.relativePath}. ${fallback}`,
      source.relativePath
    );
  }

  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'crime-script-docling-'));
  try {
    const result = spawnSync(
      'docling',
      ['convert', '--to', 'md', '--output', temporaryDirectory, source.absolutePath],
      { encoding: 'utf8' }
    );
    if (result.status !== 0) {
      throw new GeneratorError(
        'conversion-failed',
        `Docling could not convert ${source.relativePath}: ${(result.stderr || result.stdout).trim()}`,
        source.relativePath
      );
    }
    const converted = (await readdir(temporaryDirectory))
      .filter((name) => extname(name).toLowerCase() === '.md')
      .sort();
    if (converted.length !== 1) {
      throw new GeneratorError(
        'conversion-failed',
        `Docling produced ${converted.length} Markdown files for ${source.relativePath}; expected one.`,
        source.relativePath
      );
    }
    return {
      markdown: await readFile(join(temporaryDirectory, converted[0]), 'utf8'),
      converter: 'docling',
      converterVersion: version,
    };
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
};

const invalidateChangedEvidence = (
  evidence: EvidenceFile,
  previous: WorkspaceState | undefined,
  materials: PreparedSource[]
): EvidenceFile => {
  if (!previous) return evidence;
  const previousHashes = new Map(previous.materials.map((item) => [item.sourcePath, item.sourceHash]));
  const currentHashes = new Map(materials.map((item) => [item.sourcePath, item.sourceHash]));
  const changed = new Set<string>();
  previousHashes.forEach((hash, path) => {
    if (currentHashes.get(path) !== hash) changed.add(path);
  });
  currentHashes.forEach((hash, path) => {
    if (previousHashes.get(path) !== hash) changed.add(path);
  });
  if (!changed.size) return evidence;

  return {
    ...evidence,
    sources: evidence.sources.map((source) => {
      if (source.kind !== 'local' || !source.filename) return source;
      const matchingPath = [...changed].find((path) =>
        path === source.filename || basename(path) === source.filename
      );
      if (!matchingPath) return source;
      return {
        ...source,
        state: currentHashes.has(matchingPath) ? 'needs-review' : 'orphaned',
      };
    }),
  };
};

export type PrepareResult = {
  state: WorkspaceState;
  context: GeneratorContext;
  warnings: string[];
};

export const prepareWorkspace = async (
  workspacePath: string,
  options: { fresh?: boolean } = {}
): Promise<PrepareResult> => {
  const brief = await loadBrief(workspacePath);
  const bundlePath = resolveBriefPath(workspacePath, brief.bundlePath);
  await assertRegularFile(bundlePath);
  const bundle = normalizeUploadedDataModel(await readJson(bundlePath), brief.classification).model;
  validateDataModel(bundle);
  const existing = bundle.crimeScripts.find(({ id }) => id === (brief.existingScriptId || brief.scriptId));
  if (brief.existingScriptId && !existing) {
    throw new GeneratorError(
      'missing-target-script',
      `Bundle does not contain existing script "${brief.existingScriptId}".`,
      '$.existingScriptId'
    );
  }
  if (!brief.existingScriptId && bundle.crimeScripts.some(({ id }) => id === brief.scriptId)) {
    throw new GeneratorError(
      'script-id-collision',
      `Script ID "${brief.scriptId}" already exists; set existingScriptId to update it.`,
      '$.scriptId'
    );
  }

  const previousPath = join(workspacePath, workspaceFiles.state);
  const previous = await pathExists(previousPath)
    ? await readVersionOneJson(
      previousPath,
      ['bundleHash', 'briefHash', 'normalizedBundlePath']
    ) as WorkspaceState
    : undefined;
  const reusablePrevious = options.fresh ? undefined : previous;
  const outputDirectory = join(workspacePath, workspaceFiles.materials);
  const preparedMaterials: PreparedSource[] = [];
  if (brief.materialDirectory) {
    const materialDirectory = resolveBriefPath(workspacePath, brief.materialDirectory);
    const materialStat = await stat(materialDirectory).catch(() => undefined);
    if (!materialStat?.isDirectory()) {
      throw new GeneratorError(
        'missing-material-directory',
        `Material directory does not exist: ${brief.materialDirectory}`,
        '$.materialDirectory'
      );
    }
    const sources = await collectMaterialFiles(materialDirectory, brief.recursiveMaterials === true);
    const version = sources.some(({ absolutePath }) =>
      ['.docx', '.pdf', '.xlsx'].includes(extname(absolutePath).toLowerCase())
    ) ? doclingVersion() : undefined;
    for (const source of sources) {
      const sourceContent = await readFile(source.absolutePath);
      const sourceHash = sha256(sourceContent);
      const outputName = `${slugify(source.relativePath.replace(extname(source.relativePath), ''))}-${sourceHash.slice(0, 8)}.md`;
      const outputPath = join(outputDirectory, outputName);
      const unchanged = reusablePrevious?.materials.find((item) =>
        item.sourcePath === source.relativePath && item.sourceHash === sourceHash && item.markdownPath ===
          normalizeRelativePath(relative(workspacePath, outputPath))
      );
      if (unchanged && await pathExists(outputPath)) {
        const currentMarkdownHash = sha256(await readFile(outputPath));
        if (currentMarkdownHash === unchanged.markdownHash) {
          preparedMaterials.push(unchanged);
          continue;
        }
      }
      const converted = await convertMaterial(source, version);
      await writeJson(`${outputPath}.metadata.json`, {
        sourcePath: source.relativePath,
        sourceHash,
        converter: converted.converter,
        converterVersion: converted.converterVersion,
      }, { overwrite: true });
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, converted.markdown, 'utf8');
      preparedMaterials.push({
        sourcePath: source.relativePath,
        markdownPath: normalizeRelativePath(relative(workspacePath, outputPath)),
        sourceHash,
        markdownHash: sha256(converted.markdown),
        converter: converted.converter,
        converterVersion: converted.converterVersion,
      });
    }
  }
  if (previous) {
    const currentMarkdownPaths = new Set(preparedMaterials.map(({ markdownPath }) => markdownPath));
    const materialRoot = `${resolve(workspacePath, workspaceFiles.materials)}${sep}`;
    for (const oldMaterial of previous.materials) {
      if (currentMarkdownPaths.has(oldMaterial.markdownPath)) continue;
      const oldPath = resolve(workspacePath, oldMaterial.markdownPath);
      if (!oldPath.startsWith(materialRoot)) {
        throw new GeneratorError(
          'invalid-state',
          `Prepared material path escapes the workspace: ${oldMaterial.markdownPath}`,
          workspaceFiles.state
        );
      }
      await rm(oldPath, { force: true });
      await rm(`${oldPath}.metadata.json`, { force: true });
    }
  }

  const evidencePath = join(workspacePath, workspaceFiles.evidence);
  const evidence = await pathExists(evidencePath)
    ? validateEvidence(await readVersionOneJson(evidencePath, ['sources', 'claims']))
    : emptyEvidence();
  const updatedEvidence = invalidateChangedEvidence(evidence, previous, preparedMaterials);
  await writeJson(evidencePath, updatedEvidence, { overwrite: true });

  const context: GeneratorContext = {
    schemaVersion: 1,
    brief,
    taxonomies: taxonomyContext(bundle),
    existingScript: existing,
    sourceSummary: {
      scriptCount: bundle.crimeScripts.length,
      classificationCounts: {
        public: bundle.crimeScripts.filter(({ classification }) => classification === 'public').length,
        restricted: bundle.crimeScripts.filter(({ classification }) => classification === 'restricted').length,
      } satisfies Record<ScriptClassification, number>,
    },
  };
  const normalizedBundlePath = join(workspacePath, workspaceFiles.normalizedBundle);
  const contextPath = join(workspacePath, workspaceFiles.context);
  await writeJson(normalizedBundlePath, bundle, { overwrite: true });
  await writeJson(contextPath, context, { overwrite: true });
  const state: WorkspaceState = {
    schemaVersion: 1,
    bundleHash: sha256(JSON.stringify(bundle)),
    targetScriptHash: existing ? sha256(JSON.stringify(existing)) : undefined,
    briefHash: sha256(JSON.stringify(brief)),
    preparedAt: new Date().toISOString(),
    normalizedBundlePath: workspaceFiles.normalizedBundle,
    contextPath: workspaceFiles.context,
    materials: preparedMaterials,
    evidenceInputHashes: Object.fromEntries(preparedMaterials.map((item) => [item.sourcePath, item.sourceHash])),
  };
  await writeJson(previousPath, state, { overwrite: true });
  if (!await pathExists(join(workspacePath, workspaceFiles.researchLog))) {
    await writeJson(join(workspacePath, workspaceFiles.researchLog), emptyResearchLog());
  }

  return {
    state,
    context,
    warnings: brief.sourceSensitivity === 'restricted' && isGitWorktree(workspacePath)
      ? ['Restricted source material is present. Do not commit or publish this workspace.']
      : [],
  };
};

export const isGitWorktree = (path: string): boolean => {
  try {
    execFileSync('git', ['-C', path, 'rev-parse', '--is-inside-work-tree'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

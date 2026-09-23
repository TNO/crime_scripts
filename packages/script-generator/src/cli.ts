#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { BUILT_IN_ICONS, isBuiltInIconKey } from '@crime-script/core/icons';
import { normalizeUploadedDataModel } from '@crime-script/core/model-normalization';
import type { ContentLanguage, ScriptClassification } from '@crime-script/core/data-model';
import packageManifest from '../package.json' with { type: 'json' };
import { exitCodeForErrorCode, GeneratorError } from './errors.ts';
import { readJson } from './io.ts';
import {
  buildWorkspace,
  getWorkspaceStatus,
  mergeWorkspace,
  type ReviewAnswer,
} from './operations.ts';
import type {
  DetailLevel,
  GeneratorBrief,
  SourceSensitivity,
} from './types.ts';
import {
  defaultWorkspacePath,
  initializeWorkspace,
  prepareWorkspace,
} from './workspace.ts';

const VERSION = packageManifest.version;
const HELP = `crime-script-generator ${VERSION}

Usage:
  crime-script-generator init --bundle FILE [brief options]
  crime-script-generator prepare --workspace DIRECTORY
  crime-script-generator status --workspace DIRECTORY [--json]
  crime-script-generator build --workspace DIRECTORY [--output FILE]
  crime-script-generator merge --workspace DIRECTORY --standalone FILE [--bundle CURRENT] --yes
  crime-script-generator icons [--json]

Commands never modify the input bundle. Use --json for stable machine-readable output.
`;

type Parsed = ReturnType<typeof parseArgs>;

const parse = (args: string[]): Parsed => parseArgs({
  args,
  allowPositionals: true,
  strict: true,
  options: {
    bundle: { type: 'string' },
    workspace: { type: 'string' },
    'script-id': { type: 'string' },
    'existing-script-id': { type: 'string' },
    subject: { type: 'string' },
    purpose: { type: 'string' },
    geography: { type: 'string' },
    'content-language': { type: 'string' },
    classification: { type: 'string' },
    'source-sensitivity': { type: 'string' },
    detail: { type: 'string' },
    'script-icon': { type: 'string' },
    materials: { type: 'string' },
    recursive: { type: 'boolean' },
    focus: { type: 'string', multiple: true },
    exclude: { type: 'string', multiple: true },
    output: { type: 'string' },
    standalone: { type: 'string' },
    'review-answers': { type: 'string' },
    'non-interactive': { type: 'boolean' },
    overwrite: { type: 'boolean' },
    fresh: { type: 'boolean' },
    yes: { type: 'boolean', short: 'y' },
    json: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean' },
    'confirm-classification-change': { type: 'boolean' },
    'confirm-deletions': { type: 'boolean' },
  },
});

const choice = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  name: string
): T | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new GeneratorError('invalid-option', `${name} must be one of: ${allowed.join(', ')}.`, name);
  }
  return value as T;
};

const createPrompter = () => {
  const terminal = createInterface({ input, output });
  return {
    async required(question: string, current?: string, defaultValue?: string): Promise<string> {
      if (current?.trim()) return current.trim();
      const answer = (await terminal.question(`${question}${defaultValue ? ` [${defaultValue}]` : ''}: `)).trim();
      const result = answer || defaultValue;
      if (!result) throw new GeneratorError('missing-option', `${question} is required.`, question);
      return result;
    },
    async select<T extends string>(
      question: string,
      allowed: readonly T[],
      current?: T,
      defaultValue?: T
    ): Promise<T> {
      if (current) return current;
      const answer = await terminal.question(
        `${question} (${allowed.join('/')})${defaultValue ? ` [${defaultValue}]` : ''}: `
      );
      return choice(answer.trim() || defaultValue, allowed, question) as T;
    },
    async confirm(question: string): Promise<boolean> {
      const answer = (await terminal.question(`${question} (yes/no) [no]: `)).trim().toLowerCase();
      return answer === 'yes' || answer === 'y';
    },
    close(): void {
      terminal.close();
    },
  };
};

const machineResult = (command: string, success: boolean, data: unknown): void => {
  output.write(`${JSON.stringify({
    schemaVersion: 1,
    command,
    success,
    ...(success ? { data } : { error: data }),
  })}\n`);
};

const printResult = (json: boolean, command: string, data: unknown, human: string): void => {
  if (json) machineResult(command, true, data);
  else output.write(`${human}\n`);
};

const getString = (parsed: Parsed, name: string): string | undefined => {
  const value = parsed.values[name];
  return typeof value === 'string' ? value : undefined;
};

const commandInit = async (parsed: Parsed): Promise<void> => {
  const nonInteractive = parsed.values['non-interactive'] === true;
  const prompter = nonInteractive ? undefined : createPrompter();
  try {
    const requireValue = async (question: string, option: string, fallback?: string): Promise<string> => {
      const value = getString(parsed, option);
      if (value?.trim()) return value.trim();
      if (prompter) return prompter.required(question, undefined, fallback);
      if (fallback) return fallback;
      throw new GeneratorError('missing-option', `--${option} is required in non-interactive mode.`, option);
    };
    const bundlePath = resolve(await requireValue('Input bundle path', 'bundle'));
    const requestedClassification = choice(
      getString(parsed, 'classification'),
      ['public', 'restricted'] as const,
      '--classification'
    );
    const rawBundle = await readJson(bundlePath);
    const legacyDefault = requestedClassification ||
      (/(restricted|private|afgeschermd|beperkt)/i.test(bundlePath) ? 'restricted' : 'public');
    const inspectedBundle = normalizeUploadedDataModel(rawBundle, legacyDefault).model;
    const existingId = getString(parsed, 'existing-script-id');
    const inferred = existingId
      ? inspectedBundle.crimeScripts.find(({ id }) => id === existingId)
      : undefined;
    if (existingId && !inferred) {
      throw new GeneratorError(
        'missing-target-script',
        `Bundle does not contain existing script "${existingId}".`,
        'existing-script-id'
      );
    }
    const subject = await requireValue('Crime-script subject', 'subject', inferred?.label);
    const workspacePath = resolve(
      getString(parsed, 'workspace') || defaultWorkspacePath(bundlePath, subject)
    );
    const classification = prompter
      ? await prompter.select(
        'Script classification',
        ['public', 'restricted'] as const,
        requestedClassification,
        inferred?.classification
      )
      : requestedClassification || inferred?.classification;
    if (!classification) {
      throw new GeneratorError(
        'missing-option',
        '--classification is required in non-interactive mode.',
        'classification'
      );
    }
    const languageValue = choice(
      getString(parsed, 'content-language'),
      ['nl', 'en'] as const,
      '--content-language'
    );
    const contentLanguage = prompter
      ? await prompter.select(
        'Generated content language',
        ['nl', 'en'] as const,
        languageValue,
        inferred?.language || 'nl'
      )
      : languageValue || inferred?.language;
    if (!contentLanguage) {
      throw new GeneratorError(
        'missing-option',
        '--content-language is required in non-interactive mode.',
        'content-language'
      );
    }
    const sensitivityValue = choice(
      getString(parsed, 'source-sensitivity'),
      ['public', 'restricted'] as const,
      '--source-sensitivity'
    );
    const sourceSensitivity = prompter
      ? await prompter.select(
        'Source-material sensitivity',
        ['public', 'restricted'] as const,
        sensitivityValue,
        classification
      )
      : sensitivityValue;
    if (!sourceSensitivity) {
      throw new GeneratorError(
        'missing-option',
        '--source-sensitivity is required in non-interactive mode.',
        'source-sensitivity'
      );
    }
    const detailValue = choice(
      getString(parsed, 'detail'),
      ['orienting', 'practical', 'operational'] as const,
      '--detail'
    );
    const detail = prompter
      ? await prompter.select(
        'Detail level',
        ['orienting', 'practical', 'operational'] as const,
        detailValue,
        'practical'
      )
      : detailValue;
    if (!detail) {
      throw new GeneratorError('missing-option', '--detail is required in non-interactive mode.', 'detail');
    }
    const proposedId = existingId || `generated:${contentLanguage}:script:${slugForId(subject)}`;
    const suppliedScriptId = getString(parsed, 'script-id');
    if (nonInteractive && !suppliedScriptId && !existingId) {
      throw new GeneratorError(
        'missing-option',
        `--script-id is required in non-interactive mode. Proposed value: ${proposedId}`,
        'script-id'
      );
    }
    const scriptId = await requireValue('Stable script ID', 'script-id', proposedId);
    if (existingId && scriptId !== existingId) {
      throw new GeneratorError(
        'script-id-mismatch',
        'Update mode requires scriptId and existingScriptId to be identical.',
        'script-id'
      );
    }
    if (!existingId && inspectedBundle.crimeScripts.some(({ id }) => id === scriptId)) {
      throw new GeneratorError(
        'script-id-collision',
        `Script ID "${scriptId}" already exists; use --existing-script-id to update it.`,
        'script-id'
      );
    }
    const scriptIcon = await requireValue(
      'Built-in script icon key',
      'script-icon',
      typeof inferred?.icon === 'string' && isBuiltInIconKey(inferred.icon) ? inferred.icon : undefined
    );
    if (!isBuiltInIconKey(scriptIcon)) {
      throw new GeneratorError(
        'unknown-script-icon',
        `"${scriptIcon}" is not a built-in script icon key.`,
        'script-icon'
      );
    }
    const purpose = await requireValue('Purpose and audience', 'purpose');
    const geography = await requireValue('Geographic scope', 'geography');
    const materialPath = getString(parsed, 'materials');
    const brief: GeneratorBrief = {
      schemaVersion: 1,
      bundlePath: normalizedRelative(workspacePath, bundlePath),
      scriptId,
      subject,
      purpose,
      geography,
      contentLanguage: contentLanguage as ContentLanguage,
      classification: classification as ScriptClassification,
      sourceSensitivity: sourceSensitivity as SourceSensitivity,
      detail: detail as DetailLevel,
      scriptIcon,
      focus: parsed.values.focus as string[] | undefined,
      exclusions: parsed.values.exclude as string[] | undefined,
      materialDirectory: materialPath
        ? normalizedRelative(workspacePath, resolve(materialPath))
        : undefined,
      recursiveMaterials: parsed.values.recursive === true,
      existingScriptId: existingId,
    };
    await initializeWorkspace(workspacePath, brief, parsed.values.overwrite === true);
    printResult(
      parsed.values.json === true,
      'init',
      { workspace: workspacePath, brief: 'brief.yaml' },
      `Initialized ${workspacePath}\nNext: crime-script-generator prepare --workspace "${workspacePath}"`
    );
  } finally {
    prompter?.close();
  }
};

const slugForId = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'script';

const normalizedRelative = (from: string, to: string): string => {
  const result = relative(from, to).split('\\').join('/');
  return result || '.';
};

const requireWorkspace = (parsed: Parsed): string => {
  const workspace = getString(parsed, 'workspace');
  if (!workspace) throw new GeneratorError('missing-option', '--workspace is required.', 'workspace');
  return resolve(workspace);
};

const commandPrepare = async (parsed: Parsed): Promise<void> => {
  const workspace = requireWorkspace(parsed);
  const fresh = parsed.values.fresh === true;
  const nonInteractive = parsed.values['non-interactive'] === true;
  const prompter = fresh && !nonInteractive ? createPrompter() : undefined;
  try {
    if (
      fresh &&
      parsed.values.yes !== true &&
      !(prompter && await prompter.confirm('Rebuild all prepared derived artifacts from source?'))
    ) {
      throw new GeneratorError(
        'fresh-confirmation-required',
        'prepare --fresh requires explicit confirmation with --yes.',
        'fresh'
      );
    }
    const result = await prepareWorkspace(workspace, { fresh });
    printResult(
      parsed.values.json === true,
      'prepare',
      {
        preparedAt: result.state.preparedAt,
        materials: result.state.materials.length,
        warnings: result.warnings,
      },
      [
        `Prepared bundle context and ${result.state.materials.length} local material(s).`,
        ...result.warnings.map((warning) => `WARNING: ${warning}`),
        `Next: complete candidate.json, evidence.json, and research-log.json in ${workspace}`,
      ].join('\n')
    );
  } finally {
    prompter?.close();
  }
};

const commandStatus = async (parsed: Parsed): Promise<void> => {
  const result = await getWorkspaceStatus(requireWorkspace(parsed));
  printResult(
    parsed.values.json === true,
    'status',
    result,
    [
      `Status: ${result.ok ? 'ready' : 'blocked'}`,
      `Next action: ${result.nextAction}`,
      ...result.issues.map((issue) =>
        `${issue.severity.toUpperCase()} ${issue.code} ${issue.path}: ${issue.message}`
      ),
    ].join('\n')
  );
  if (!result.ok) process.exitCode = 3;
};

const commandBuild = async (parsed: Parsed): Promise<void> => {
  const result = await buildWorkspace(requireWorkspace(parsed), {
    output: getString(parsed, 'output'),
    overwrite: parsed.values.overwrite === true,
    confirmClassificationChange: parsed.values['confirm-classification-change'] === true,
    confirmDeletions: parsed.values['confirm-deletions'] === true,
  });
  printResult(
    parsed.values.json === true,
    'build',
    result,
    [
      `Built standalone script: ${result.output}`,
      'Review and edit the standalone JSON in the GUI before merge.',
    ].filter(Boolean).join('\n')
  );
};

const commandMerge = async (parsed: Parsed): Promise<void> => {
  const workspace = requireWorkspace(parsed);
  const standalone = getString(parsed, 'standalone');
  if (!standalone) {
    throw new GeneratorError('missing-option', '--standalone is required.', 'standalone');
  }
  const nonInteractive = parsed.values['non-interactive'] === true;
  const prompter = nonInteractive ? undefined : createPrompter();
  try {
    const confirmed = parsed.values.yes === true ||
      (prompter ? await prompter.confirm('Create a new merged bundle without changing the input bundle?') : false);
    const reviewPrompt = prompter
      ? async (node: {
        id: string;
        label: string;
        before: unknown;
        after: unknown;
        hasExistingEvidence: boolean;
        existingSourceKeys: string[];
      }): Promise<ReviewAnswer> => {
        const summarize = (value: unknown): string => {
          const item = value as { label?: unknown; description?: unknown } | undefined;
          return JSON.stringify({
            label: item?.label,
            description: item?.description,
          });
        };
        output.write(
          `\nChanged node: ${node.label} (${node.id})\n` +
          `Before: ${summarize(node.before)}\n` +
          `After:  ${summarize(node.after)}\n` +
          `Evidence: ${node.existingSourceKeys.length ? node.existingSourceKeys.join(', ') : 'none'}\n`
        );
        if (node.hasExistingEvidence) {
          const evidenceStillApplies = await prompter.confirm(
            `GUI-edited node "${node.label}" (${node.id}): does its existing evidence still apply?`
          );
          if (evidenceStillApplies) return { nodeId: node.id, evidenceStillApplies: true };
        }
        const sourceKeys = (await prompter.required(
          `${node.hasExistingEvidence ? 'Replacement' : 'New'} evidence source keys, comma-separated ` +
            '(enter "-" to continue unsubstantiated)',
          undefined,
          '-'
        ))
          .split(',')
          .map((value) => value.trim())
          .filter((value) => value && value !== '-');
        return { nodeId: node.id, evidenceStillApplies: false, sourceKeys };
      }
      : undefined;
    const result = await mergeWorkspace(workspace, {
      standalone,
      bundle: getString(parsed, 'bundle'),
      output: getString(parsed, 'output'),
      overwrite: parsed.values.overwrite === true,
      confirmed,
      confirmClassificationChange: parsed.values['confirm-classification-change'] === true,
      confirmDeletions: parsed.values['confirm-deletions'] === true,
      reviewAnswers: getString(parsed, 'review-answers'),
      reviewPrompt,
    });
    printResult(
      parsed.values.json === true,
      'merge',
      result,
      `Created merged bundle: ${result.output}\nEvidence reviewed for ${result.changedNodes} edited node(s).`
    );
  } finally {
    prompter?.close();
  }
};

const main = async (): Promise<void> => {
  let command = 'help';
  let parsed: Parsed | undefined;
  try {
    parsed = parse(process.argv.slice(2));
    command = parsed.positionals[0] || 'help';
    if (parsed.values.version) {
      output.write(`${VERSION}\n`);
      return;
    }
    if (parsed.values.help || command === 'help') {
      output.write(HELP);
      return;
    }
    if (parsed.positionals.length > 1) {
      throw new GeneratorError('unexpected-argument', 'Only one command may be supplied.', '$');
    }
    if (command === 'init') await commandInit(parsed);
    else if (command === 'prepare') await commandPrepare(parsed);
    else if (command === 'status') await commandStatus(parsed);
    else if (command === 'build') await commandBuild(parsed);
    else if (command === 'merge') await commandMerge(parsed);
    else if (command === 'icons') {
      printResult(
        parsed.values.json === true,
        'icons',
        { icons: BUILT_IN_ICONS },
        BUILT_IN_ICONS.map(({ key, label, category }) => `${key}\t${label}\t${category}`).join('\n')
      );
    }
    else throw new GeneratorError('unknown-command', `Unknown command "${command}".`, '$');
  } catch (error) {
    const normalized = error instanceof GeneratorError
      ? error
      : new GeneratorError(
        'unexpected-error',
        error instanceof Error ? error.message : String(error),
        '$'
      );
    const payload = {
      code: normalized.code,
      message: normalized.message,
      path: normalized.path,
      details: normalized.details,
    };
    if (parsed?.values.json === true) machineResult(command, false, payload);
    else process.stderr.write(`ERROR ${normalized.code}: ${normalized.message}\n`);
    process.exitCode = exitCodeForErrorCode(normalized.code);
  }
};

await main();

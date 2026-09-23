import { constants } from 'node:fs';
import {
  access,
  copyFile,
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import { GeneratorError } from './errors.ts';

export const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

export const readJson = async (path: string): Promise<unknown> => {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new GeneratorError(
      'invalid-json',
      `Could not read JSON file ${path}: ${error instanceof Error ? error.message : String(error)}`,
      path
    );
  }
};

export const readYaml = async (path: string): Promise<unknown> => {
  try {
    return parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new GeneratorError(
      'invalid-yaml',
      `Could not read YAML file ${path}: ${error instanceof Error ? error.message : String(error)}`,
      path
    );
  }
};

const migrateVersionOne = async (
  path: string,
  value: unknown,
  format: 'json' | 'yaml',
  requiredMarkers: string[]
): Promise<unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const root = value as Record<string, unknown>;
  if (
    root.schemaVersion !== undefined &&
    root.schemaVersion !== 0
  ) return value;
  if (!requiredMarkers.every((marker) => marker in root)) return value;
  const backupPath = `${path}.v0.bak`;
  try {
    await copyFile(path, backupPath, constants.COPYFILE_EXCL);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
  const migrated = { ...root, schemaVersion: 1 };
  if (format === 'json') await writeJson(path, migrated, { overwrite: true });
  else await writeYaml(path, migrated, { overwrite: true });
  return migrated;
};

export const readVersionOneJson = async (
  path: string,
  requiredMarkers: string[]
): Promise<unknown> =>
  migrateVersionOne(path, await readJson(path), 'json', requiredMarkers);

export const readVersionOneYaml = async (
  path: string,
  requiredMarkers: string[]
): Promise<unknown> =>
  migrateVersionOne(path, await readYaml(path), 'yaml', requiredMarkers);

const writeAtomically = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, content, 'utf8');
  await rename(temporary, path);
};

export const writeJson = async (
  path: string,
  value: unknown,
  options: { overwrite?: boolean } = {}
): Promise<void> => {
  if (!options.overwrite && await pathExists(path)) {
    throw new GeneratorError('output-exists', `Refusing to overwrite existing file ${path}.`, path);
  }
  await writeAtomically(path, `${JSON.stringify(value, null, 2)}\n`);
};

export const writeYaml = async (
  path: string,
  value: unknown,
  options: { overwrite?: boolean } = {}
): Promise<void> => {
  if (!options.overwrite && await pathExists(path)) {
    throw new GeneratorError('output-exists', `Refusing to overwrite existing file ${path}.`, path);
  }
  await writeAtomically(path, stringify(value, { lineWidth: 100 }));
};

export const assertRegularFile = async (path: string): Promise<void> => {
  try {
    const fileStat = await stat(path);
    if (!fileStat.isFile()) {
      throw new Error('not a regular file');
    }
  } catch (error) {
    throw new GeneratorError(
      'missing-file',
      `Expected a readable file at ${path}: ${error instanceof Error ? error.message : String(error)}`,
      path
    );
  }
};

export const resolveFrom = (baseDirectory: string, path: string): string =>
  resolve(baseDirectory, path);

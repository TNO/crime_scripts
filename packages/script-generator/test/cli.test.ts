import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import { exitCodeForErrorCode } from '../src/errors.ts';

const cli = resolve(import.meta.dirname, '../src/cli.ts');

const run = (args: string[]) =>
  spawnSync(process.execPath, ['--experimental-strip-types', cli, ...args], {
    encoding: 'utf8',
  });

test('CLI exposes stable JSON envelopes and confirmation exit codes', async () => {
  assert.equal(exitCodeForErrorCode('classification-change-confirmation-required'), 7);
  const root = await mkdtemp(join(tmpdir(), 'crime-script-cli-'));
  const bundle = join(root, 'bundle.json');
  const workspace = join(root, 'work');
  await writeFile(bundle, JSON.stringify({
    schemaVersion: 3,
    version: 1,
    lastUpdate: 1,
    crimeScripts: [],
    cast: [],
    attributes: [],
    locations: [],
    geoLocations: [],
    products: [],
    transports: [],
    partners: [],
  }));
  const initialized = run([
    'init',
    '--bundle', bundle,
    '--workspace', workspace,
    '--script-id', 'golden:cli',
    '--subject', 'CLI fixture',
    '--purpose', 'Offline CLI contract test',
    '--geography', 'Fictional jurisdiction',
    '--content-language', 'en',
    '--classification', 'public',
    '--source-sensitivity', 'public',
    '--detail', 'orienting',
    '--script-icon', 'builtin:document-check',
    '--non-interactive',
    '--json',
  ]);
  assert.equal(initialized.status, 0, initialized.stderr);
  const envelope = JSON.parse(initialized.stdout);
  assert.equal(envelope.success, true);
  assert.equal(envelope.command, 'init');
  assert.equal(parse(await readFile(join(workspace, 'brief.yaml'), 'utf8')).scriptId, 'golden:cli');

  const unconfirmed = run([
    'prepare',
    '--workspace', workspace,
    '--fresh',
    '--non-interactive',
    '--json',
  ]);
  assert.equal(unconfirmed.status, 7);
  assert.equal(JSON.parse(unconfirmed.stdout).error.code, 'fresh-confirmation-required');

  const prepared = run(['prepare', '--workspace', workspace, '--json']);
  assert.equal(prepared.status, 0, prepared.stderr);
  const status = run(['status', '--workspace', workspace, '--json']);
  assert.equal(status.status, 3);
  assert.equal(JSON.parse(status.stdout).data.nextAction, 'write-candidate');
});

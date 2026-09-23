import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { readVersionOneJson } from '../src/io.ts';
import { validateEvidence } from '../src/validation.ts';

test('known version-zero workspace files migrate with a non-destructive backup', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'crime-script-migration-'));
  const path = join(directory, 'evidence.json');
  const legacy = { sources: [], claims: [] };
  await writeFile(path, `${JSON.stringify(legacy)}\n`);

  const migrated = await readVersionOneJson(path, ['sources', 'claims']) as {
    schemaVersion: number;
  };
  assert.equal(migrated.schemaVersion, 1);
  assert.deepEqual(JSON.parse(await readFile(`${path}.v0.bak`, 'utf8')), legacy);
  assert.equal(JSON.parse(await readFile(path, 'utf8')).schemaVersion, 1);
});

test('unknown newer workspace schemas are rejected without rewriting them', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'crime-script-migration-'));
  const path = join(directory, 'evidence.json');
  const newer = { schemaVersion: 2, sources: [], claims: [] };
  await writeFile(path, `${JSON.stringify(newer)}\n`);

  const loaded = await readVersionOneJson(path, ['sources', 'claims']);
  assert.throws(() => validateEvidence(loaded), /schemaVersion must be 1/);
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), newer);
  await assert.rejects(readFile(`${path}.v0.bak`, 'utf8'));
});

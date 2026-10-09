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
  const material = join(root, 'guidance.md');
  const workspace = join(root, 'work');
  await writeFile(material, 'Local guidance for a defensive script.\n');
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
    '--materials', material,
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
  assert.equal(JSON.parse(prepared.stdout).data.materials, 1);
  const state = JSON.parse(await readFile(join(workspace, 'state.json'), 'utf8'));
  assert.equal(state.materials[0].sourcePath, 'guidance.md');
  const status = run(['status', '--workspace', workspace, '--json']);
  assert.equal(status.status, 3);
  assert.equal(JSON.parse(status.stdout).data.nextAction, 'write-candidate');
});

test('CLI assembles a draft scene, activities, sources, and scene claims in small chunks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'crime-script-chunks-'));
  const workspace = join(root, 'work');
  const bundle = join(root, 'bundle.json');
  const candidatePath = join(workspace, 'candidate.json');
  const evidencePath = join(workspace, 'evidence.json');
  const header = join(root, 'header.json');
  const sceneFile = join(root, 'scene.json');
  const secondSceneFile = join(root, 'second-scene.json');
  const activityFile = join(root, 'activity.json');
  const sourceFile = join(root, 'source.json');
  const roleFile = join(root, 'role.json');
  const claimsFile = join(root, 'claims.json');
  const secondClaimsFile = join(root, 'second-claims.json');
  const draft = {
    schemaVersion: 1,
    script: { label: 'Documentcontrole', description: 'Fictief defensief proces.', stages: [] },
    taxonomies: {
      cast: [], attributes: [], products: [], transports: [], locations: [], geoLocations: [], partners: [],
    },
    safetyReview: {
      containsStepByStepInstructions: false,
      containsExploitableParameters: false,
      containsEvasionTactics: false,
      notes: 'Reviewed for defensive use.',
    },
  };
  const scene = {
    key: 'intake',
    label: 'Document beoordelen',
    description: 'De organisatie beoordeelt het document.',
    variants: [{
      key: 'routine',
      label: 'Onafhankelijke controle',
      activities: [{
        key: 'record',
        event: 'Een medewerker registreert de ontvangst',
        observableTraces: ['ontvangstregistratie'],
        castKeys: ['employee'],
      }],
    }],
  };
  const activity = {
    key: 'compare',
    event: 'Een medewerker vergelijkt het document',
    observableTraces: ['vastgelegd vergelijkingsresultaat'],
  };
  const source = {
    key: 'guidance',
    title: 'Guidance',
    kind: 'web',
    state: 'valid',
    url: 'https://example.org/guidance',
    accessedAt: '2026-10-09',
    contentHash: 'a'.repeat(64),
    reliability: 'Primary source.',
    passages: [{ text: 'Check the document independently.' }],
  };
  await writeFile(bundle, JSON.stringify({
    schemaVersion: 3, version: 1, lastUpdate: 1, crimeScripts: [],
    cast: [], attributes: [], locations: [], geoLocations: [], products: [], transports: [], partners: [],
  }));
  const initialized = run([
    'init', '--bundle', bundle, '--workspace', workspace, '--script-id', 'generated:en:script:document-check',
    '--subject', 'Document check', '--purpose', 'Defensive training', '--geography', 'Fictional jurisdiction',
    '--content-language', 'en', '--classification', 'public', '--source-sensitivity', 'public',
    '--detail', 'orienting', '--script-icon', 'builtin:document-check', '--non-interactive',
  ]);
  assert.equal(initialized.status, 0, initialized.stderr);
  assert.equal(run(['prepare', '--workspace', workspace]).status, 0);
  await writeFile(header, JSON.stringify(draft));
  await writeFile(sceneFile, JSON.stringify(scene));
  await writeFile(secondSceneFile, JSON.stringify({
    key: 'verification',
    label: 'Resultaat verifiëren',
    description: 'De organisatie legt een onafhankelijke verificatie vast.',
    variants: [{
      key: 'second-review',
      label: 'Controle door een tweede medewerker',
      activities: [{
        key: 'confirm',
        event: 'Een medewerker bevestigt het resultaat',
        observableTraces: ['vastgelegde verificatie'],
      }],
    }],
  }));
  await writeFile(activityFile, JSON.stringify(activity));
  await writeFile(sourceFile, JSON.stringify(source));
  await writeFile(roleFile, JSON.stringify({ key: 'employee', label: 'Medewerker' }));
  await writeFile(claimsFile, JSON.stringify([
    { nodeKey: 'intake', sourceKeys: ['guidance'] },
    { nodeKey: 'record', sourceKeys: ['guidance'] },
    { nodeKey: 'compare', sourceKeys: ['guidance'] },
  ]));
  await writeFile(secondClaimsFile, JSON.stringify([
    { nodeKey: 'verification', sourceKeys: ['guidance'] },
    { nodeKey: 'confirm', sourceKeys: ['guidance'] },
  ]));
  const invoke = (command: string, file: string, extra: string[] = []) =>
    run([command, '--workspace', workspace, '--file', file, ...extra, '--json']);

  assert.equal(invoke('init-candidate', header).status, 0);
  await writeFile(evidencePath, JSON.stringify({ schemaVersion: 1, sources: [], claims: [] }));
  assert.equal(invoke('add-taxonomy', roleFile, ['--taxonomy', 'cast']).status, 0);
  assert.equal(invoke('add-taxonomy', roleFile, ['--taxonomy', 'cast']).status, 3);
  assert.equal(invoke('add-scene', sceneFile).status, 0);
  assert.equal(invoke('add-scene', secondSceneFile).status, 0);
  assert.equal(invoke('add-activity', activityFile, ['--scene-key', 'intake', '--variant-key', 'routine']).status, 0);
  assert.equal(invoke('add-source', sourceFile).status, 0);
  assert.equal(invoke('add-scene-claims', claimsFile, ['--scene-key', 'intake']).status, 0);
  assert.equal(invoke('add-scene-claims', secondClaimsFile, ['--scene-key', 'verification']).status, 0);
  const assembled = JSON.parse(await readFile(candidatePath, 'utf8'));
  assert.deepEqual(assembled.script.stages.map(({ key }: { key: string }) => key), ['intake', 'verification']);
  assert.deepEqual(assembled.taxonomies.cast.map(({ key }: { key: string }) => key), ['employee']);
  assert.deepEqual(assembled.script.stages[0].variants[0].activities.map(({ key }: { key: string }) => key),
    ['record', 'compare']);
  assert.deepEqual(JSON.parse(await readFile(evidencePath, 'utf8')).claims.map(({ nodeKey }: { nodeKey: string }) => nodeKey),
    ['intake', 'record', 'compare', 'verification', 'confirm']);

  const before = await readFile(candidatePath, 'utf8');
  const duplicate = invoke('add-scene', sceneFile);
  assert.equal(duplicate.status, 3);
  assert.equal(JSON.parse(duplicate.stdout).error.code, 'duplicate-key');
  assert.equal(await readFile(candidatePath, 'utf8'), before);
  assert.equal(invoke('add-activity', activityFile, ['--scene-key', 'intake', '--variant-key', 'routine']).status, 3);
  assert.equal(await readFile(candidatePath, 'utf8'), before);
  const unknown = invoke('add-activity', activityFile, ['--scene-key', 'missing', '--variant-key', 'routine']);
  assert.equal(unknown.status, 3);
  assert.equal(await readFile(candidatePath, 'utf8'), before);
  const badClaims = join(root, 'bad-claims.json');
  await writeFile(badClaims, JSON.stringify([{ nodeKey: 'other', sourceKeys: ['guidance'] }]));
  assert.equal(invoke('add-scene-claims', badClaims, ['--scene-key', 'intake']).status, 3);
  assert.equal(JSON.parse(await readFile(evidencePath, 'utf8')).claims.length, 5);
  assert.equal(invoke('add-source', sourceFile).status, 3);
  assert.equal(invoke('add-source', sourceFile, ['--replace']).status, 0);
  assert.equal(invoke('add-scene-claims', claimsFile, ['--scene-key', 'intake', '--replace']).status, 0);
  assert.equal(JSON.parse(await readFile(evidencePath, 'utf8')).claims.length, 5);
  const revision = join(root, 'revision.json');
  await writeFile(revision, JSON.stringify({
    ...assembled.script.stages[0],
    description: 'Bijgewerkte beschrijving van de scène.',
  }));
  assert.equal(invoke('add-scene', revision, ['--replace']).status, 0);
  assert.deepEqual(JSON.parse(await readFile(candidatePath, 'utf8')).script.stages.map(({ key }: { key: string }) => key),
    ['intake', 'verification']);
  const duplicateNode = join(root, 'duplicate-node.json');
  await writeFile(duplicateNode, JSON.stringify({ ...scene, key: 'confirm' }));
  assert.equal(invoke('add-scene', duplicateNode).status, 3);
  await writeFile(join(workspace, 'research-log.json'), JSON.stringify({
    schemaVersion: 1, entries: [{
      url: 'https://example.org/guidance',
      visitedAt: '2026-10-09',
      decision: 'accepted',
      reason: 'Primary guidance for this fictional test.',
    }],
    contradictionSearchCompleted: true,
    missingPerspectiveSearchCompleted: true,
  }));
  const status = run(['status', '--workspace', workspace, '--json']);
  assert.equal(status.status, 0, status.stdout);
  assert.equal(JSON.parse(status.stdout).data.nextAction, 'build');
  const output = join(root, 'standalone.json');
  const built = run(['build', '--workspace', workspace, '--output', output, '--json']);
  assert.equal(built.status, 0, built.stdout);
  assert.deepEqual(
    JSON.parse(await readFile(output, 'utf8')).crimeScripts[0].stages[0].variants[0].activities
      .map(({ label }: { label: string }) => label),
    ['Een medewerker registreert de ontvangst', 'Een medewerker vergelijkt het document']
  );
  assert.equal(JSON.parse(await readFile(output, 'utf8')).crimeScripts[0].stages.length, 2);
});

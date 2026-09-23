import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildWorkspace, getWorkspaceStatus, mergeWorkspace } from '../src/operations.ts';
import { initializeWorkspace, prepareWorkspace, workspaceFiles } from '../src/workspace.ts';
import type { CandidateFile, EvidenceFile, GeneratorBrief, ResearchLogFile } from '../src/types.ts';

const candidate: CandidateFile = {
  schemaVersion: 1,
  script: {
    label: 'Fictieve documentcontrole',
    description: 'Een defensief procesmodel voor het controleren van een fictief document.',
    stages: [{
      key: 'intake',
      label: 'Intake beoordelen',
      description: 'De organisatie beoordeelt of een ontvangen document onafhankelijk moet worden gecontroleerd.',
      variants: [{
        key: 'main',
        label: 'Reguliere beoordeling',
        activities: [{
          key: 'compare',
          event: 'Een medewerker vergelijkt het document met een gezaghebbende registratie',
          observableTraces: ['de ontvangstregistratie en het vastgelegde vergelijkingsresultaat'],
          decisionPoint: 'bepalen of een tweede controle nodig is',
          castKeys: ['employee'],
        }],
      }],
    }],
  },
  taxonomies: {
    cast: [{ key: 'employee', label: 'Medewerker' }],
    attributes: [],
    products: [],
    transports: [],
    locations: [],
    geoLocations: [],
    partners: [],
  },
  safetyReview: {
    containsStepByStepInstructions: false,
    containsExploitableParameters: false,
    containsEvasionTactics: false,
    notes: 'Defensive fictional example.',
  },
};

test('prepare, build, GUI review, and explicit merge form a non-destructive workflow', async () => {
  const root = await mkdtemp(join(tmpdir(), 'crime-script-generator-'));
  const bundlePath = join(root, 'bundle.json');
  const materialsPath = join(root, 'materials');
  const workspacePath = join(root, 'bundle-work', 'fictieve-documentcontrole');
  await mkdir(materialsPath);
  await writeFile(join(materialsPath, 'official-guidance.md'), 'Independent verification supports a defensible decision.\n');
  await writeFile(bundlePath, JSON.stringify({
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
  const brief: GeneratorBrief = {
    schemaVersion: 1,
    bundlePath: '../../bundle.json',
    scriptId: 'generated:nl:script:fictieve-documentcontrole',
    subject: 'Fictieve documentcontrole',
    purpose: 'Defensive training',
    geography: 'Nederland',
    contentLanguage: 'nl',
    classification: 'public',
    sourceSensitivity: 'public',
    detail: 'practical',
    scriptIcon: 'builtin:document-check',
    materialDirectory: '../../materials',
  };
  await initializeWorkspace(workspacePath, brief);
  const prepared = await prepareWorkspace(workspacePath);
  assert.equal(prepared.state.materials.length, 1);
  const material = prepared.state.materials[0];
  await writeFile(join(workspacePath, material.markdownPath), 'Stale before candidate authoring.\n');
  assert.equal((await getWorkspaceStatus(workspacePath)).nextAction, 'prepare');
  await prepareWorkspace(workspacePath);
  const evidence: EvidenceFile = {
    schemaVersion: 1,
    sources: [{
      key: 'local-guidance',
      title: 'Official guidance',
      kind: 'local',
      state: 'valid',
      filename: material.sourcePath,
      contentHash: material.sourceHash,
      reliability: 'Primary local guidance.',
      passages: [{ text: 'Independent verification supports a defensible decision.' }],
    }],
    claims: [
      { nodeKey: 'intake', sourceKeys: ['local-guidance'] },
      { nodeKey: 'compare', sourceKeys: ['local-guidance'] },
    ],
  };
  const research: ResearchLogFile = {
    schemaVersion: 1,
    entries: [],
    contradictionSearchCompleted: true,
    missingPerspectiveSearchCompleted: true,
  };
  await writeFile(join(workspacePath, workspaceFiles.candidate), JSON.stringify(candidate));
  await writeFile(join(workspacePath, workspaceFiles.evidence), JSON.stringify(evidence));
  await writeFile(join(workspacePath, workspaceFiles.researchLog), JSON.stringify(research));

  const standalonePath = join(root, 'fictieve.standalone.json');
  await buildWorkspace(workspacePath, { output: standalonePath });
  assert.equal((await getWorkspaceStatus(workspacePath)).nextAction, 'review');
  const reviewed = JSON.parse(await readFile(standalonePath, 'utf8'));
  reviewed.crimeScripts[0].reviewer = ['RIEC reviewer'];
  reviewed.crimeScripts[0].status = 2;
  reviewed.crimeScripts[0].unreviewed = false;
  await writeFile(standalonePath, JSON.stringify(reviewed));
  assert.equal((await getWorkspaceStatus(workspacePath)).nextAction, 'merge');

  const reclassified = structuredClone(reviewed);
  reclassified.crimeScripts[0].classification = 'restricted';
  await writeFile(standalonePath, JSON.stringify(reclassified));
  await assert.rejects(
    mergeWorkspace(workspacePath, {
      standalone: standalonePath,
      output: join(root, 'bundle-reclassified.json'),
      confirmed: true,
    }),
    /changed classification/i
  );

  const deleted = structuredClone(reviewed);
  deleted.crimeScripts[0].stages[0].variants[0].activities = [];
  await writeFile(standalonePath, JSON.stringify(deleted));
  await assert.rejects(
    mergeWorkspace(workspacePath, {
      standalone: standalonePath,
      output: join(root, 'bundle-deleted.json'),
      confirmed: true,
    }),
    /confirm-deletions/
  );
  await writeFile(standalonePath, JSON.stringify(reviewed));

  const mergedPath = join(root, 'bundle-merged.json');
  const merged = await mergeWorkspace(workspacePath, {
    standalone: standalonePath,
    output: mergedPath,
    confirmed: true,
  });
  assert.equal(merged.changedNodes, 0);
  const output = JSON.parse(await readFile(mergedPath, 'utf8'));
  assert.equal(output.crimeScripts.length, 1);
  assert.deepEqual(output.crimeScripts[0].reviewer, ['RIEC reviewer']);
  assert.equal(output.crimeScripts[0].unreviewed, false);
  const original = JSON.parse(await readFile(bundlePath, 'utf8'));
  assert.equal(original.crimeScripts.length, 0);

  reviewed.crimeScripts[0].stages[0].variants[0].activities[0].description =
    'Observable traces: an independently reviewed comparison result.';
  await writeFile(standalonePath, JSON.stringify(reviewed));
  const activityId = reviewed.crimeScripts[0].stages[0].variants[0].activities[0].id;
  const answersPath = join(root, 'review-answers.json');
  await writeFile(answersPath, JSON.stringify({
    schemaVersion: 1,
    answers: [{ nodeId: activityId, evidenceStillApplies: false, sourceKeys: [] }],
  }));
  const editedMerge = await mergeWorkspace(workspacePath, {
    standalone: standalonePath,
    output: join(root, 'bundle-edited.json'),
    confirmed: true,
    reviewAnswers: answersPath,
  });
  assert.equal(editedMerge.changedNodes, 1);
  const updatedEvidence = JSON.parse(
    await readFile(join(workspacePath, workspaceFiles.evidence), 'utf8')
  );
  assert.equal(
    updatedEvidence.claims.find(({ nodeKey }: { nodeKey: string }) => nodeKey === 'compare').state,
    'unsubstantiated-after-human-edit'
  );

  reviewed.crimeScripts[0].stages[0].variants[0].activities[0].description =
    'Observable traces: a replacement source supports the independently reviewed result.';
  await writeFile(standalonePath, JSON.stringify(reviewed));
  updatedEvidence.sources.push({
    key: 'replacement-guidance',
    title: 'Replacement guidance',
    kind: 'web',
    state: 'needs-review',
    url: 'https://example.invalid/replacement-guidance',
    accessedAt: '2026-01-01',
    contentHash: 'a'.repeat(64),
    reliability: 'Fictional test source.',
    passages: [{ text: 'Independent review supports a defensible decision.' }],
  });
  await writeFile(
    join(workspacePath, workspaceFiles.evidence),
    JSON.stringify(updatedEvidence)
  );
  await writeFile(answersPath, JSON.stringify({
    schemaVersion: 1,
    answers: [{
      nodeId: activityId,
      evidenceStillApplies: false,
      sourceKeys: ['replacement-guidance'],
    }],
  }));
  await assert.rejects(
    mergeWorkspace(workspacePath, {
      standalone: standalonePath,
      output: join(root, 'bundle-invalid-replacement.json'),
      confirmed: true,
      reviewAnswers: answersPath,
    }),
    /not valid/
  );
  updatedEvidence.sources.at(-1).state = 'valid';
  await writeFile(
    join(workspacePath, workspaceFiles.evidence),
    JSON.stringify(updatedEvidence)
  );
  const replacementOutput = join(root, 'bundle-replacement.json');
  await mergeWorkspace(workspacePath, {
    standalone: standalonePath,
    output: replacementOutput,
    confirmed: true,
    reviewAnswers: answersPath,
  });
  const replacementBundle = JSON.parse(await readFile(replacementOutput, 'utf8'));
  const replacementLiterature = replacementBundle.crimeScripts[0].literature.find(
    ({ label }: { label: string }) => label === 'Replacement guidance'
  );
  assert.ok(replacementLiterature);
  assert.match(replacementLiterature.usedFor, /vergelijkt het document/);

  await writeFile(
    join(workspacePath, material.markdownPath),
    'Tampered prepared Markdown.\n'
  );
  assert.equal((await getWorkspaceStatus(workspacePath)).nextAction, 'prepare');
  await writeFile(
    join(workspacePath, material.markdownPath),
    'Independent verification supports a defensible decision.\n'
  );
  await writeFile(
    join(materialsPath, 'official-guidance.md'),
    'Updated guidance now requires two independent comparisons.\n'
  );
  assert.equal((await getWorkspaceStatus(workspacePath)).nextAction, 'prepare');
  const reprepared = await prepareWorkspace(workspacePath);
  assert.notEqual(reprepared.state.materials[0].sourceHash, material.sourceHash);
  const invalidatedEvidence = JSON.parse(
    await readFile(join(workspacePath, workspaceFiles.evidence), 'utf8')
  );
  assert.equal(invalidatedEvidence.sources[0].state, 'needs-review');
  assert.ok(await readFile(join(workspacePath, workspaceFiles.candidate), 'utf8'));
  await assert.rejects(readFile(join(workspacePath, material.markdownPath), 'utf8'));
});

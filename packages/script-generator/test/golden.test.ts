import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { normalizeDataModel } from '@crime-script/core/model-normalization';
import { buildStandaloneCandidate } from '../src/build.ts';
import { validateBrief } from '../src/schema.ts';
import { validateCandidate, validateEvidence } from '../src/validation.ts';

for (const name of ['golden-new', 'golden-update']) {
  test(`${name} builds deterministically without network access`, async () => {
    const fixture = JSON.parse(await readFile(
      resolve(import.meta.dirname, 'fixtures', `${name}.json`),
      'utf8'
    ));
    const result = buildStandaloneCandidate(
      normalizeDataModel(fixture.bundle),
      validateBrief(fixture.brief),
      validateCandidate(fixture.candidate),
      validateEvidence(fixture.evidence),
      true,
      123
    );
    const script = result.model.crimeScripts[0];
    assert.equal(script.id, fixture.expected.scriptId);
    assert.equal(script.stages[0].id, fixture.expected.stageId);
    assert.equal(script.stages[0].variants[0].activities[0].id, fixture.expected.activityId);
  });
}

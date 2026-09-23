import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import { validateBrief } from '../src/schema.ts';
import { validateCandidate, validateEvidence, validateResearchLog } from '../src/validation.ts';

const skillRoot = resolve(import.meta.dirname, '../../../.agents/skills/crime-script-generator');

test('installable skill stays concise and its example files match runtime contracts', async () => {
  const skill = await readFile(resolve(skillRoot, 'SKILL.md'), 'utf8');
  assert.ok(skill.split('\n').length <= 100);
  assert.match(skill, /^---\nname: crime-script-generator\n/);
  assert.match(skill, /Use when/i);

  validateBrief(parse(await readFile(resolve(skillRoot, 'example/brief.yaml'), 'utf8')));
  validateCandidate(JSON.parse(await readFile(resolve(skillRoot, 'example/candidate.json'), 'utf8')));
  validateEvidence(JSON.parse(await readFile(resolve(skillRoot, 'example/evidence.json'), 'utf8')));
  validateResearchLog(JSON.parse(await readFile(resolve(skillRoot, 'example/research-log.json'), 'utf8')));

  for (const name of [
    'brief.schema.json',
    'candidate.schema.json',
    'evidence.schema.json',
    'research-log.schema.json',
    'review-answers.schema.json',
  ]) {
    const schema = JSON.parse(await readFile(resolve(skillRoot, 'schemas', name), 'utf8'));
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  }
});

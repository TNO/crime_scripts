import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs');

test('production CSS retains Safari 16 media-query compatibility', () => {
  const index = readFileSync(resolve(docsDir, 'index.html'), 'utf8');
  const stylesheetPath = index.match(/href="\/crime_scripts\/(assets\/index-[^"]+\.css)"/)?.[1];

  assert.ok(stylesheetPath, 'production stylesheet is referenced from docs/index.html');

  const stylesheet = readFileSync(resolve(docsDir, stylesheetPath), 'utf8');

  assert.doesNotMatch(
    stylesheet,
    /\(width(?:<=|>=)/,
    'production CSS must not require media-query range syntax introduced in Safari 16.4',
  );
});

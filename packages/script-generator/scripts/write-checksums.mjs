import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.argv[2] || '');
if (!process.argv[2] || !(await stat(root).catch(() => undefined))?.isDirectory()) {
  throw new Error('Usage: node write-checksums.mjs <release-directory>');
}

const collectFiles = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else if (entry.isFile() && entry.name !== 'SHA256SUMS') files.push(path);
  }
  return files;
};

const lines = [];
for (const path of (await collectFiles(root)).sort()) {
  const hash = createHash('sha256').update(await readFile(path)).digest('hex');
  lines.push(`${hash}  ${relative(root, path).split('\\').join('/')}`);
}
await writeFile(join(root, 'SHA256SUMS'), `${lines.join('\n')}\n`);

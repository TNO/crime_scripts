import { createHash } from 'node:crypto';

export const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const normalizedLabel = (value: string): string =>
  value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

export const sha256 = (value: string | Uint8Array): string =>
  createHash('sha256').update(value).digest('hex');

const trigrams = (value: string): Set<string> => {
  const normalized = `  ${normalizedLabel(value)}  `;
  const values = new Set<string>();
  for (let index = 0; index <= normalized.length - 3; index += 1) {
    values.add(normalized.slice(index, index + 3));
  }
  return values;
};

export const textSimilarity = (left: string, right: string): number => {
  const leftSet = trigrams(left);
  const rightSet = trigrams(right);
  const intersection = [...leftSet].filter((value) => rightSet.has(value)).length;
  return (2 * intersection) / Math.max(1, leftSet.size + rightSet.size);
};

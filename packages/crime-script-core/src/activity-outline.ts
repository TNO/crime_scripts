import type { Activity, ID } from './data-model.ts';

export type ActivityOutlineNode = Activity & {
  children: Activity[];
};

export type ActivityOutlinePreview = {
  activities: Activity[];
  added: number;
  updated: number;
  moved: number;
  preserved: number;
  errors: string[];
};

const idMarker = /\s*<!--\s*pax:activity-id=([^\s]+)\s*-->\s*$/i;
const listItem = /^(\s*)[-*+]\s+(.+?)\s*$/;
const normalizedLabel = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

export const normalizeActivityHierarchy = (activities: Activity[] = []): Activity[] => {
  if (activities.some((activity) => activity.parentId !== undefined)) {
    return activities.map((activity) => ({ ...activity }));
  }

  let parentId: ID | undefined;
  return activities.map((activity) => {
    if (activity.header) {
      parentId = activity.id;
      return { ...activity };
    }
    return parentId ? { ...activity, parentId } : { ...activity };
  });
};

export const buildActivityOutline = (activities: Activity[] = []): ActivityOutlineNode[] => {
  const normalized = normalizeActivityHierarchy(activities);
  const byId = new Map(normalized.map((activity) => [activity.id, activity]));
  const roots = normalized.filter((activity) => {
    if (!activity.parentId) return true;
    const parent = byId.get(activity.parentId);
    return !parent || Boolean(parent.parentId);
  });

  return roots.map((activity) => ({
    ...activity,
    children: normalized.filter(({ parentId }) => parentId === activity.id),
  }));
};

export const numberActivityOutline = (
  outline: ActivityOutlineNode[]
): Map<ID, string> => {
  const numbers = new Map<ID, string>();
  outline.forEach((activity, index) => {
    numbers.set(activity.id, String(index + 1));
    activity.children.forEach((child, childIndex) => {
      numbers.set(child.id, `${index + 1}.${childIndex + 1}`);
    });
  });
  return numbers;
};

export const activitiesToMarkdown = (activities: Activity[] = []): string =>
  buildActivityOutline(activities)
    .flatMap((activity) => [
      `- ${activity.label} <!-- pax:activity-id=${activity.id} -->`,
      ...activity.children.map(
        (child) => `  - ${child.label} <!-- pax:activity-id=${child.id} -->`
      ),
    ])
    .join('\n');

type ParsedActivity = {
  id?: ID;
  label: string;
  parentIndex?: number;
  line: number;
};

const parseActivityMarkdown = (markdown: string): { items: ParsedActivity[]; errors: string[] } => {
  const items: ParsedActivity[] = [];
  const errors: string[] = [];
  let currentParentIndex: number | undefined;
  const seenIds = new Set<ID>();

  markdown.split(/\r?\n/).forEach((line, lineIndex) => {
    if (!line.trim()) return;
    const match = line.match(listItem);
    if (!match) {
      errors.push(`Line ${lineIndex + 1} is not a Markdown list item.`);
      return;
    }
    const indentation = match[1].replace(/\t/g, '    ').length;
    if (indentation > 2) {
      errors.push(`Line ${lineIndex + 1} is nested more than one level.`);
      return;
    }
    const marker = match[2].match(idMarker);
    const id = marker?.[1];
    const label = match[2].replace(idMarker, '').trim();
    if (!label) {
      errors.push(`Line ${lineIndex + 1} has no step label.`);
      return;
    }
    if (id && seenIds.has(id)) {
      errors.push(`Line ${lineIndex + 1} repeats activity ID "${id}".`);
      return;
    }
    if (id) seenIds.add(id);
    if (indentation > 0 && currentParentIndex === undefined) {
      errors.push(`Line ${lineIndex + 1} is a substep without a preceding step.`);
      return;
    }
    const item: ParsedActivity = {
      id,
      label,
      parentIndex: indentation > 0 ? currentParentIndex : undefined,
      line: lineIndex + 1,
    };
    items.push(item);
    if (indentation === 0) currentParentIndex = items.length - 1;
  });

  if (items.length === 0 && errors.length === 0) {
    errors.push('Add at least one Markdown list item.');
  }
  return { items, errors };
};

const emptyActivity = (id: ID, label: string): Activity => ({
  id,
  label,
  description: '',
  type: 0,
  cast: [],
  attributes: [],
  transports: [],
});

export const reconcileActivityMarkdown = (
  activities: Activity[],
  markdown: string,
  createId: () => ID
): ActivityOutlinePreview => {
  const parsed = parseActivityMarkdown(markdown);
  if (parsed.errors.length > 0) {
    return { activities, added: 0, updated: 0, moved: 0, preserved: activities.length, errors: parsed.errors };
  }

  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  const byLabel = new Map<string, Activity[]>();
  activities.forEach((activity) => {
    const key = normalizedLabel(activity.label);
    byLabel.set(key, [...(byLabel.get(key) || []), activity]);
  });
  const usedIds = new Set<ID>();
  const resolved = parsed.items.map((item) => {
    const byMarker = item.id ? byId.get(item.id) : undefined;
    const labelMatches = byLabel.get(normalizedLabel(item.label)) || [];
    const byUniqueLabel =
      !byMarker && labelMatches.length === 1 && !usedIds.has(labelMatches[0].id)
        ? labelMatches[0]
        : undefined;
    const existing = byMarker || byUniqueLabel;
    const activity = existing ? { ...existing } : emptyActivity(createId(), item.label);
    usedIds.add(activity.id);
    return { item, activity, existing };
  });

  let added = 0;
  let updated = 0;
  let moved = 0;
  const next = resolved.map(({ item, activity, existing }) => {
    const parentId =
      item.parentIndex === undefined ? undefined : resolved[item.parentIndex]?.activity.id;
    const nextActivity = { ...activity, label: item.label, parentId };
    if (parentId) delete nextActivity.header;
    if (!existing) added += 1;
    else {
      if (existing.label !== item.label) updated += 1;
      if (existing.parentId !== parentId) moved += 1;
    }
    return nextActivity;
  });
  const omitted = activities.filter(({ id }) => !usedIds.has(id)).map((activity) => ({ ...activity }));

  return {
    activities: [...next, ...omitted],
    added,
    updated,
    moved,
    preserved: omitted.length,
    errors: [],
  };
};

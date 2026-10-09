import type { CrimeScript } from '../models/data-model.ts';

type UsageKind = 'scene' | 'variant' | 'activity' | 'indicator' | 'measure' | 'condition' | 'opportunity';
type Usage = { sceneId: string; sceneLabel: string; kind: UsageKind };
type UsageLabel = 'ACTS' | 'ACTIVITY' | 'ACTIVITIES' | 'INDICATOR' | 'INDICATORS'
  | 'MEASURE' | 'MEASURES' | 'CONDITION' | 'CONDITIONS' | 'OPPORTUNITY' | 'OPPORTUNITIES';

export const readableLiteratureUsage = (
  usedFor: string | undefined,
  script: Partial<Pick<CrimeScript, 'label' | 'stages'>>,
  translate: (key: UsageLabel) => string | string[]
): string | undefined => {
  if (!usedFor) return usedFor;
  const keys = usedFor.split(',').map((key) => key.trim());
  if (keys.some((key) => !/^[\w$./:-]+$/.test(key))) return usedFor;

  const usages = new Map<string, Usage[]>();
  const add = (id: string, kind: UsageKind, sceneId: string, sceneLabel: string) => {
    const marker = `:${kind}:`;
    const index = id.lastIndexOf(marker);
    if (index < 0) return;
    const key = id.slice(index + marker.length);
    usages.set(key, [...(usages.get(key) || []), { sceneId, sceneLabel, kind }]);
  };
  for (const scene of script.stages || []) {
    add(scene.id, 'scene', scene.id, scene.label);
    for (const variant of scene.variants) {
      add(variant.id, 'variant', scene.id, scene.label);
      for (const kind of ['activity', 'indicator', 'measure', 'condition', 'opportunity'] as const) {
        const nodes = kind === 'activity' ? variant.activities
          : kind === 'indicator' ? variant.indicators
            : kind === 'measure' ? variant.measures
              : kind === 'condition' ? variant.conditions : variant.opportunities;
        for (const node of nodes) add(node.id, kind, scene.id, scene.label);
      }
    }
  }

  const groups = new Map<string, { label: string; counts: Map<UsageKind, number> }>();
  const extras: string[] = [];
  let resolved = false;
  for (const key of keys) {
    if (key === '$script' && script.label) {
      extras.push(script.label);
      resolved = true;
      continue;
    }
    // A normalized key can share another node's slug, so only exact suffixes are safe.
    const matches = usages.get(key);
    if (matches?.length !== 1) {
      extras.push(key);
      continue;
    }
    resolved = true;
    const usage = matches[0];
    const group = groups.get(usage.sceneId) || {
      label: usage.sceneLabel,
      counts: new Map<UsageKind, number>(),
    };
    group.counts.set(usage.kind, (group.counts.get(usage.kind) || 0) + 1);
    groups.set(usage.sceneId, group);
  }
  if (!resolved) return usedFor;
  const labels: Record<Exclude<UsageKind, 'scene'>, [UsageLabel, UsageLabel]> = {
    variant: ['ACTS', 'ACTS'],
    activity: ['ACTIVITY', 'ACTIVITIES'],
    indicator: ['INDICATOR', 'INDICATORS'],
    measure: ['MEASURE', 'MEASURES'],
    condition: ['CONDITION', 'CONDITIONS'],
    opportunity: ['OPPORTUNITY', 'OPPORTUNITIES'],
  };
  const summaries = [...groups.values()].map(({ label, counts }) => {
    const details = (Object.keys(labels) as Array<keyof typeof labels>)
      .filter((kind) => counts.has(kind))
      .map((kind) => {
        const count = counts.get(kind)!;
        const name = String(translate(labels[kind][count === 1 ? 0 : 1]));
        return `${count} ${kind === 'variant' ? name : name.toLocaleLowerCase()}`;
      });
    return details.length ? `${label} — ${details.join(', ')}` : label;
  });
  return [...summaries, ...extras].join('; ');
};

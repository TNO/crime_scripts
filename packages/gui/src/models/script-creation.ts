import type { Act, ID, Scene } from './data-model';

export type SceneOutline = {
  label?: string;
};

export const createScenesFromOutline = (
  outline: SceneOutline[],
  createId: () => ID
): Scene[] =>
  outline
    .map(({ label }) => (label ?? '').trim())
    .filter(Boolean)
    .map((label) => {
      const sceneId = createId();
      const act: Act = {
        id: createId(),
        label,
        activities: [],
        conditions: [],
        indicators: [],
        measures: [],
        opportunities: [],
      };
      return {
        id: sceneId,
        label,
        variants: [act],
        selectedVariantId: act.id,
      };
    });

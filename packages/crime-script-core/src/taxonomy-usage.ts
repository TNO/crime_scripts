import type { CrimeScript, DataModel, ID } from './data-model';
import type { TaxonomyName } from './taxonomy-references';

export type TaxonomyScriptUsage = {
  script: CrimeScript;
  sceneId?: ID;
  sceneLabel?: string;
  variantId?: ID;
  variantLabel?: string;
  activityId?: ID;
  label: string;
};

export const findTaxonomyScriptUsages = (
  model: DataModel,
  taxonomy: TaxonomyName,
  id: ID,
  scripts: CrimeScript[] = model.crimeScripts
): TaxonomyScriptUsage[] => {
  const usages: TaxonomyScriptUsage[] = [];
  scripts.forEach((script) => {
    if ((taxonomy === 'products' && script.productIds.includes(id)) ||
        (taxonomy === 'geoLocations' && script.geoLocationIds?.includes(id))) {
      usages.push({ script, label: script.label });
    }
    script.stages.forEach((scene) => {
      scene.variants.forEach((variant) => {
        const context = {
          script,
          sceneId: scene.id,
          sceneLabel: scene.label,
          variantId: variant.id,
          variantLabel: variant.label,
        };
        if (taxonomy === 'locations' && variant.locationIds?.includes(id)) {
          usages.push({ ...context, label: variant.label });
        }
        if (taxonomy === 'partners') {
          variant.measures.filter((measure) => measure.partners?.includes(id))
            .forEach((measure) => usages.push({ ...context, label: measure.label }));
        }
        if (taxonomy === 'cast' || taxonomy === 'attributes' || taxonomy === 'transports') {
          variant.activities.filter((activity) => activity[taxonomy]?.includes(id))
            .forEach((activity) => usages.push({
              ...context,
              activityId: activity.id,
              label: activity.label,
            }));
        }
      });
    });
  });
  return usages;
};

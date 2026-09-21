import type { DataModel, Hierarchical, ID, Labelled } from './data-model';

export type TaxonomyName =
  | 'cast'
  | 'attributes'
  | 'products'
  | 'transports'
  | 'locations'
  | 'geoLocations'
  | 'partners';

export type TaxonomyItem = {
  taxonomy: TaxonomyName;
  id: ID;
  label: string;
};

export type TaxonomyReferenceUsage = {
  taxonomy: TaxonomyName;
  itemId: ID;
  path: string[];
};

const taxonomyNames: TaxonomyName[] = [
  'cast',
  'attributes',
  'products',
  'transports',
  'locations',
  'geoLocations',
  'partners',
];

const addUsages = (
  usages: TaxonomyReferenceUsage[],
  taxonomy: TaxonomyName,
  ids: ID[] | undefined,
  path: string[]
) => {
  ids?.forEach((itemId) => usages.push({ taxonomy, itemId, path }));
};

export const collectTaxonomyReferenceUsages = (model: DataModel): TaxonomyReferenceUsage[] => {
  const usages: TaxonomyReferenceUsage[] = [];

  taxonomyNames.forEach((taxonomy) => {
    (model[taxonomy] as Array<Labelled & Hierarchical>).forEach((item) => {
      addUsages(usages, taxonomy, item.parents, [item.label]);
    });
  });

  model.crimeScripts.forEach((script) => {
    addUsages(usages, 'products', script.productIds, [script.label]);
    addUsages(usages, 'geoLocations', script.geoLocationIds, [script.label]);
    script.stages.forEach((scene) => {
      scene.variants.forEach((variant) => {
        const variantPath = [script.label, scene.label, variant.label];
        addUsages(usages, 'locations', variant.locationIds, variantPath);
        variant.activities.forEach((activity) => {
          const activityPath = [...variantPath, activity.label];
          addUsages(usages, 'cast', activity.cast, activityPath);
          addUsages(usages, 'attributes', activity.attributes, activityPath);
          addUsages(usages, 'transports', activity.transports, activityPath);
        });
        variant.measures.forEach((measure) => {
          addUsages(usages, 'partners', measure.partners, [...variantPath, measure.label]);
        });
      });
    });
  });

  return usages;
};

export const findDanglingTaxonomyReferences = (model: DataModel): TaxonomyReferenceUsage[] => {
  const knownIds = Object.fromEntries(
    taxonomyNames.map((taxonomy) => [taxonomy, new Set(model[taxonomy].map(({ id }) => id))])
  ) as Record<TaxonomyName, Set<ID>>;

  return collectTaxonomyReferenceUsages(model).filter(
    ({ taxonomy, itemId }) => !knownIds[taxonomy].has(itemId)
  );
};

export const findRemovedTaxonomyItems = (before: DataModel, after: DataModel): TaxonomyItem[] =>
  taxonomyNames.flatMap((taxonomy) => {
    const retainedIds = new Set(after[taxonomy].map(({ id }) => id));
    return before[taxonomy]
      .filter(({ id }) => !retainedIds.has(id))
      .map(({ id, label }) => ({ taxonomy, id, label }));
  });

export const removeTaxonomyReferences = (input: DataModel, removed: TaxonomyItem[]): DataModel => {
  const model = structuredClone(input);
  const removedIds = Object.fromEntries(
    taxonomyNames.map((taxonomy) => [
      taxonomy,
      new Set(removed.filter((item) => item.taxonomy === taxonomy).map(({ id }) => id)),
    ])
  ) as Record<TaxonomyName, Set<ID>>;
  const retain = (taxonomy: TaxonomyName, ids: ID[] | undefined) =>
    ids?.filter((id) => !removedIds[taxonomy].has(id));

  taxonomyNames.forEach((taxonomy) => {
    (model[taxonomy] as Array<Labelled & Hierarchical>).forEach((item) => {
      if (item.parents) item.parents = retain(taxonomy, item.parents);
    });
  });

  model.crimeScripts.forEach((script) => {
    script.productIds = retain('products', script.productIds) || [];
    script.geoLocationIds = retain('geoLocations', script.geoLocationIds);
    script.stages.forEach((scene) => {
      scene.variants.forEach((variant) => {
        variant.locationIds = retain('locations', variant.locationIds);
        variant.activities.forEach((activity) => {
          activity.cast = retain('cast', activity.cast);
          activity.attributes = retain('attributes', activity.attributes);
          activity.transports = retain('transports', activity.transports);
        });
        variant.measures.forEach((measure) => {
          measure.partners = retain('partners', measure.partners) || [];
        });
      });
    });
  });

  return model;
};

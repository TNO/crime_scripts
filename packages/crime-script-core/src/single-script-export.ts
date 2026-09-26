import type { CrimeScript, DataModel, ID } from './data-model';
import { getMatchingStarterBundleMetadata } from './starter-library.ts';

const includeTaxonomyParents = <T extends { id: ID; parents?: ID[] }>(
  items: T[],
  directIds: Set<ID>
): T[] => {
  const included = new Set(directIds);
  let changed = true;
  while (changed) {
    changed = false;
    items.forEach((item) => {
      if (!included.has(item.id)) return;
      item.parents?.forEach((parentId) => {
        if (included.has(parentId)) return;
        included.add(parentId);
        changed = true;
      });
    });
  }
  return items.filter(({ id }) => included.has(id));
};

export const createSingleScriptExportModel = (
  cs: Partial<CrimeScript>,
  model: DataModel,
  lastUpdate = Date.now()
): DataModel => {
  const exportScript = structuredClone(cs);
  exportScript.stages?.forEach((stage) => stage.variants.forEach((act) =>
    act.activities.forEach((activity) => {
      delete activity.relatedScriptIds;
    })
  ));
  const acts = exportScript.stages?.flatMap((stage) => stage.variants) || [];
  const castIds = acts.reduce((ids, act) => {
    act.activities.forEach((activity) => activity.cast?.forEach((id) => ids.add(id)));
    return ids;
  }, new Set<ID>());
  const attributeIds = acts.reduce((ids, act) => {
    act.activities.forEach((activity) => activity.attributes?.forEach((id) => ids.add(id)));
    return ids;
  }, new Set<ID>());
  const transportIds = acts.reduce((ids, act) => {
    act.activities.forEach((activity) => activity.transports?.forEach((id) => ids.add(id)));
    return ids;
  }, new Set<ID>());
  const partnerIds = acts.reduce((ids, act) => {
    act.measures.forEach((measure) => measure.partners?.forEach((id) => ids.add(id)));
    return ids;
  }, new Set<ID>());
  const locationIds = acts.reduce((ids, act) => {
    act.locationIds?.forEach((id) => ids.add(id));
    return ids;
  }, new Set<ID>());
  const starterBundle = getMatchingStarterBundleMetadata(exportScript, model);

  return {
    ...model,
    schemaVersion: 3,
    previewMode: true,
    crimeScripts: [exportScript],
    cast: includeTaxonomyParents(model.cast, castIds),
    attributes: includeTaxonomyParents(model.attributes, attributeIds),
    transports: includeTaxonomyParents(model.transports, transportIds),
    partners: includeTaxonomyParents(model.partners, partnerIds),
    locations: includeTaxonomyParents(model.locations, locationIds),
    geoLocations: includeTaxonomyParents(model.geoLocations, new Set(exportScript.geoLocationIds || [])),
    products: includeTaxonomyParents(model.products, new Set(exportScript.productIds || [])),
    starterBundle,
    lastUpdate,
  } as DataModel;
};

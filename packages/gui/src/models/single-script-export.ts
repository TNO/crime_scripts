import type { CrimeScript, DataModel, ID } from './data-model';

export const createSingleScriptExportModel = (
  cs: Partial<CrimeScript>,
  model: DataModel,
  lastUpdate = Date.now()
): DataModel => {
  const acts = cs.stages?.flatMap((stage) => stage.variants) || [];
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

  return {
    ...model,
    schemaVersion: 3,
    previewMode: true,
    crimeScripts: [cs],
    cast: model.cast.filter(({ id }) => castIds.has(id)),
    attributes: model.attributes.filter(({ id }) => attributeIds.has(id)),
    transports: model.transports.filter(({ id }) => transportIds.has(id)),
    partners: model.partners.filter(({ id }) => partnerIds.has(id)),
    locations: model.locations.filter(({ id }) => locationIds.has(id)),
    geoLocations: model.geoLocations.filter(({ id }) => cs.geoLocationIds?.includes(id)),
    products: model.products.filter(({ id }) => cs.productIds?.includes(id)),
    lastUpdate,
  } as DataModel;
};

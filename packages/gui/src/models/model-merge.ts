import type { Act, Activity, DataModel, ID } from './data-model';

type MergeResult<T> = {
  items: T[];
  importedIds: Map<ID, ID>;
};

const mergeLabeledArrays = <T extends { id: ID; label: string }>(current: T[], imported: T[]): MergeResult<T> => {
  const merged = new Map(current.map((item) => [item.id, item]));
  const labelToId = new Map(current.map((item) => [item.label, item.id]));
  const importedIds = new Map<ID, ID>();

  imported.forEach((item) => {
    const retainedId = merged.has(item.id) ? item.id : labelToId.get(item.label) || item.id;
    const existing = merged.get(retainedId);
    merged.set(retainedId, existing ? { ...existing, ...item, id: retainedId } : item);
    labelToId.set(item.label, retainedId);
    importedIds.set(item.id, retainedId);
  });

  return { items: Array.from(merged.values()), importedIds };
};

const remap = (ids: ID[] | undefined, importedIds: Map<ID, ID>) =>
  ids?.map((id) => importedIds.get(id) || id);

export const mergeDataModels = (current: DataModel, imported: DataModel): DataModel => {
  const cast = mergeLabeledArrays(current.cast, imported.cast);
  const attributes = mergeLabeledArrays(current.attributes, imported.attributes);
  const locations = mergeLabeledArrays(current.locations, imported.locations);
  const geoLocations = mergeLabeledArrays(current.geoLocations, imported.geoLocations);
  const products = mergeLabeledArrays(current.products, imported.products);
  const transports = mergeLabeledArrays(current.transports, imported.transports);
  const partners = mergeLabeledArrays(current.partners, imported.partners);

  const updateActivityReferences = (activity: Activity): Activity => ({
    ...activity,
    cast: remap(activity.cast, cast.importedIds),
    attributes: remap(activity.attributes, attributes.importedIds),
    transports: remap(activity.transports, transports.importedIds),
  });
  const updateActReferences = (act: Act): Act => ({
    ...act,
    locationIds: remap(act.locationIds, locations.importedIds),
    activities: act.activities.map(updateActivityReferences),
    measures: act.measures.map((measure) => ({
      ...measure,
      partners: remap(measure.partners, partners.importedIds) || [],
    })),
  });

  const crimeScripts = mergeLabeledArrays(current.crimeScripts, imported.crimeScripts).items.map((crimeScript) => ({
    ...crimeScript,
    productIds: remap(crimeScript.productIds, products.importedIds) || [],
    geoLocationIds: remap(crimeScript.geoLocationIds, geoLocations.importedIds),
    stages: crimeScript.stages.map((scene) => ({
      ...scene,
      variants: scene.variants.map(updateActReferences),
    })),
  }));

  return {
    schemaVersion: 3,
    version: Math.max(current.version, imported.version),
    lastUpdate: Math.max(current.lastUpdate, imported.lastUpdate),
    previewMode: false,
    crimeScripts,
    cast: cast.items,
    attributes: attributes.items,
    locations: locations.items,
    geoLocations: geoLocations.items,
    products: products.items,
    transports: transports.items,
    partners: partners.items,
    starterBundle: imported.starterBundle || current.starterBundle,
  };
};

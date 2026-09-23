import { buildActivityOutline } from '../models/activity-outline.ts';
import type { CrimeScript, DataModel, ID, Labelled } from '../models/data-model.ts';
import { getMatchingStarterBundleMetadata } from '../models/starter-library.ts';

export type ReportCategory = {
  id: string;
  label: string;
  group: string;
};

export type ReportStep = {
  id: ID;
  number: string;
  label: string;
  description?: string;
  cast: string[];
  attributes: string[];
  transports: string[];
  children: ReportStep[];
};

export type ReportBarrier = {
  id: ID;
  label: string;
  description?: string;
  categoryId: string;
  category: string;
  categoryGroup: string;
  partners: string[];
};

export type ReportVariant = {
  id: ID;
  label: string;
  description?: string;
  locations: string[];
  steps: ReportStep[];
  conditions: Array<{ label: string; description?: string; type: string }>;
  indicators: Array<{ label: string; description?: string }>;
  barriers: ReportBarrier[];
};

export type ReportScene = {
  id: ID;
  number: number;
  label: string;
  description?: string;
  variants: ReportVariant[];
};

export type CrimeScriptReport = {
  id: ID;
  title: string;
  description?: string;
  classification: CrimeScript['classification'];
  language: CrimeScript['language'];
  products: string[];
  geographicScope: string[];
  aiGenerated: boolean;
  unreviewed: boolean;
  exportedAt: string;
  updatedAt: string;
  provenance?: {
    title: string;
    version: string;
    attribution?: string;
    license?: string;
    licenseUrl?: string;
    disclaimer?: string;
  };
  scenes: ReportScene[];
  references: Array<{
    label: string;
    authors?: string;
    url?: string;
    description?: string;
    usedFor?: string;
  }>;
};

const labelsFor = (ids: ID[] | undefined, lookup: Map<ID, Labelled>): string[] =>
  (ids || [])
    .map((id) => lookup.get(id)?.label)
    .filter((label): label is string => label !== undefined);

const uniqueLabelsFor = (ids: ID[] | undefined, lookup: Map<ID, Labelled>): string[] =>
  [...new Set(labelsFor(ids, lookup))];

export const buildCrimeScriptReport = (
  crimeScript: CrimeScript,
  model: DataModel,
  categoryLookup: (id: string) => ReportCategory | undefined,
  exportedAt = new Date()
): CrimeScriptReport => {
  const taxonomyLookup = new Map<ID, Labelled>([
    ...model.cast,
    ...model.attributes,
    ...model.locations,
    ...model.geoLocations,
    ...model.products,
    ...model.transports,
    ...model.partners,
  ].map((item) => [item.id, item]));
  const starterMetadata = getMatchingStarterBundleMetadata(crimeScript, model);

  const scenes = crimeScript.stages.map((scene, sceneIndex): ReportScene => ({
    id: scene.id,
    number: sceneIndex + 1,
    label: scene.label,
    description: scene.description,
    variants: scene.variants.map((variant): ReportVariant => ({
      id: variant.id,
      label: variant.label,
      description: variant.description,
      locations: labelsFor(variant.locationIds, taxonomyLookup),
      steps: buildActivityOutline(variant.activities).map((activity, activityIndex): ReportStep => {
        const toStep = (
          item: typeof activity,
          number: string,
          children: ReportStep[]
        ): ReportStep => ({
          id: item.id,
          number,
          label: item.label,
          description: item.description,
          cast: labelsFor(item.cast, taxonomyLookup),
          attributes: labelsFor(item.attributes, taxonomyLookup),
          transports: labelsFor(item.transports, taxonomyLookup),
          children,
        });
        const number = String(activityIndex + 1);
        const children = activity.children.map((child, childIndex) =>
          toStep({ ...child, children: [] }, `${number}.${childIndex + 1}`, [])
        );
        return toStep(activity, number, children);
      }),
      conditions: variant.conditions.map(({ label, description, type }) => ({
        label,
        description,
        type,
      })),
      indicators: variant.indicators.map(({ label, description }) => ({ label, description })),
      barriers: variant.measures.map((measure): ReportBarrier => {
        const category = categoryLookup(measure.cat);
        return {
          id: measure.id,
          label: measure.label,
          description: measure.description,
          categoryId: measure.cat,
          category: category?.label || measure.cat,
          categoryGroup: category?.group || '',
          partners: uniqueLabelsFor(measure.partners, taxonomyLookup),
        };
      }),
    })),
  }));

  return {
    id: crimeScript.id,
    title: crimeScript.label,
    description: crimeScript.description,
    classification: crimeScript.classification,
    language: crimeScript.language,
    products: labelsFor(crimeScript.productIds, taxonomyLookup),
    geographicScope: labelsFor(crimeScript.geoLocationIds, taxonomyLookup),
    aiGenerated: crimeScript.aiGenerated,
    unreviewed: Boolean(crimeScript.unreviewed),
    exportedAt: exportedAt.toISOString(),
    updatedAt: new Date(crimeScript.updated).toISOString(),
    provenance: crimeScript.starterOrigin
      ? {
          title: starterMetadata?.title || crimeScript.starterOrigin.bundleId,
          version: crimeScript.starterOrigin.bundleVersion,
          attribution: starterMetadata?.attribution,
          license: starterMetadata?.license,
          licenseUrl: starterMetadata?.licenseUrl,
          disclaimer: starterMetadata?.disclaimer,
        }
      : undefined,
    scenes,
    references: crimeScript.literature.map(({ label, authors, url, description, usedFor }) => ({
      label,
      authors,
      url,
      description,
      usedFor,
    })),
  };
};

import { UIForm } from 'mithril-ui-form';
import { CrimeScript, Literature, Labeled, Hierarchical, CrimeScriptFilter } from './data-model';
import { toOptions } from '../utils';
import { t } from '../services';

export type AttributeType = 'cast' | 'attributes' | 'transports' | 'locations' | 'geoLocations' | 'products';

export const attrForm = (id: AttributeType, label: string, attr: Labeled[]) => [
  {
    id,
    label,
    className: 'col s12',
    repeat: true,
    // pageSize: 100,
    type: [
      { id: 'id', type: 'autogenerate', autogenerate: 'id' },
      { id: 'label', type: 'text', className: 'col s12 m4', label: t('NAME') },
      { id: 'synonyms', type: 'tags', className: 'col s12 m8', label: t('SYNONYMS') },
      {
        id: 'parents',
        type: 'select',
        multiple: true,
        className: 'col s12',
        label: t('CATEGORIES'),
        options: attr,
      },
      // { id: 'url', type: 'base64', className: 'col s6', label: t('IMAGE') },
    ] as UIForm<Hierarchical & Labeled>,
  },
];

export const labelForm = () =>
  [
    { id: 'id', type: 'autogenerate', autogenerate: 'id' },
    { id: 'label', type: 'text', className: 'col s6', label: t('NAME') },
    { id: 'url', type: 'base64', className: 'col s6', label: t('IMAGE') },
    { id: 'description', type: 'textarea', className: 'col s12', label: t('SUMMARY') },
  ] as UIForm<Partial<CrimeScript>>;

export const literatureForm = () =>
  [
    { id: 'id', type: 'autogenerate', autogenerate: 'id' },
    { id: 'label', type: 'text', className: 'col s6', label: t('TITLE') },
    { id: 'authors', type: 'text', className: 'col s6', label: t('AUTHORS') },
    { id: 'url', type: 'url', className: 'col s12', label: t('LINK') },
    { id: 'description', type: 'textarea', className: 'col s12', label: t('SUMMARY') },
  ] as UIForm<Partial<Literature>>;

export const crimeScriptFilterFormFactory = (
  products: Array<Labeled & Hierarchical>,
  locations: Array<Labeled & Hierarchical>,
  geoLocations: Array<Labeled & Hierarchical>,
  icon = 'filter_alt'
): UIForm<CrimeScriptFilter> =>
  [
    {
      id: 'productIds',
      label: t('PRODUCTS', 2),
      icon,
      type: 'select',
      multiple: true,
      options: toOptions(products),
      className: 'col s6 m4',
    },
    {
      id: 'locationIds',
      label: t('LOCATIONS', 2),
      type: 'select',
      multiple: true,
      options: toOptions(locations),
      className: 'col s6 m4',
    },
    {
      id: 'geoLocationIds',
      label: t('GEOLOCATIONS', 2),
      type: 'select',
      multiple: true,
      options: toOptions(geoLocations),
      className: 'col s6 m4',
    },
  ] as UIForm<CrimeScriptFilter>;

export const attributeFilterFormFactory = (
  cast: Array<Labeled & Hierarchical>,
  attributes: Array<Labeled & Hierarchical>,
  transports: Array<Labeled & Hierarchical>,
  icon = 'filter_alt'
) =>
  [
    {
      id: 'roleIds',
      label: t('CAST', 2),
      icon,
      type: 'select',
      multiple: true,
      options: toOptions(cast),
      className: 'col s6 m4',
    },
    {
      id: 'attributeIds',
      label: t('ATTRIBUTES', 2),
      type: 'select',
      multiple: true,
      options: toOptions(attributes),
      className: 'col s6 m4',
    },
    {
      id: 'transportIds',
      label: t('TRANSPORTS', 2),
      type: 'select',
      multiple: true,
      options: toOptions(transports),
      className: 'col s6 m4',
    },
  ] as UIForm<CrimeScriptFilter>;

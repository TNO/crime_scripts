import type { UIForm } from 'mithril-ui-form';
import { t } from '../services';
import { toOptions } from '../utils';
import type { CrimeScript, CrimeScriptFilter, Hierarchical, Labelled, Literature } from './data-model';
import { ICONS, IconOpts } from './icons';

export type AttributeType =
  | 'cast'
  | 'serviceProviders'
  | 'attributes'
  | 'transports'
  | 'locations'
  | 'geoLocations'
  | 'products'
  | 'partners';

export const attrForm = (id: AttributeType, label: string, attr: Labelled[] = [], attrType: AttributeType) => [
  {
    id,
    label,
    className: 'col s12',
    repeat: true,
    // pageSize: 100,
    type: ['cast', 'attributes', 'products', 'transports', 'locations', 'geoLocations', 'partners'].includes(attrType)
      ? ([
          { id: 'id', type: 'autogenerate', autogenerate: 'id' },
          { id: 'label', type: 'text', className: 'col s12 m4', label: t('NAME') },
          { id: 'synonyms', type: 'tags', className: 'col s12 m8', label: t('SYNONYMS') },
          { id: 'description', type: 'textarea', className: 'col s12', label: t('DESCRIPTION') },
          ['partners', 'locations'].includes(attrType)
            ? undefined
            : {
                id: 'parents',
                type: 'search_select',
                multiple: true,
                className: 'col s12',
                label: t('CATEGORIES'),
                options: attr.filter(({ label }) => label),
              },
        ].filter(Boolean) as UIForm<Hierarchical & Labelled>)
      : ([
          { id: 'id', type: 'autogenerate', autogenerate: 'id' },
          { id: 'label', type: 'textarea', className: 'col s12', label: t('DESCRIPTION') },
        ].filter(Boolean) as UIForm<Hierarchical & Labelled>),
  },
];

export const labelForm = () =>
  [
    { id: 'id', type: 'autogenerate', autogenerate: 'id' },
    { id: 'label', type: 'text', className: 'col s6 m6', label: t('NAME'), show: ['!icon=1'] },
    { id: 'label', type: 'text', className: 'col s6 m3', label: t('NAME'), show: ['icon=1'] },
    { id: 'icon', type: 'select', className: 'col s6 m3', label: t('IMAGE'), options: IconOpts },
    { id: 'url', type: 'base64', className: 'col s12 m3', label: t('IMAGE'), show: [`icon=${ICONS.OTHER}`] },
    { id: 'description', type: 'textarea', className: 'col s12', label: t('SUMMARY') },
  ] as UIForm<Partial<CrimeScript>>;

export const literatureForm = () =>
  [
    { id: 'id', type: 'autogenerate', autogenerate: 'id' },
    { id: 'label', type: 'text', className: 'col s6', label: t('TITLE') },
    { id: 'authors', type: 'text', className: 'col s6', label: t('AUTHORS') },
    { id: 'url', type: 'url', className: 'col s12', label: t('LINK') },
    { id: 'description', type: 'textarea', className: 'col s12', label: t('SUMMARY') },
    { id: 'usedFor', type: 'textarea', className: 'col s12', label: t('USED_FOR') },
  ] as UIForm<Partial<Literature>>;

export const crimeScriptFilterFormFactory = (
  products: Array<Labelled & Hierarchical>,
  locations: Array<Labelled & Hierarchical>,
  geoLocations: Array<Labelled & Hierarchical>,
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
  cast: Array<Labelled & Hierarchical>,
  attributes: Array<Labelled & Hierarchical>,
  transports: Array<Labelled & Hierarchical>,
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

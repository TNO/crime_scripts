import m, { type FactoryComponent } from 'mithril';
import { Collapsible, FlatButton, Tabs, TextInput } from 'mithril-materialized';
import { deepCopy, type FormAttributes, LayoutForm, SlimdownView } from 'mithril-ui-form';
import {
  type Act,
  type Cast,
  type CrimeScript,
  type DataModel,
  type FlexSearchResult,
  type Hierarchical,
  type ID,
  type Labelled,
  type TaxonomyName,
  collectTaxonomyReferenceUsages,
  findRemovedTaxonomyItems,
  Pages,
  removeTaxonomyReferences,
  SearchScore,
} from '../models';
import { type AttributeType, attrForm } from '../models/forms';
import { type MeiosisComponent, routingSvc, t } from '../services';
import { scrollToActiveItem, sortByLabel } from '../utils';
import { TreeView } from './ui/treeview';

const text = (value: unknown): string => Array.isArray(value) ? value.join('') : String(value);

const taxonomyTranslationKeys = {
  cast: 'ROLE',
  attributes: 'ATTRIBUTE',
  products: 'PRODUCTS',
  transports: 'TRANSPORT',
  locations: 'LOCATIONS',
  geoLocations: 'GEOLOCATIONS',
  partners: 'PARTNER',
} as const;

const taxonomyLabel = (taxonomy: TaxonomyName): string =>
  text(t(taxonomyTranslationKeys[taxonomy], 1));

export const SettingsPage: MeiosisComponent = () => {
  let edit = false;
  let storedModel: DataModel;
  let selectedId: ID | undefined;
  let showTree = false;

  return {
    oninit: ({
      attrs: {
        state: { model },
        actions: { setPage },
      },
    }) => {
      if (model.cast) {
        model.cast.sort((a, b) => a.label?.localeCompare(b.label || ''));
      }
      if (model.attributes) {
        model.attributes.sort((a, b) => a.label?.localeCompare(b.label || ''));
      }

      selectedId = m.route.param('id');
      setPage(Pages.SETTINGS);
    },
    oncreate: () => {
      selectedId = undefined;
    },
    view: ({ attrs: { state, actions } }) => {
      const { model, role, attributeFilter } = state;
      const {
        cast = [],
        crimeScripts = [],
        attributes = [],
        products = [],
        transports = [],
        locations = [],
        geoLocations = [],
        partners = [],
      } = model;

      const labelFilter = attributeFilter ? attributeFilter.toLowerCase() : undefined;

      const isAdmin = role === 'admin';

      const labelFlt = (a: Cast): boolean | '' =>
        !labelFilter || (a.label && a.label.toLowerCase().includes(labelFilter));
      const tabs = [
        ['cast', t('CAST'), t('CAST_DESC'), 'cast', 'person', cast.filter(labelFlt)],
        ['attributes', t('ATTRIBUTES'), t('ATTRIBUTE_DESC'), 'attributes', 'build', attributes.filter(labelFlt)],
        ['products', t('PRODUCTS', 2), '', 'products', 'shopping_bag', products.filter(labelFlt)],
        ['transports', t('TRANSPORTS'), '', 'transports', 'directions', transports.filter(labelFlt)],
        ['locations', t('LOCATIONS', 2), '', 'locations', 'warehouse', locations.filter(labelFlt)],
        [
          'geoLocations',
          t('GEOLOCATIONS', 2),
          t('GEOLOCATIONS', 2),
          'geoLocations',
          'location_on',
          geoLocations.filter(labelFlt),
        ],
        [
          'partners',
          t('PARTNERS'),
          t('PARTNERS'),
          'partners',
          'handshake', // groups
          partners.filter(labelFlt),
        ],
      ] as Array<
        [
          id: AttributeType,
          label: string,
          description: string,
          type: AttributeType,
          iconName: string,
          attrs: Array<Hierarchical & Labelled>
        ]
      >;

      return m(
        '#settings-page.settings.page.row',
        m(TextInput, {
          id: 'search',
          canClear: true,
          className: 'col s6',
          style: 'height: 50px',
          label: t('SEARCH'),
          onchange: () => {},
          iconName: 'filter_alt',
          defaultValue: attributeFilter,
          oninput: (v) => {
            actions.setAttributeFilter(v);
          },
        }),

        !edit &&
          m(FlatButton, {
            label: t('TREE_VIEW', showTree ? 'HIDE' : 'SHOW'),
            iconName: showTree ? 'view_list' : 'account_tree',
            className: 'right small',
            onclick: () => {
              showTree = !showTree;
            },
          }),
        isAdmin && [
          m(FlatButton, {
            label: edit ? t('SAVE_BUTTON', 'LABEL') : t('EDIT_BUTTON', 'LABEL'),
            iconName: edit ? 'save' : 'edit',
            className: 'right small',
            onclick: () => {
              if (!edit) {
                edit = true;
                storedModel = deepCopy(model);
                return;
              }

              const removedItems = findRemovedTaxonomyItems(storedModel, model);
              const usages = collectTaxonomyReferenceUsages(model);
              const impacts = removedItems.flatMap((item) => {
                const paths = usages
                  .filter(({ taxonomy, itemId }) => taxonomy === item.taxonomy && itemId === item.id)
                  .map(({ path }) => path.join(' › '));
                return paths.length > 0
                  ? [`${taxonomyLabel(item.taxonomy)} "${item.label}": ${paths.join('; ')}`]
                  : [];
              });
              if (
                impacts.length > 0 &&
                !window.confirm(text(t('DELETE_REFERENCED_ITEMS_CONFIRM', { details: impacts.join('\n') })))
              ) {
                return;
              }

              edit = false;
              const cleanedModel = removeTaxonomyReferences(model, removedItems);
              cleanedModel.cast.sort(sortByLabel);
              cleanedModel.attributes.sort(sortByLabel);
              cleanedModel.products.sort(sortByLabel);
              cleanedModel.transports.sort(sortByLabel);
              cleanedModel.locations.sort(sortByLabel);
              cleanedModel.geoLocations.sort(sortByLabel);
              cleanedModel.partners.sort(sortByLabel);
              actions.saveModel(cleanedModel);
            },
          }),
          edit &&
            m(FlatButton, {
              label: t('CANCEL'),
              iconName: 'cancel',
              className: 'right small',
              onclick: () => {
                edit = false;
                actions.saveModel(storedModel);
              },
            }),
        ],
        m(Tabs, {
          tabWidth: 'auto',
          tabs: tabs.map(([id, label, desc, type, iconName, attr], _i) => {
            return {
              id: label.replace('è', 'e'),
              active: selectedId ? attr.some((a) => a.id === selectedId) : undefined,
              title: `${attr.length ? `${attr.length} ` : ''}${label}`,
              vnode: edit
                ? m(LayoutForm, {
                    form: attrForm(id, label, attr, type),
                    obj: model,
                  } as FormAttributes<any>)
                : m(
                    'div',
                    desc && m(SlimdownView, { md: desc }),
                    showTree
                      ? m(TreeView, { data: attr, rootLabel: label, className: 'col s12 ' })
                      : m(AttrView, {
                          attr,
                          selectedId,
                          type,
                          iconName,
                          crimeScripts,
                          setLocation: actions.setLocation,
                        })
                  ),
            };
          }),
        })
      );
    },
  };
};

const AttrView: FactoryComponent<{
  attr: Array<Hierarchical & Labelled>;
  selectedId?: ID;
  type: AttributeType;
  iconName?: string;
  crimeScripts: CrimeScript[];
  setLocation: (currentCrimeScriptId: ID, actId: ID, phaseId: ID) => void;
}> = () => {
  return {
    oncreate: ({ attrs: { selectedId } }) => {
      selectedId && scrollToActiveItem(selectedId);
    },
    view: ({ attrs: { attr, type, iconName, crimeScripts, setLocation, selectedId } }) => {
      return m(
        '.attr',
        m(Collapsible, {
          items: attr
            .sort((a, b) => a.label?.localeCompare(b.label))
            .map((c) => {
              const searchResults = crimeScripts.reduce((acc, cs, crimeScriptIdx) => {
                if (type === 'products') {
                  if (cs.productIds && cs.productIds.includes(c.id)) {
                    acc.push([crimeScriptIdx, -1, -1, SearchScore.EXACT_MATCH]);
                    return acc;
                  }
                }
                cs.stages?.forEach((scene, sceneIdx) => {
                  scene.variants.forEach((act, variantIdx) => {
                    if (type === 'locations') {
                      if (act.locationIds && act.locationIds.includes(c.id)) {
                        acc.push([crimeScriptIdx, sceneIdx, variantIdx, SearchScore.EXACT_MATCH, act.label]);
                      }
                    } else if (type === 'partners') {
                      act.measures
                        ?.filter((m) => m.partners?.includes(c.id))
                        .forEach((m) => {
                          acc.push([crimeScriptIdx, sceneIdx, variantIdx, SearchScore.EXACT_MATCH, m.label]);
                        });
                    } else {
                      act.activities?.forEach((activity) => {
                        if (type === 'cast') {
                          const { cast = [] } = activity;
                          if (cast.includes(c.id)) {
                            acc.push([crimeScriptIdx, sceneIdx, variantIdx, SearchScore.EXACT_MATCH, activity.label]);
                          }
                        } else if (type === 'attributes') {
                          const { attributes = [] } = activity;
                          if (attributes.includes(c.id)) {
                            acc.push([crimeScriptIdx, sceneIdx, variantIdx, SearchScore.EXACT_MATCH, activity.label]);
                          }
                        } else if (type === 'transports') {
                          const { transports = [] } = activity;
                          if (transports.includes(c.id)) {
                            acc.push([crimeScriptIdx, sceneIdx, variantIdx, SearchScore.EXACT_MATCH, activity.label]);
                          }
                        }
                      });
                    }
                  });
                });
                return acc;
              }, [] as FlexSearchResult[]);

              return {
                header: m.trust(
                  `${c.label}${c.synonyms ? ` (${c.synonyms.join(', ')})` : ''}, hits: ${searchResults.length}${
                    c.parents
                      ? `<br>${attr
                          .filter((a) => c.parents!.includes(a.id))
                          .map((a) => a.label)
                          .join(', ')}`
                      : ''
                  }`
                ),
                active: c.id === selectedId,
                iconName,
                body: m(
                  '.cast-content',
                  c.description && m(SlimdownView, { md: `*${t('DESCRIPTION').toUpperCase()}:* ${c.description}` }),
                  m(
                    'ol',
                    Object.entries(
                      searchResults.reduce((grouped, result) => {
                        const [crimeScriptIdx, sceneIdx, variantIdx] = result;
                        const key = `${crimeScriptIdx}-${sceneIdx}-${variantIdx}`;

                        if (!grouped[key]) {
                          grouped[key] = {
                            crimeScript: crimeScripts[crimeScriptIdx],
                            sceneIdx,
                            variantIdx,
                            act: crimeScripts[crimeScriptIdx].stages[sceneIdx]?.variants[variantIdx],
                          };
                        }
                        return grouped;
                      }, {} as Record<string, { crimeScript: CrimeScript; sceneIdx: number; variantIdx: number; act?: Act }>)
                    ).map(([_, { crimeScript, sceneIdx, act }], i) => {
                      const actLabel = act ? act.label : '...';

                      return m('li', { id: i === 0 ? c.id : undefined }, [
                        m(
                          'a.truncate',
                          {
                            style: { cursor: 'pointer' },
                            href: routingSvc.href(Pages.CRIME_SCRIPT, `id=${crimeScript.id}`),
                            onclick: () => {
                              const scene = crimeScript.stages[sceneIdx];
                              if (scene && act) setLocation(crimeScript.id, act.id, scene.id);
                            },
                          },
                          `${crimeScript.label} > ${actLabel}`
                        ),
                      ]);
                    })
                  )
                ),
              };
            }),
        })
      );
    },
  };
};

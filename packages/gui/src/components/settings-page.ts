import m, { type FactoryComponent } from 'mithril';
import { Collapsible, FlatButton, Select, Tabs, TextInput } from 'mithril-materialized';
import { deepCopy, type FormAttributes, LayoutForm, SlimdownView } from 'mithril-ui-form';
import {
  type Cast,
  type CrimeScript,
  type DataModel,
  type FlexSearchResult,
  findTaxonomyScriptUsages,
  type Hierarchical,
  type ID,
  type Labelled,
  type TaxonomyName,
  collectTaxonomyReferenceUsages,
  findTaxonomyForItem,
  findRemovedTaxonomyItems,
  mergeTaxonomyItems,
  Pages,
  removeTaxonomyReferences,
  SearchScore,
} from '../models';
import { attrForm } from '../models/forms';
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
  let activeTab: TaxonomyName | undefined;
  let showTree = false;
  let categoryFilter: { taxonomy: TaxonomyName; id: ID } | undefined;
  let mergeSourceId: ID | undefined;
  let mergeTargetId: ID | undefined;

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
      const selectedTabId = activeTab || findTaxonomyForItem(model, selectedId);

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
          id: TaxonomyName,
          label: string,
          description: string,
          type: TaxonomyName,
          iconName: string,
          attrs: Array<Hierarchical & Labelled>
        ]
      >;

      return m(
        '#settings-page.settings.page.row',
        m('.right-align.settings-page-actions', [
          !edit &&
            m(FlatButton, {
              label: t('TREE_VIEW', showTree ? 'HIDE' : 'SHOW'),
              iconName: showTree ? 'view_list' : 'account_tree',
              className: 'small',
              onclick: () => {
                showTree = !showTree;
              },
            }),
          isAdmin && [
            m(FlatButton, {
              label: edit ? t('SAVE_BUTTON', 'LABEL') : t('EDIT_BUTTON', 'LABEL'),
              iconName: edit ? 'save' : 'edit',
              className: 'small',
              onclick: () => {
                if (!edit) {
                  edit = true;
                  categoryFilter = undefined;
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
                className: 'small',
                onclick: () => {
                  edit = false;
                  actions.saveModel(storedModel);
                },
              }),
          ],
        ]),
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
        m(Tabs, {
          tabWidth: 'auto',
          selectedTabId,
          onTabChange: (id) => {
            activeTab = id as TaxonomyName;
            selectedId = undefined;
          },
          tabs: tabs.map(([id, label, desc, type, iconName, attr]) => {
            const activeCategoryItem = categoryFilter?.taxonomy === id
              ? model[id].find((item) => item.id === categoryFilter?.id)
              : undefined;
            const activeCategory = activeCategoryItem?.id;
            const visible = activeCategory
              ? attr.filter((item) => item.id === activeCategory || item.parents?.includes(activeCategory))
              : attr;
            return {
              id,
              title: `${visible.length ? `${visible.length} ` : ''}${label}`,
              vnode: edit
                ? m('div', [
                  m('.taxonomy-merge', [
                    m('span', t('MERGE_ITEMS')),
                    m(Select<ID>, {
                      label: t('MERGE_SOURCE'),
                      checkedId: mergeSourceId,
                      options: attr.filter(({ id }) => id !== mergeTargetId),
                      onchange: ([value]) => { mergeSourceId = value; },
                    }),
                    m(Select<ID>, {
                      label: t('MERGE_TARGET'),
                      checkedId: mergeTargetId,
                      options: attr.filter(({ id }) => id !== mergeSourceId),
                      onchange: ([value]) => { mergeTargetId = value; },
                    }),
                    m(FlatButton, {
                      label: t('MERGE_ITEMS'),
                      iconName: 'merge',
                      disabled: !mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId ||
                        !attr.some(({ id }) => id === mergeSourceId) || !attr.some(({ id }) => id === mergeTargetId),
                      onclick: () => {
                        const source = attr.find(({ id }) => id === mergeSourceId);
                        const target = attr.find(({ id }) => id === mergeTargetId);
                        if (!source || !target) return;
                        if (!window.confirm(text(t('MERGE_ITEMS_CONFIRM', { source: source.label, target: target.label })))) return;
                        actions.update({ model: mergeTaxonomyItems(model, id, source.id, target.id) });
                        mergeSourceId = undefined;
                        mergeTargetId = undefined;
                      },
                    }),
                  ]),
                  m(LayoutForm, {
                    form: attrForm(id, label, attr, type),
                    obj: model,
                  } as FormAttributes<any>),
                ])
                : m(
                    'div',
                    activeCategoryItem && m('.taxonomy-filter-bar',
                      m('button[type=button].taxonomy-active-filter', {
                        'aria-label': text(t('CLEAR_CATEGORY_FILTER', { category: activeCategoryItem.label })),
                        onclick: () => { categoryFilter = undefined; },
                      }, [
                        m('span', t('ACTIVE_CATEGORY_FILTER', { category: activeCategoryItem.label })),
                        m('i.material-icons[aria-hidden=true]', 'close'),
                      ])
                    ),
                    desc && m(SlimdownView, { md: desc }),
                    showTree
                      ? m(TreeView, {
                          data: visible,
                          rootLabel: label,
                          className: 'col s12 ',
                          onselect: (itemId) => {
                            selectedId = itemId;
                            activeTab = id;
                            showTree = false;
                          },
                        })
                      : m(AttrView, {
                          attr: visible,
                          selectedId,
                          type,
                          iconName,
                          crimeScripts,
                          model,
                          setLocation: actions.setLocation,
                          allItems: model[id],
                          onCategory: (categoryId) => {
                            categoryFilter = { taxonomy: id, id: categoryId };
                            actions.setAttributeFilter('');
                          },
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
  type: TaxonomyName;
  iconName?: string;
  crimeScripts: CrimeScript[];
  model: DataModel;
  allItems: Array<Hierarchical & Labelled>;
  setLocation: (currentCrimeScriptId: ID, actId: ID, phaseId: ID, activityId?: ID) => void;
  onCategory: (categoryId: ID) => void;
}> = () => {
  let lastScrolledId: ID | undefined;
  const scrollToSelected = (selectedId: ID | undefined, type: TaxonomyName) => {
    if (selectedId !== lastScrolledId) {
      lastScrolledId = selectedId;
      if (selectedId) scrollToActiveItem(`taxonomy-${type}-${selectedId}`);
    }
  };
  return {
    oncreate: ({ attrs: { selectedId, type } }) => scrollToSelected(selectedId, type),
    onupdate: ({ attrs: { selectedId, type } }) => scrollToSelected(selectedId, type),
    view: ({ attrs: { attr, type, iconName, crimeScripts, model, setLocation, selectedId, onCategory, allItems } }) => {
      return m(
        '.attr',
        m(Collapsible, {
          items: attr
            .sort((a, b) => a.label?.localeCompare(b.label))
            .map((c) => {
              const searchResults: FlexSearchResult[] = findTaxonomyScriptUsages(model, type, c.id).map((usage) => {
                const crimeScriptIdx = crimeScripts.indexOf(usage.script);
                const sceneIdx = usage.sceneId
                  ? usage.script.stages.findIndex(({ id }) => id === usage.sceneId) : -1;
                const variantIdx = sceneIdx >= 0
                  ? usage.script.stages[sceneIdx].variants.findIndex(({ id }) => id === usage.variantId) : -1;
                return [crimeScriptIdx, sceneIdx, variantIdx, SearchScore.EXACT_MATCH, usage.label, usage.activityId];
              });

              const byScript = new Map<number, Map<number, FlexSearchResult[]>>();
              searchResults.forEach((result) => {
                const [scriptIdx, sceneIdx] = result;
                if (!byScript.has(scriptIdx)) byScript.set(scriptIdx, new Map());
                const scenes = byScript.get(scriptIdx)!;
                scenes.set(sceneIdx, [...(scenes.get(sceneIdx) || []), result]);
              });
              return {
                header: m('.taxonomy-item-header', { id: `taxonomy-${type}-${c.id}` }, [
                  m('.taxonomy-item-heading', [
                    m('span', `${c.label}${c.synonyms?.length ? ` (${c.synonyms.join(', ')})` : ''} · ${text(t('HIT_COUNT', { count: searchResults.length }))}`),
                    c.parents?.map((parentId) => {
                      const parent = allItems.find(({ id }) => id === parentId);
                      if (!parent) return undefined;
                      const siblings = allItems.filter((item) => item.parents?.includes(parentId) && item.id !== c.id);
                      return m('button[type=button].taxonomy-category', {
                        title: siblings.length
                          ? text(t('CATEGORY_SIBLINGS', { items: siblings.map(({ label }) => label).join(', ') }))
                          : parent.label,
                        onclick: (event: MouseEvent) => {
                          event.stopPropagation();
                          onCategory(parentId);
                        },
                      }, parent.label);
                    }),
                  ]),
                  c.description && m('.taxonomy-item-description', m(SlimdownView, { md: c.description })),
                ]),
                active: c.id === selectedId,
                iconName,
                body: m(
                  '.cast-content',
                  m(
                    'ul.taxonomy-script-hits',
                    Array.from(byScript, ([scriptIdx, scenes]) => {
                      const script = crimeScripts[scriptIdx];
                      const total = Array.from(scenes.values()).reduce((count, hits) => count + hits.length, 0);
                      return m('li', [
                        m('a', { href: routingSvc.href(Pages.CRIME_SCRIPT, `id=${script.id}`) },
                          `${script.label} · ${text(t('HIT_COUNT', { count: total }))}`),
                        m('ul.taxonomy-scene-hits', Array.from(scenes, ([sceneIdx, hits]) => {
                          const scene = script.stages[sceneIdx];
                          if (!scene) return m('li', t('HIT_COUNT', { count: hits.length }));
                          return m('li', [
                            m('span', `${scene.label} · ${text(t('HIT_COUNT', { count: hits.length }))}`),
                            m('ul', hits.map(([, , variantIdx, , hitLabel, activityId]) => {
                              const variant = scene.variants[variantIdx];
                              return m('li', m('a', {
                                href: routingSvc.href(Pages.CRIME_SCRIPT, `id=${script.id}`),
                                onclick: () => {
                                  if (variant) setLocation(script.id, variant.id, scene.id, activityId);
                                },
                              }, hitLabel || variant?.label || scene.label));
                            })),
                          ]);
                        })),
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

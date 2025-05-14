import m, { FactoryComponent } from 'mithril';
import {
  CrimeScript,
  ID,
  Pages,
  Act,
  Hierarchical,
  Labelled,
  DataModel,
  FlexSearchResult,
  SearchScore,
  Cast,
} from '../models';
import { MeiosisComponent, routingSvc, t } from '../services';
import { deepCopy, FormAttributes, LayoutForm } from 'mithril-ui-form';
import { Collapsible, FlatButton, Tabs } from 'mithril-materialized';
import { attrForm, AttributeType } from '../models/forms';
import { TextInputWithClear } from './ui/text-input-with-clear';
import { scrollToActiveItem, sortByLabel } from '../utils';
import { TreeView } from './ui/treeview';

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
        acts = [],
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
        ['cast', t('CAST'), 'cast', 'person', cast.filter(labelFlt)],
        ['attributes', t('ATTRIBUTES'), 'attributes', 'build', attributes.filter(labelFlt)],
        ['products', t('PRODUCTS', 2), 'products', 'shopping_bag', products.filter(labelFlt)],
        ['transports', t('TRANSPORTS'), 'transports', 'directions', transports.filter(labelFlt)],
        ['locations', t('LOCATIONS', 2), 'locations', 'warehouse', locations.filter(labelFlt)],
        ['geoLocations', t('GEOLOCATIONS', 2), 'geoLocations', 'location_on', geoLocations.filter(labelFlt)],
        [
          'partners',
          t('PARTNERS'),
          'partners',
          'handshake', // groups
          partners.filter(labelFlt),
        ],
      ] as Array<
        [id: AttributeType, label: string, type: AttributeType, iconName: string, attrs: Array<Hierarchical & Labelled>]
      >;

      return m(
        '#settings-page.settings.page.row',
        m(TextInputWithClear, {
          id: 'search',
          className: 'col s6',
          style: 'height: 50px',
          label: t('SEARCH'),
          onchange: () => {},
          iconName: 'filter_alt',
          initialValue: attributeFilter,
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
              edit = !edit;
              if (edit) {
                storedModel = deepCopy(model);
              } else {
                model.cast?.sort(sortByLabel);
                model.attributes?.sort(sortByLabel);
                model.products?.sort(sortByLabel);
                model.transports?.sort(sortByLabel);
                model.locations?.sort(sortByLabel);
                model.geoLocations?.sort(sortByLabel);
                model.partners?.sort(sortByLabel);
                actions.saveModel(model);
              }
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
          tabs: tabs.map(([id, label, type, iconName, attr], _i) => {
            return {
              id: label.replace('è', 'e'),
              active: selectedId ? attr.some((a) => a.id === selectedId) : undefined,
              title: `${attr.length ? `${attr.length} ` : ''}${label}`,
              vnode: edit
                ? m(LayoutForm, {
                    form: attrForm(id, label, attr, type),
                    obj: model,
                  } as FormAttributes<any>)
                : showTree
                ? m(TreeView, { data: attr, rootLabel: label, className: 'col s12 ' })
                : m(AttrView, {
                    attr,
                    selectedId,
                    type,
                    iconName,
                    acts,
                    crimeScripts,
                    setLocation: actions.setLocation,
                  }),
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
  acts: Act[];
  crimeScripts: CrimeScript[];
  setLocation: (currentCrimeScriptId: ID, actIdx: number, phaseIdx: number) => void;
}> = () => {
  return {
    oncreate: ({ attrs: { selectedId } }) => {
      selectedId && scrollToActiveItem(selectedId);
    },
    view: ({ attrs: { attr, type, iconName, acts, crimeScripts, setLocation, selectedId } }) => {
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
                cs.stages?.forEach(({ ids = [] }) => {
                  ids.forEach((actId) => {
                    const actIdx = acts.findIndex((a) => a.id === actId);
                    if (actIdx < 0) return;
                    const act = acts[actIdx];
                    if (type === 'locations') {
                      if (act.locationIds && act.locationIds.includes(c.id)) {
                        acc.push([crimeScriptIdx, actIdx, 0, SearchScore.EXACT_MATCH, act.label]);
                      }
                    } else if (type === 'partners') {
                      act.measures
                        ?.filter((m) => m.partners?.includes(c.id))
                        .forEach((m) => {
                          acc.push([crimeScriptIdx, actIdx, 0, SearchScore.EXACT_MATCH, m.label]);
                        });
                    } else {
                      act.activities?.forEach((activity) => {
                        if (type === 'cast') {
                          const { cast = [] } = activity;
                          if (cast.includes(c.id)) {
                            acc.push([crimeScriptIdx, actIdx, 0, SearchScore.EXACT_MATCH, activity.label]);
                          }
                        } else if (type === 'attributes') {
                          const { attributes = [] } = activity;
                          if (attributes.includes(c.id)) {
                            acc.push([crimeScriptIdx, actIdx, 0, SearchScore.EXACT_MATCH, activity.label]);
                          }
                        } else if (type === 'transports') {
                          const { transports = [] } = activity;
                          if (transports.includes(c.id)) {
                            acc.push([crimeScriptIdx, actIdx, 0, SearchScore.EXACT_MATCH, activity.label]);
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
                  m(
                    'ol',
                    Object.entries(
                      searchResults.reduce((grouped, result) => {
                        const [crimeScriptIdx, actIdx, phaseIdx, score, desc] = result;
                        const key = `${crimeScriptIdx}-${actIdx}`;

                        if (!grouped[key]) {
                          grouped[key] = {
                            crimeScript: crimeScripts[crimeScriptIdx],
                            actIdx,
                            act: actIdx >= 0 ? acts[actIdx] : undefined,
                            phases: [],
                          };
                        }

                        grouped[key].phases.push({ phaseIdx, score, desc });
                        return grouped;
                      }, {} as Record<string, { crimeScript: CrimeScript; actIdx: number; act?: Act; phases: { phaseIdx: number; score: number; desc?: string }[] }>)
                    ).map(([_, { crimeScript, actIdx, act, phases }], i) => {
                      const actLabel = act ? act.label : '...';

                      return m('li', { id: i === 0 ? c.id : undefined }, [
                        m(
                          'a.truncate',
                          {
                            style: { cursor: 'pointer' },
                            href: routingSvc.href(Pages.CRIME_SCRIPT, `id=${crimeScript.id}`),
                            onclick: () => {
                              const defaultPhase = phases[0];
                              setLocation(crimeScript.id, actIdx, defaultPhase.phaseIdx);
                            },
                          },
                          `${crimeScript.label} > ${actLabel}`
                        ),
                        phases.length >= 1 &&
                          m(
                            'ol[type=a]',
                            phases.map(({ phaseIdx, desc }) =>
                              m(
                                'li',
                                {
                                  style: {
                                    opacity: 0.7,
                                    cursor: 'pointer',
                                  },
                                  onclick: () => {
                                    setLocation(crimeScript.id, actIdx, phaseIdx);
                                  },
                                },
                                `${desc ? desc : ''}`
                              )
                            )
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

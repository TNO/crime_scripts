import m, { FactoryComponent } from 'mithril';
import {
  CrimeScript,
  ID,
  Pages,
  Act,
  Hierarchical,
  Labeled,
  DataModel,
  FlexSearchResult,
  SearchScore,
} from '../models';
import { MeiosisComponent, routingSvc, t } from '../services';
import { deepCopy, FormAttributes, LayoutForm } from 'mithril-ui-form';
import { Collapsible, FlatButton, Tabs } from 'mithril-materialized';
import { attrForm, AttributeType } from '../models/forms';
import { TextInputWithClear } from './ui/text-input-with-clear';
import { sortByLabel } from '../utils';

export const SettingsPage: MeiosisComponent = () => {
  let edit = false;
  let storedModel: DataModel;

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

      setPage(Pages.SETTINGS);
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
        serviceProviders = [],
      } = model;

      const labelFilter = attributeFilter ? attributeFilter.toLowerCase() : undefined;

      const isAdmin = role === 'admin';

      const tabs = [
        [
          'cast',
          t('CAST'),
          'cast',
          'person',
          cast.filter((a) => !labelFilter || (a.label && a.label.toLowerCase().includes(labelFilter))),
        ],
        [
          'serviceProviders',
          t('SERVICE_PROVIDERS'),
          'serviceProviders',
          'business',
          serviceProviders.filter((a) => !labelFilter || (a.label && a.label.toLowerCase().includes(labelFilter))),
        ],
        [
          'attributes',
          t('ATTRIBUTES'),
          'attributes',
          'build',
          attributes.filter((a) => !labelFilter || (a.label && a.label.toLowerCase().includes(labelFilter))),
        ],
        [
          'products',
          t('PRODUCTS', 2),
          'products',
          'shopping_bag',
          products.filter((a) => !labelFilter || (a.label && a.label.toLowerCase().includes(labelFilter))),
        ],
        [
          'transports',
          t('TRANSPORTS'),
          'transports',
          'directions',
          transports.filter((a) => !labelFilter || (a.label && a.label.toLowerCase().includes(labelFilter))),
        ],
        [
          'locations',
          t('LOCATIONS', 2),
          'locations',
          'warehouse',
          locations.filter((a) => !labelFilter || (a.label && a.label.toLowerCase().includes(labelFilter))),
        ],
        [
          'geoLocations',
          t('GEOLOCATIONS', 2),
          'geoLocations',
          'location_on',
          geoLocations.filter((a) => !labelFilter || (a.label && a.label.toLowerCase().includes(labelFilter))),
        ],
        [
          'partners',
          t('PARTNERS'),
          'partners',
          'handshake', // groups
          partners.filter((a) => !labelFilter || (a.label && a.label.toLowerCase().includes(labelFilter))),
        ],
      ] as Array<
        [id: AttributeType, label: string, type: AttributeType, iconName: string, attrs: Array<Hierarchical & Labeled>]
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
                model.serviceProviders?.sort(sortByLabel);
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
          tabs: tabs.map(([id, label, type, iconName, attr]) => {
            return {
              id: label.replace('è', 'e'),
              title: `${attr.length ? `${attr.length} ` : ''}${label}`,
              vnode: edit
                ? m(LayoutForm, {
                    form: attrForm(id, label, attr, type),
                    obj: model,
                  } as FormAttributes<any>)
                : m(AttrView, {
                    attr,
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
  attr: Array<Hierarchical & Labeled>;
  type: AttributeType;
  iconName?: string;
  acts: Act[];
  crimeScripts: CrimeScript[];
  setLocation: (currentCrimeScriptId: ID, actIdx: number, phaseIdx: number) => void;
}> = () => {
  return {
    view: ({ attrs: { attr, type, iconName, acts, crimeScripts, setLocation } }) => {
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
                        } else if (type === 'serviceProviders') {
                          const { sp = [] } = activity;
                          if (sp.includes(c.id)) {
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
                    ).map(([_, { crimeScript, actIdx, act, phases }]) => {
                      const actLabel = act ? act.label : '...';

                      return m('li', [
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
                  // m(
                  //   'ol',
                  //   searchResults.map(([crimeScriptIdx, actIdx, phaseIdx]) => {
                  //     const crimeScript = crimeScripts[crimeScriptIdx];
                  //     const act = actIdx >= 0 ? acts[actIdx] : undefined;
                  //     const actLabel = act ? act.label : '...';

                  //     return m('li', [
                  //       m(
                  //         'a.truncate',
                  //         {
                  //           style: { cursor: 'pointer' },
                  //           href: routingSvc.href(Pages.CRIME_SCRIPT, `id=${crimeScript.id}`),
                  //           onclick: () => {
                  //             setLocation(crimeScript.id, actIdx, phaseIdx);
                  //           },
                  //         },
                  //         `${crimeScript.label} > ${actLabel}`
                  //       ),
                  //     ]);
                  //   })
                  // )
                ),
              };
            }),
        })
      );
    },
  };
};

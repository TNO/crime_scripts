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
        opportunities = [],
        indicators = [],
        barriers = [],
        partners = [],
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
          'opportunities',
          t('OPPORTUNITIES'),
          'opportunities',
          'lightbulb',
          opportunities.filter((a) => !labelFilter || (a.label && a.label.toLowerCase().includes(labelFilter))),
        ],
        [
          'indicators',
          t('INDICATORS'),
          'indicators',
          'light_mode',
          indicators.filter((a) => !labelFilter || (a.label && a.label.toLowerCase().includes(labelFilter))),
        ],
        [
          'partners',
          t('PARTNERS'),
          'partners',
          'handshake', // groups
          partners.filter((a) => !labelFilter || (a.label && a.label.toLowerCase().includes(labelFilter))),
        ],
        [
          'barriers',
          t('BARRIERS'),
          'barriers',
          'block',
          barriers.filter((a) => !labelFilter || (a.label && a.label.toLowerCase().includes(labelFilter))),
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
          tabWidth: 'fixed',
          tabs: tabs.map(([id, label, type, iconName, attr]) => {
            return {
              id: label.replace('è', 'e'),
              title: `${attr.length ? `${attr.length} ` : ''}${label}`,
              vnode: edit
                ? m(LayoutForm, {
                    form: attrForm(id, label, type === 'barriers' ? partners : attr, type),
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
                cs.stages?.forEach(({ ids }) => {
                  ids.forEach((actId) => {
                    const actIdx = acts.findIndex((a) => a.id === actId);
                    if (actIdx < 0) return;
                    const act = acts[actIdx];
                    [{ ...act }].forEach((phase, phaseIdx) => {
                      if (type === 'locations') {
                        if (phase.locationIds) {
                          acc.push([crimeScriptIdx, actIdx, phaseIdx, SearchScore.EXACT_MATCH]);
                        }
                      } else {
                        phase.activities?.forEach((activity) => {
                          if (type === 'cast') {
                            const { cast = [] } = activity;
                            if (cast.includes(c.id)) {
                              acc.push([crimeScriptIdx, actIdx, phaseIdx, SearchScore.EXACT_MATCH]);
                            }
                          } else if (type === 'attributes') {
                            const { attributes = [] } = activity;
                            if (attributes.includes(c.id)) {
                              acc.push([crimeScriptIdx, actIdx, phaseIdx, SearchScore.EXACT_MATCH]);
                            }
                          }
                        });
                      }
                    });
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
                    searchResults.map(([crimeScriptIdx, actIdx, phaseIdx]) => {
                      const crimeScript = crimeScripts[crimeScriptIdx];
                      const act = actIdx >= 0 ? acts[actIdx] : undefined;
                      const actLabel = act ? act.label : '...';

                      return m('li', [
                        m(
                          'a.truncate',
                          {
                            style: { cursor: 'pointer' },
                            href: routingSvc.href(Pages.CRIME_SCRIPT, `id=${crimeScript.id}`),
                            onclick: () => {
                              setLocation(crimeScript.id, actIdx, phaseIdx);
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

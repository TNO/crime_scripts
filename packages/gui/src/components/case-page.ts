import m from 'mithril';
import { TextInput } from 'mithril-materialized';
import { type FormAttributes, LayoutForm, type UIForm } from 'mithril-ui-form';
import { type CrimeScriptFilter, Pages } from '../models';
import { attributeFilterFormFactory, crimeScriptFilterFormFactory } from '../models/forms';
import { I18N, type MeiosisComponent, routingSvc, t } from '../services';

export const CasePage: MeiosisComponent = () => {
  let crimeScriptFilterForm: UIForm<CrimeScriptFilter>;

  return {
    oninit: ({
      attrs: {
        state: { model },
        actions: { setPage },
      },
    }) => {
      const { products = [], geoLocations = [], locations = [], cast = [], attributes = [], transports = [] } = model;
      crimeScriptFilterForm = [
        ...crimeScriptFilterFormFactory(products, locations, geoLocations, 'search'),
        ...attributeFilterFormFactory(cast, attributes, transports, 'search'),
      ] as UIForm<CrimeScriptFilter>;
      setPage(Pages.CASE);
    },
    view: ({ attrs: { state, actions } }) => {
      const { caseResults = [], caseFilter, crimeScriptFilter = {} as CrimeScriptFilter, model } = state;
      const { update } = actions;

      return m('#case-page.row.case.page', [
        m(LayoutForm, {
          form: crimeScriptFilterForm,
          obj: crimeScriptFilter,
          onchange: () => {
            actions.update({ crimeScriptFilter });
          },
          i18n: I18N,
        } as FormAttributes<CrimeScriptFilter>),
        m('.col.s12', [
          m(TextInput, {
            label: t('FOUND_ITEMS'),
            iconName: 'search',
            className: 'center-align',
            defaultValue: caseFilter,
            onchange: (v) => {
              // const caseTags = tags.map((tag) => tag.tag);
              update({ caseFilter: v });
            },
          }),
        ]),
        caseResults &&
          m('.col.s12', [
            m('p', t('HITS', caseResults.length)),
            caseResults.length > 0 && [
              m(
                'ol',
                caseResults.map(({ crimeScriptIdx, totalScore, acts }) =>
                  m(
                    'li',
                    `${model.crimeScripts[crimeScriptIdx].label} (score ${totalScore})`,
                    m(
                      'ul.browser-default',
                      acts.map(({ actIdx, phaseIdx, score }) =>
                        m(
                          'li',
                          m(
                            'a.truncate',
                            {
                              style: { cursor: 'pointer' },
                              href: routingSvc.href(Pages.CRIME_SCRIPT, `id=${model.crimeScripts[crimeScriptIdx].id}`),
                              onclick: () => {
                                actions.setLocation(
                                  model.crimeScripts[crimeScriptIdx].id,
                                  String(actIdx),
                                  String(phaseIdx)
                                );
                              },
                            },
                            `${actIdx >= 0 ? model.acts[actIdx].label : t('TEXT')} (score: ${score})`
                          )
                        )
                      )
                    )
                  )
                )
              ),
            ],
          ]),
      ]);
    },
  };
};

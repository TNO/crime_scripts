import m from 'mithril';
import { Act, CrimeScript, Labelled, Pages } from '../models';
import { MeiosisComponent } from '../services';
import { FlatButton, ModalPanel } from 'mithril-materialized';
import { t } from '../services/translations';
import { toWord } from '../utils/word';
import { formatDate, toJSON } from '../utils';
import { CrimeScriptEditor } from './ui/crime-script-editor';
import { CrimeScriptViewer } from './ui/crime-script-viewer';

export const CrimeScriptPage: MeiosisComponent = () => {
  let id = '';
  let edit = false;

  return {
    oninit: ({
      attrs: {
        actions: { setPage },
      },
    }) => {
      if (m.route.param('edit') === '1') {
        edit = true;
      }
      setPage(Pages.CRIME_SCRIPT);
    },
    view: ({ attrs: { state, actions } }) => {
      const { model, role, curActId, curSceneId, currentCrimeScriptId = '', searchFilter } = state;
      const {
        crimeScripts = [],
        cast = [],
        acts = [],
        attributes = [],
        locations = [],
        geoLocations = [],
        transports = [],
        products = [],
        partners = [],
      } = model;
      id = m.route.param('id') || currentCrimeScriptId || (crimeScripts.length > 0 ? crimeScripts[0].id : '');
      const crimeScript =
        crimeScripts.find((c) => c.id === id) || (crimeScripts.length > 0 ? crimeScripts[0] : ({} as CrimeScript));

      const isEditor = role === 'admin' || role === 'editor';

      const filename = `${formatDate(Date.now(), '')}_${crimeScript?.label}_v${model.version}.docx`.replace(/\s/g, '_');

      const curScene =
        crimeScript.stages && curSceneId ? crimeScript.stages.find((s) => s.id === curSceneId) : undefined;
      const curAct =
        curScene && curScene.ids && curActId && curScene.ids.includes(curActId)
          ? acts.find((a) => a.id === curActId) || (curScene.ids[0] && acts.find((a) => a.id === curScene.ids[0]))
          : undefined;

      return m(
        '#crime-script.page',
        [
          m(
            '.right-align',
            isEditor && [
              edit
                ? m(FlatButton, {
                    label: t('SAVE_SCRIPT'),
                    iconName: 'save',
                    className: 'small',
                    onclick: () => {
                      edit = false;
                      if (crimeScript) {
                        model.crimeScripts = model.crimeScripts.map((c) => (c.id === id ? crimeScript : c));
                        // console.log(model.cast.map((c) => c.label).join(', '));
                        // actions.saveModel(model);
                      }
                    },
                  })
                : [
                    m(FlatButton, {
                      label: t('EDIT_SCRIPT'),
                      iconName: 'edit',
                      className: 'small',
                      onclick: () => {
                        edit = true;
                      },
                    }),
                    m(FlatButton, {
                      label: t('DELETE_SCRIPT'),
                      iconName: 'delete',
                      className: 'small',
                      modalId: 'deleteScript',
                    }),
                  ],
            ],
            crimeScript && [
              m(FlatButton, {
                label: t('EXPORT_TO_WORD'),
                className: 'small',
                iconName: 'download',
                onclick: () => toWord(filename, crimeScript, model),
              }),
              m(FlatButton, {
                label: t('EXPORT_TO_JSON'),
                className: 'small',
                iconName: 'download',
                onclick: () => toJSON(filename, crimeScript, model),
              }),
            ]
          ),
          crimeScript &&
            m(
              '.row.crime-scene',
              edit
                ? m(CrimeScriptEditor, {
                    crimeScript,
                    model,
                    update: (
                      type: 'crimeScript' | 'cast' | 'attributes' | 'transports' | 'locations' | 'acts',
                      option: Labelled
                    ) => {
                      switch (type) {
                        case 'crimeScript':
                          actions.update({
                            model: (model) => {
                              model.crimeScripts = [
                                option as CrimeScript,
                                ...model.crimeScripts.filter((a) => a.id !== option.id),
                              ];
                              return model;
                            },
                          });
                          break;
                        case 'cast':
                          actions.update({
                            model: (model) => {
                              model.cast = [option, ...model.cast.filter((a) => a.id !== option.id)];
                              return model;
                            },
                          });
                          break;
                        case 'attributes':
                          actions.update({
                            model: (model) => {
                              model.attributes = [option, ...model.attributes.filter((a) => a.id !== option.id)];
                              return model;
                            },
                          });
                          break;
                        case 'transports':
                          actions.update({
                            model: (model) => {
                              model.transports = [option, ...model.transports.filter((a) => a.id !== option.id)];
                              return model;
                            },
                          });
                          break;
                        case 'locations':
                          actions.update({
                            model: (model) => {
                              model.locations = [option, ...model.locations.filter((a) => a.id !== option.id)];
                              return model;
                            },
                          });
                          break;
                        case 'acts':
                          actions.update({
                            model: (model) => {
                              const newAct = { ...option } as Act;
                              model.acts = [newAct, ...model.acts.filter((a) => a.id !== newAct.id)];
                              return model;
                            },
                          });
                          break;
                      }
                      actions.saveModel(model);
                    },
                  })
                : m(CrimeScriptViewer, {
                    crimeScript,
                    cast,
                    acts,
                    attributes,
                    transports,
                    locations,
                    geoLocations,
                    products,
                    partners,
                    curActId: curAct ? curAct.id : undefined,
                    curSceneId: curScene ? curScene.id : undefined,
                    searchFilter,
                    update: actions.update,
                  })
            ),
        ],
        m(ModalPanel, {
          id: 'deleteScript',
          title: t('DELETE_SCRIPT'),
          description: t('DELETE_SCRIPT_CONFIRM', { name: crimeScript?.label }),
          buttons: [
            { label: t('CANCEL'), iconName: 'cancel' },
            {
              label: t('DELETE'),
              iconName: 'delete',
              onclick: () => {
                if (crimeScript) {
                  model.crimeScripts = model.crimeScripts.filter((c) => c.id !== id);
                  actions.saveModel(model);
                  actions.changePage(Pages.HOME);
                }
              },
            },
          ],
        })
      );
    },
  };
};

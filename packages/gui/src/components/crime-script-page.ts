import m from 'mithril';
import { AlertDialog, FlatButton, uniqueId } from 'mithril-materialized';
import {
  classifiedExportFilename,
  createRestrictedCounterpart,
  type CrimeScript,
  detachStarterScript,
  hasRestrictedCounterpart,
  type Labelled,
  Pages,
  scriptsForMode,
} from '../models';
import type { MeiosisComponent } from '../services';
import { t } from '../services/translations';
import { formatDate, toJSON } from '../utils';
import { toWord } from '../utils/word';
import { CrimeScriptEditor } from './ui/crime-script-editor';
import { CrimeScriptViewer } from './ui/crime-script-viewer';

export const CrimeScriptPage: MeiosisComponent = () => {
  let id = '';
  let edit = false;
  let deleteScriptOpen = false;

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
      const { model, role, scriptMode, curActId, curSceneId, currentCrimeScriptId = '', searchFilter } = state;
      const {
        crimeScripts = [],
        cast = [],
        attributes = [],
        locations = [],
        geoLocations = [],
        transports = [],
        products = [],
        partners = [],
      } = model;
      const requestedId = m.route.param('id') || currentCrimeScriptId;
      const requestedFamily = crimeScripts.find(({ id }) => id === requestedId)?.scriptFamilyId;
      const visibleScripts = scriptsForMode(crimeScripts, scriptMode);
      id =
        visibleScripts.find(({ id }) => id === requestedId)?.id ||
        visibleScripts.find(({ scriptFamilyId }) => scriptFamilyId === requestedFamily)?.id ||
        visibleScripts[0]?.id ||
        '';
      const crimeScript =
        crimeScripts.find((c) => c.id === id);
      if (!crimeScript) {
        return m('#crime-script.page', [
          m('p', t('NO_SCRIPTS_MODE')),
          m(FlatButton, {
            label: t('HOME', 'TITLE'),
            iconName: 'home',
            onclick: () => actions.changePage(Pages.HOME),
          }),
        ]);
      }

      const isEditor = role === 'admin' || role === 'editor';

      const filename = crimeScript
        ? classifiedExportFilename(
            `${formatDate(Date.now(), '')}_${crimeScript.label}_v${model.version}`,
            crimeScript.classification,
            'docx'
          )
        : '';
      const confirmRestrictedExport = () =>
        crimeScript.classification !== 'restricted' || window.confirm(t('RESTRICTED_EXPORT_CONFIRM'));

      const curScene =
        crimeScript.stages && curSceneId ? crimeScript.stages.find((s) => s.id === curSceneId) : undefined;
      const curAct =
        curScene && curActId
          ? curScene.variants.find((variant) => variant.id === curActId) || curScene.variants[0]
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
                  crimeScript.classification === 'public' &&
                    m(FlatButton, {
                      label: t('CREATE_RESTRICTED_VERSION'),
                      iconName: 'content_copy',
                      className: 'small',
                      disabled: hasRestrictedCounterpart(model, crimeScript),
                      title: hasRestrictedCounterpart(model, crimeScript)
                        ? t('RESTRICTED_VERSION_EXISTS')
                        : undefined,
                      onclick: () => {
                        const counterpart = createRestrictedCounterpart(model, crimeScript, uniqueId);
                        model.crimeScripts.push(counterpart);
                        actions.saveModel(model);
                        actions.setScriptMode('restricted');
                        edit = true;
                        actions.changePage(Pages.CRIME_SCRIPT, { id: counterpart.id, edit: 1 });
                      },
                    }),
                  m(FlatButton, {
                    label: t('DELETE_SCRIPT'),
                    iconName: 'delete',
                    className: 'small',
                    onclick: () => (deleteScriptOpen = true),
                  }),
                ],
            ],
            crimeScript && [
              crimeScript.starterOrigin &&
                m(FlatButton, {
                  label: t('DETACH_STARTER'),
                  className: 'small',
                  iconName: 'link_off',
                  onclick: () => {
                    const detached = detachStarterScript(crimeScript);
                    model.crimeScripts = model.crimeScripts.map((script) => script.id === crimeScript.id ? detached : script);
                    actions.saveModel(model);
                    actions.changePage(Pages.CRIME_SCRIPT, { id: detached.id });
                  },
                }),
              m(FlatButton, {
                label: t('EXPORT_TO_WORD'),
                className: 'small',
                iconName: 'download',
                onclick: () => {
                  if (confirmRestrictedExport()) toWord(filename, crimeScript, model);
                },
              }),
              m(FlatButton, {
                label: t('EXPORT_TO_JSON'),
                className: 'small',
                iconName: 'download',
                onclick: () => {
                  if (confirmRestrictedExport()) toJSON(filename, crimeScript, model);
                },
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
                scriptMode,
                update: (type: 'crimeScript' | 'cast' | 'attributes' | 'transports' | 'locations', option: Labelled) => {
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
                  }
                  actions.saveModel(model);
                },
              })
              : m(CrimeScriptViewer, {
                crimeScript,
                cast,
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
                model,
                saveModel: actions.saveModel,
              })
          ),
        ],
        deleteScriptOpen &&
        m(AlertDialog, {
          id: 'deleteScript',
          title: t('DELETE_SCRIPT'),
          description: t('DELETE_SCRIPT_CONFIRM', { name: crimeScript?.label }),
          onToggle: (open: boolean) => (deleteScriptOpen = open),
          isOpen: true,
          secondaryAction: { label: t('CANCEL'), iconName: 'cancel' },
          primaryAction: {
            label: t('DELETE'),
            iconName: 'delete',
            destructive: true,
            onclick: () => {
              if (crimeScript) {
                model.crimeScripts = model.crimeScripts.filter((c) => c.id !== id);
                actions.saveModel(model);
                actions.changePage(Pages.HOME);
              }
            },
          },
        })
      );
    },
  };
};

import m from 'mithril';
import { AlertDialog, FlatButton, Menu, type MenuEntry, snackbar, uniqueId } from 'mithril-materialized';
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
import { toBarrierPng, toBarrierSvg } from '../utils/barrier-export';
import { toWord } from '../utils/word-report';
import { CrimeScriptEditor } from './ui/crime-script-editor';
import { CrimeScriptViewer } from './ui/crime-script-viewer';

type ScriptAction =
  | 'create-restricted'
  | 'delete'
  | 'detach'
  | 'export-word'
  | 'export-barrier-svg'
  | 'export-barrier-png'
  | 'export-json';

const ScriptActionsMenu = Menu<ScriptAction>();

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
      const { model, role, scriptMode, curSceneId, currentCrimeScriptId = '', searchFilter } = state;
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

      const exportBaseName = `${formatDate(Date.now(), '')}_${crimeScript.label}_v${model.version}`;
      const exportFilename = (extension: 'docx' | 'json' | 'svg' | 'png') =>
        classifiedExportFilename(exportBaseName, crimeScript.classification, extension);
      const confirmRestrictedExport = () =>
        crimeScript.classification !== 'restricted' || window.confirm(t('RESTRICTED_EXPORT_CONFIRM'));
      const restrictedCounterpartExists = hasRestrictedCounterpart(model, crimeScript);
      const scriptActions: MenuEntry<ScriptAction>[] = [];
      if (isEditor && !edit && crimeScript.classification === 'public') {
        scriptActions.push({
          id: 'create-restricted',
          label: t('CREATE_RESTRICTED_VERSION'),
          iconName: 'content_copy',
          disabled: restrictedCounterpartExists,
        });
      }
      if (crimeScript.starterOrigin) {
        scriptActions.push({
          id: 'detach',
          label: t('DETACH_STARTER'),
          iconName: 'link_off',
        });
      }
      if (scriptActions.length > 0) scriptActions.push({ separator: true });
      scriptActions.push(
        { id: 'export-word', label: t('EXPORT_TO_WORD'), iconName: 'download' },
        { id: 'export-barrier-svg', label: t('EXPORT_BARRIER_SVG'), iconName: 'grid_view' },
        { id: 'export-barrier-png', label: t('EXPORT_BARRIER_PNG'), iconName: 'image' },
        { id: 'export-json', label: t('EXPORT_TO_JSON'), iconName: 'download' }
      );
      if (isEditor && !edit) {
        scriptActions.push(
          { separator: true },
          { id: 'delete', label: t('DELETE_SCRIPT'), iconName: 'delete' }
        );
      }

      return m(
        '#crime-script.page',
        [
          m(
            '.right-align.script-page-actions',
            [
              isEditor &&
                (edit
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
                  : m(FlatButton, {
                    label: t('EDIT_SCRIPT'),
                    iconName: 'edit',
                    className: 'small',
                    onclick: () => {
                      edit = true;
                    },
                  })),
              m(ScriptActionsMenu, {
                ariaLabel: t('MORE_ACTIONS'),
                minWidth: 240,
                trigger: (attrs) =>
                  m(FlatButton, {
                    ...attrs,
                    label: t('MORE_ACTIONS'),
                    iconName: 'more_vert',
                    className: 'small',
                  }),
                items: scriptActions,
                onSelect: (action) => {
                  switch (action) {
                    case 'create-restricted': {
                      const counterpart = createRestrictedCounterpart(model, crimeScript, uniqueId);
                      model.crimeScripts.push(counterpart);
                      actions.saveModel(model);
                      actions.setScriptMode('restricted');
                      edit = true;
                      actions.changePage(Pages.CRIME_SCRIPT, { id: counterpart.id, edit: 1 });
                      break;
                    }
                    case 'delete':
                      deleteScriptOpen = true;
                      break;
                    case 'detach': {
                      const detached = detachStarterScript(crimeScript);
                      model.crimeScripts = model.crimeScripts.map((script) => script.id === crimeScript.id ? detached : script);
                      actions.saveModel(model);
                      actions.changePage(Pages.CRIME_SCRIPT, { id: detached.id });
                      break;
                    }
                    case 'export-word':
                      if (confirmRestrictedExport()) {
                        void toWord(exportFilename('docx'), crimeScript, model).catch((error) => {
                          snackbar({
                            message: `${t('EXPORT_FAILED')} ${error instanceof Error ? error.message : String(error)}`,
                            dismissible: true,
                          });
                        });
                      }
                      break;
                    case 'export-barrier-svg':
                      if (confirmRestrictedExport()) {
                        try {
                          toBarrierSvg(exportFilename('svg'), crimeScript, model);
                        } catch (error) {
                          snackbar({
                            message: `${t('EXPORT_FAILED')} ${error instanceof Error ? error.message : String(error)}`,
                            dismissible: true,
                          });
                        }
                      }
                      break;
                    case 'export-barrier-png':
                      if (confirmRestrictedExport()) {
                        void toBarrierPng(exportFilename('png'), crimeScript, model).catch((error) => {
                          snackbar({
                            message: `${t('EXPORT_FAILED')} ${error instanceof Error ? error.message : String(error)}`,
                            dismissible: true,
                          });
                        });
                      }
                      break;
                    case 'export-json':
                      if (confirmRestrictedExport()) toJSON(exportFilename('json'), crimeScript, model);
                      break;
                  }
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
                curSceneId,
                searchFilter,
                update: actions.update,
                model,
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

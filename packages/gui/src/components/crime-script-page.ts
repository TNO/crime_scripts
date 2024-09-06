import m from 'mithril';
import { CrimeScript, Pages, scriptIcon } from '../models';
import { MeiosisComponent, routingSvc } from '../services';
import { FlatButton, uniqueId, ModalPanel, Icon } from 'mithril-materialized';
import { t } from '../services/translations';
import { toWord } from '../utils/word';
import { formatDate } from '../utils';
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
      setPage(Pages.CRIME_SCRIPT);
    },
    view: ({ attrs: { state, actions } }) => {
      const { model, role, curActIdx, curPhaseIdx, currentCrimeScriptId = '' } = state;
      const { crimeScripts = [], cast = [], acts = [], attributes = [], locations = [] } = model;
      id = m.route.param('id') || currentCrimeScriptId || (crimeScripts.length > 0 ? crimeScripts[0].id : '');
      const crimeScript =
        crimeScripts.find((c) => c.id === id) || (crimeScripts.length > 0 ? crimeScripts[0] : ({} as CrimeScript));

      const isEditor = role === 'admin' || role === 'editor';

      const filename = `${formatDate(Date.now(), '')}_${crimeScript?.label}_v${model.version}.docx`;

      return m(
        '#row.crime-script.page',
        [
          isEditor &&
            m(
              '.right-align',
              edit
                ? m(FlatButton, {
                    label: t('SAVE_SCRIPT'),
                    iconName: 'save',
                    className: 'small',
                    onclick: () => {
                      edit = false;
                      if (crimeScript) {
                        model.crimeScripts = model.crimeScripts.map((c) => (c.id === id ? crimeScript : c));
                        actions.saveModel(model);
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
                    crimeScript &&
                      m(FlatButton, {
                        title: 'Export to Word',
                        label: t('EXPORT_TO_WORD'),
                        className: 'small',
                        iconName: 'download',
                        onclick: () => toWord(filename, crimeScript, model),
                      }),
                  ]
            ),
          crimeScript &&
            m(
              '.crime-scene',
              edit
                ? m(CrimeScriptEditor, { crimeScript: crimeScript, cast, acts, attributes, locations })
                : m(CrimeScriptViewer, {
                    crimeScript: crimeScript,
                    cast,
                    acts,
                    attributes,
                    locations,
                    curActIdx,
                    curPhaseIdx,
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

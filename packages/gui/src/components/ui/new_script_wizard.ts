import m from 'mithril';
import { snackbar, uniqueId, Wizard } from 'mithril-materialized';
import { LayoutForm, type UIForm } from 'mithril-ui-form';
import { createScenesFromOutline, type CrimeScript, Pages, type SceneOutline, STATUS } from '../../models';
import { i18n, type MeiosisComponent, t } from '../../services';

export const NewScriptWizard: MeiosisComponent = () => {
  let crimeScript: CrimeScript = {
    id: uniqueId(),
    label: '',
    owner: '',
    updated: Date.now(),
    reviewer: [],
    status: STATUS.FIRST_DRAFT,
    literature: [],
    stages: [],
    productIds: [],
    language: i18n.currentLocale,
    aiGenerated: false,
  };
  const outline: { scenes: SceneOutline[] } = {
    scenes: [{ label: '' }],
  };

  return {
    view: ({ attrs: { state, actions } }) => {
      const { model } = state;

      return m(Wizard, {
        onComplete: () => {
          crimeScript.label = crimeScript.label.trim();
          if (!crimeScript.label) {
            snackbar({ message: t('SCRIPT_NAME_REQUIRED'), dismissible: true });
            return;
          }
          crimeScript.stages = createScenesFromOutline(outline.scenes, uniqueId);
          model.crimeScripts.push(crimeScript);
          actions.saveModel(model);
          actions.changePage(Pages.CRIME_SCRIPT, { id: crimeScript.id, edit: 1 });
        },
        steps: [
          {
            title: t('INFO'),
            vnode: () =>
              m(LayoutForm<Partial<CrimeScript>>, {
                obj: crimeScript,
                form: [
                  { id: 'label', type: 'text', className: 'col s12', label: t('NAME') },
                  { id: 'description', type: 'textarea', className: 'col s12', label: t('SUMMARY') },
                ],
              }),
          },
          {
            title: t('SCENES_OPTIONAL'),
            vnode: () =>
              m('.row', [
                m('p.col.s12', t('SCENES_HINT')),
                m(LayoutForm<{ scenes: SceneOutline[] }>, {
                  obj: outline,
                  form: [
                    {
                      id: 'scenes',
                      repeat: true,
                      label: t('SCENES_OPTIONAL'),
                      type: [
                        { id: 'label', type: 'text', className: 'col s12', label: t('SCENE') },
                      ] as UIForm<SceneOutline>,
                    },
                  ] as UIForm<{ scenes: SceneOutline[] }>,
                })
              ]),
          },
        ],
      });
    },
  };
};

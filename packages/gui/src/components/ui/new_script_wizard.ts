import m from 'mithril';
import { snackbar, uniqueId, Wizard } from 'mithril-materialized';
import { LayoutForm, type UIForm } from 'mithril-ui-form';
import {
  type CrimeScript,
  createScenesFromOutline,
  createScriptForMode,
  IconOpts,
  MAX_COMPOSED_ICONS,
  Pages,
  type SceneOutline,
} from '../../models';
import { i18n, type MeiosisComponent, t } from '../../services';

export const NewScriptWizard: MeiosisComponent = () => {
  let crimeScript: CrimeScript;
  const outline: { scenes: SceneOutline[] } = {
    scenes: [{ label: '' }],
  };

  return {
    oninit: ({ attrs: { state } }) => {
      crimeScript = createScriptForMode(state.scriptMode, uniqueId(), i18n.currentLocale);
    },
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
              m('.row', [
                m('.col.s12.classification-notice', [
                  m('strong', `${t('CLASSIFICATION')}: `),
                  t(crimeScript.classification === 'restricted' ? 'RESTRICTED' : 'PUBLIC'),
                ]),
                m(LayoutForm<Partial<CrimeScript>>, {
                obj: crimeScript,
                form: [
                  { id: 'label', type: 'text', className: 'col s12', label: t('NAME') },
                  {
                    id: 'icons',
                    type: 'select',
                    multiple: true,
                    className: 'col s12',
                    label: t('ICONS_MAX_FOUR'),
                    options: IconOpts,
                  },
                  { id: 'description', type: 'textarea', className: 'col s12', label: t('SUMMARY') },
                ] as UIForm<Partial<CrimeScript>>,
                onchange: () => {
                  crimeScript.icons = crimeScript.icons?.slice(0, MAX_COMPOSED_ICONS);
                  crimeScript.icon = crimeScript.icons?.[0];
                },
              }),
              ]),
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

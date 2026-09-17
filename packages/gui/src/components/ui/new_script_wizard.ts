import m from 'mithril';
import { Wizard } from 'mithril-materialized';
import { LayoutForm, type UIForm } from 'mithril-ui-form';
import { type CrimeScript, IconOpts, Pages, type Scene } from '../../models';
import { labelForm } from '../../models/forms';
import { type MeiosisComponent, t } from '../../services';

export const NewScriptWizard: MeiosisComponent = () => {
  let crimeScript: CrimeScript = {
    stages: [{ label: `${t('SCENE')} 1` }],
  } as CrimeScript;
  return {
    view: ({ attrs: { state, actions } }) => {
      const { model } = state;

      return m(Wizard, {
        onComplete: () => {
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
                form: labelForm(),
                onchange: () => {
                  console.log(JSON.stringify(crimeScript));
                },
              }),
          },
          {
            title: t('SCENES'),
            vnode: () =>
              m(
                '.row',
                m(LayoutForm<Partial<CrimeScript>>, {
                  obj: crimeScript,
                  form: [
                    {
                      id: 'stages',
                      repeat: true,
                      pageSize: 1,
                      label: t('SCENES'),
                      type: [
                        { id: 'id', type: 'autogenerate', autogenerate: 'id' },
                        { id: 'label', type: 'text', className: 'col s6', label: t('SCENE') },
                        { id: 'icon', type: 'select', className: 'col s6', label: t('IMAGE'), options: IconOpts },
                        { id: 'description', type: 'textarea', className: 'col s12', label: t('GOALS') },
                        // {
                        //   id: 'ids',
                        //   label: t('SELECT_ACT_N'),
                        //   type: 'search_select',
                        //   className: 'col s12',
                        //   multiple: true,
                        //   options: actLabels,
                        //   oncreateNewOption: (label: string) => {
                        //     const newOption = { id: uniqueId(), label };
                        //     // actLabels.push(newOption);
                        //     if (curScene) curScene.actId = newOption.id;
                        //     update('acts', newOption);
                        //     return newOption;
                        //   },
                        // },
                      ] as UIForm<Scene>,
                    },
                  ] as UIForm<Partial<CrimeScript>>,
                })
              ),
          },
          // {
          //   title: 'Step 3',
          //   vnode: () => m('Three'),
          // },
        ],
      });
    },
  };
};

import m from 'mithril';
import { uniqueId, Wizard } from 'mithril-materialized';
import { LayoutForm, type UIForm } from 'mithril-ui-form';
import { type Act, type CrimeScript, IconOpts, Pages, type Scene } from '../../models';
import { labelForm } from '../../models/forms';
import { type MeiosisComponent, t } from '../../services';

export const NewScriptWizard: MeiosisComponent = () => {
  const newAct = (): Act => ({
    id: uniqueId(),
    label: t('NEW_ACT'),
    activities: [],
    conditions: [],
    indicators: [],
    measures: [],
    opportunities: [],
  });
  const firstAct = newAct();
  let crimeScript: CrimeScript = {
    stages: [{ label: `${t('SCENE')} 1`, variants: [firstAct], selectedVariantId: firstAct.id }],
  } as CrimeScript;
  return {
    view: ({ attrs: { state, actions } }) => {
      const { model } = state;

      return m(Wizard, {
        onComplete: () => {
          crimeScript.stages.forEach((scene) => {
            scene.variants ||= [];
            scene.selectedVariantId =
              scene.variants.find((variant) => variant.id === scene.selectedVariantId)?.id || scene.variants[0]?.id;
          });
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

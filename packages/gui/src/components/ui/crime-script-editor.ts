import m, { FactoryComponent } from 'mithril';
import {
  Act,
  Activity,
  ActivityPhase,
  CrimeScript,
  ID,
  IconOpts,
  Scene,
  Measure,
  Opportunity,
  Indicator,
  DataModel,
  Labelled,
} from '../../models';
import { FlatButton, Tabs, uniqueId, Select, ISelectOptions, ModalPanel } from 'mithril-materialized';
import { FormAttributes, LayoutForm, UIForm } from 'mithril-ui-form';
import { labelForm, literatureForm } from '../../models/forms';
import { crimeMeasureOptions } from '../../models/situational-crime-prevention';
import { I18N, t } from '../../services/translations';
import { InputOptions, toOptions } from '../../utils';

export const CrimeScriptEditor: FactoryComponent<{
  model: DataModel;
  crimeScript: CrimeScript;
  update: (type: 'crimeScript' | 'cast' | 'attributes' | 'transports' | 'locations' | 'acts', option: Labelled) => void;
}> = () => {
  let actsForm: UIForm<{ stages: Scene[] }>;

  let actLabels: { id: ID; label: string }[] = [];
  let locationOptions: InputOptions[] = [];
  let geoLocationOptions: InputOptions[] = [];
  let transportOptions: InputOptions[] = [];
  let castOptions: InputOptions[] = [];
  let attrOptions: InputOptions[] = [];
  let productOptions: InputOptions[] = [];
  let measuresForm: UIForm<{ measures: Measure }> = [];
  let activityForm: UIForm<ActivityPhase>;
  let opportunitiesForm: UIForm<{ conditions: Opportunity[] }>;
  let indicatorsForm: UIForm<{ indicators: Indicator[] }>;

  const measOptions = crimeMeasureOptions();

  return {
    oninit: ({ attrs: { model, update } }) => {
      const {
        cast = [],
        attributes = [],
        locations = [],
        geoLocations = [],
        transports = [],
        products = [],
        partners = [],
      } = model;

      castOptions = toOptions(cast, true);
      attrOptions = toOptions(attributes);
      locationOptions = locations.map(({ id, label }) => ({ id, label }));
      geoLocationOptions = toOptions(geoLocations);
      transportOptions = toOptions(transports);
      productOptions = toOptions(products);

      activityForm = [
        {
          id: 'locationIds',
          type: 'search_select',
          multiple: true,
          className: 'col s12',
          label: t('LOCATIONS', 2),
          options: locationOptions,
          oncreateNewOption: (label: string) => {
            const newOption = { id: uniqueId(), label };
            locationOptions.push(newOption);
            update('locations', newOption);
            return newOption;
          },
        },
        {
          id: 'activities',
          repeat: true,
          type: [
            { id: 'id', type: 'autogenerate', autogenerate: 'id' },
            { id: 'label', type: 'textarea', className: 'col s8 m8', label: t('ACTIVITY') },
            { id: 'header', type: 'switch', className: 'col s4 m2 switch', label: t('HEADER') },
            { id: 'hasDesc', type: 'switch', className: 'col s4 m2 switch', label: t('INFO') },
            {
              id: 'description',
              show: ['hasDesc=true'],
              type: 'textarea',
              className: 'col s12',
              label: t('DESCRIPTION'),
            },
            // {
            //   id: 'type',
            //   type: 'select',
            //   // show: ['!header'],
            //   multiple: true,
            //   className: 'col s12 m6',
            //   label: t('SPECIFY'),
            //   options: ActivityTypeOptions,
            //   checkboxClass: 'col s4',
            // },
            {
              id: 'cast',
              // show: ['type=1'],
              type: 'search_select',
              className: 'col s12 m6',
              multiple: true,
              options: castOptions,
              label: t('CAST'),
              oncreateNewOption: (label: string) => {
                const newOption = { id: uniqueId(), label };
                castOptions.push(newOption);
                update('cast', newOption);
                return newOption;
              },
            },
            {
              id: 'attributes',
              // show: ['type=2'],
              type: 'search_select',
              className: 'col s12 m3',
              multiple: true,
              options: attrOptions,
              label: t('ATTRIBUTES'),
              oncreateNewOption: (label: string) => {
                const newOption = { id: uniqueId(), label };
                attrOptions.push(newOption);
                update('attributes', newOption);
                return newOption;
              },
            },
            {
              id: 'transports',
              // show: ['type=4'],
              type: 'search_select',
              className: 'col s12 m3',
              multiple: true,
              options: transportOptions,
              label: t('TRANSPORTS'),
              oncreateNewOption: (label: string) => {
                const newOption = { id: uniqueId(), label };
                transportOptions.push(newOption);
                update('transports', newOption);
                return newOption;
              },
            },
            // {
            //   id: 'description',
            //   label: t('DESCRIPTION'),
            //   type: 'textarea',
            // },
          ] as UIForm<Activity>,
          className: 'col s12',
          label: t('ACTIVITIES'),
        },
      ] as UIForm<ActivityPhase>;

      opportunitiesForm = [
        {
          id: 'conditions',
          repeat: true,
          type: [
            { id: 'id', type: 'autogenerate', autogenerate: 'id' },
            { id: 'label', type: 'textarea', className: 'col s8 m10', label: t('OPPORTUNITY') },
            { id: 'hasDesc', type: 'switch', className: 'col s4 m2 switch', label: t('INFO') },
            {
              id: 'description',
              show: ['hasDesc=true'],
              type: 'textarea',
              className: 'col s12',
              label: t('DESCRIPTION'),
            },
          ] as UIForm<Opportunity>,
          className: 'col s12',
          label: t('CONDITIONS'),
        },
      ] as UIForm<{ conditions: Opportunity[] }>;

      indicatorsForm = [
        {
          id: 'indicators',
          repeat: true,
          type: [
            { id: 'id', type: 'autogenerate', autogenerate: 'id' },
            { id: 'label', type: 'textarea', className: 'col s8 m10', label: t('INDICATOR') },
            { id: 'hasDesc', type: 'switch', className: 'col s4 m2 switch', label: t('INFO') },
            {
              id: 'description',
              show: ['hasDesc=true'],
              type: 'textarea',
              className: 'col s12',
              label: t('DESCRIPTION'),
            },
          ] as UIForm<Indicator>,
          className: 'col s12',
          label: t('INDICATORS'),
        },
      ] as UIForm<{ indicators: Indicator[] }>;

      const measureForm: UIForm<Measure> = [
        { id: 'id', type: 'autogenerate', autogenerate: 'id' },
        { id: 'cat', type: 'select', options: measOptions, className: 'col s4 m4', label: t('CATEGORY') },
        {
          id: 'partners',
          type: 'select',
          multiple: true,
          className: 'col s4 m6',
          label: t('PARTNERS'),
          options: partners.filter(({ label }) => label).map(({ id, label }) => ({ id, label, icon: 'handshake' })),
        },
        { id: 'hasDesc', type: 'switch', className: 'col s4 m2 switch', label: t('INFO') },
        { id: 'label', type: 'textarea', className: 'col s12', label: t('NAME') },
        { id: 'description', show: ['hasDesc=true'], type: 'textarea', className: 'col s12', label: t('DESCRIPTION') },
      ];

      measuresForm = [{ id: 'measures', type: measureForm, repeat: true, label: t('MEASURE') }];
    },
    view: ({ attrs: { crimeScript, model, update } }) => {
      const { acts = [], crimeScripts = [] } = model;
      const actToCrimeScript = crimeScripts.reduce((acc, cur) => {
        cur.stages?.forEach(({ ids = [] }) => {
          ids.forEach((id) => {
            const found = acc.get(id) || [];
            acc.set(id, [
              ...found,
              cur.label ? (cur.label.length > 25 ? cur.label?.substring(0, 25) + '...' : cur.label) : '?',
            ]);
          });
        });
        return acc;
      }, new Map<ID, string[]>());
      actLabels = acts.map(({ id, label }) => {
        const found = actToCrimeScript.get(id) || [];
        return { id, label: `${label} (${found.join(', ')})` };
      });
      const lookupAct = acts.reduce((acc, cur) => acc.set(cur.id, cur), new Map<ID, Act>());
      const curActIdx = +(m.route.param('stages') || 1) - 1;
      const curScene =
        crimeScript.stages && curActIdx < crimeScript.stages.length
          ? crimeScript.stages[curActIdx]
          : ({ id: '', actId: '', ids: [] as ID[] } as Scene);
      if (!curScene.ids) curScene.ids = [];
      const curAct = curScene.actId
        ? lookupAct.get(curScene.actId) || (curScene.ids[0] && lookupAct.get(curScene.ids[0]))
        : curScene.ids[0] && lookupAct.get(curScene.ids[0]);

      // console.table({ acts, curActIdx, curActIds, crimeScript, curActId, curAct });
      if (curAct && !curAct.measures) {
        curAct.measures = [];
      }
      actsForm = [
        {
          id: 'stages',
          repeat: true,
          pageSize: 1,
          label: t('SCENES'),
          type: [
            { id: 'id', type: 'autogenerate', autogenerate: 'id' },
            { id: 'label', type: 'text', className: 'col s6 m6', label: t('SCENE'), show: ['!icon=1'] },
            { id: 'label', type: 'text', className: 'col s6 m3', label: t('SCENE'), show: ['icon=1'] },
            { id: 'icon', type: 'select', className: 'col s6 m3', label: t('IMAGE'), options: IconOpts },
            { id: 'url', type: 'base64', className: 'col s12 m3', label: t('IMAGE'), show: ['icon=1'] },
            { id: 'isGeneric', type: 'switch', className: 'col s6 m3', label: t('IS_GENERIC') },
            { id: 'description', type: 'textarea', className: 'col s12', label: t('GOALS') },
            {
              id: 'ids',
              label: t('SELECT_ACT_N'),
              type: 'search_select',
              className: 'col s12',
              multiple: true,
              options: actLabels,
              oncreateNewOption: (label: string) => {
                const newOption = { id: uniqueId(), label };
                // actLabels.push(newOption);
                if (curScene) curScene.actId = newOption.id;
                update('acts', newOption);
                return newOption;
              },
            },
          ] as UIForm<Scene>,
        },
      ];
      const key = curAct ? curAct.id + curAct.label : 'cur-act-id';
      return m('.col.s12', [
        m(LayoutForm, {
          form: [
            ...labelForm(),
            {
              id: 'productIds',
              type: 'select',
              label: t('PRODUCTS', 2),
              multiple: true,
              className: 'col s6',
              options: productOptions,
            },
            {
              id: 'geoLocationIds',
              type: 'select',
              multiple: true,
              label: t('GEOLOCATIONS', 2),
              className: 'col s6',
              options: geoLocationOptions,
            },
            { id: 'literature', type: literatureForm(), repeat: true, label: t('REFERENCES') },
            ...actsForm,
          ],
          obj: crimeScript,
          onchange: () => {
            update('crimeScript', crimeScript);
          },
          i18n: I18N,
        } as FormAttributes<Partial<CrimeScript>>),

        curScene &&
          curScene.ids &&
          crimeScript.stages?.length > 0 && [
            [
              curScene.ids.length > 1
                ? m(Select, {
                    key,
                    label: t('SELECT_ACT'),
                    className: 'col s6 m8',
                    initialValue: curScene.actId,
                    // disabled: curActIds.ids.length === 1,
                    options: acts.filter((a) => curScene.ids.includes(a.id)),
                    onchange: (id) => {
                      curScene.actId = id[0];
                    },
                  } as ISelectOptions<ID>)
                : undefined,
              m(FlatButton, {
                key,
                modalId: 'deletePhase',
                label: t('DELETE_ACT'),
                className: 'icon-right right',
                iconClass: 'right',
                iconName: 'delete_forever',
              }),
            ].filter(Boolean),
          ],

        curAct && [
          m(
            '.row',
            m('.col.s12', [
              m('.cur-act', { key: curAct.id }, [
                m(LayoutForm, {
                  form: [
                    { id: 'label', type: 'text', className: 'col s6 m6', label: t('NAME'), show: ['!icon=1'] },
                    { id: 'label', type: 'text', className: 'col s6 m3', label: t('NAME'), show: ['icon=1'] },
                    { id: 'description', type: 'textarea', className: 'col s12', label: t('DESCRIPTION') },
                  ],
                  obj: curAct,
                  onchange: () => {
                    update('acts', curAct);
                  },
                  i18n: I18N,
                } as FormAttributes<Partial<Act>>),
                m(Tabs, {
                  tabs: [
                    {
                      title: t('ACTIVITIES'),
                      vnode: m('.acts.row', [
                        m(LayoutForm, {
                          form: activityForm,
                          obj: curAct,
                          onchange: () => {
                            update('acts', curAct);
                          },
                          i18n: I18N,
                        } as FormAttributes<Partial<ActivityPhase>>),
                      ]),
                    },
                    {
                      title: t('OPPORTUNITIES'),
                      vnode: m('.opportunities', [
                        m(LayoutForm, {
                          form: opportunitiesForm,
                          obj: curAct,
                          i18n: I18N,
                        } as FormAttributes<Partial<ActivityPhase>>),
                      ]),
                    },
                    {
                      title: t('INDICATORS'),
                      vnode: m('.indicators', [
                        m(LayoutForm, {
                          form: indicatorsForm,
                          obj: curAct,
                          i18n: I18N,
                        } as FormAttributes<Partial<ActivityPhase>>),
                      ]),
                    },
                    {
                      id: 'measures',
                      title: t('MEASURES'),
                      vnode: m('.measures', [
                        m(LayoutForm, {
                          form: measuresForm,
                          obj: curAct,
                          i18n: I18N,
                        } as FormAttributes<Partial<ActivityPhase>>),
                      ]),
                    },
                  ],
                }),
              ]),
            ])
          ),
          m(ModalPanel, {
            id: 'deletePhase',
            title: t('DELETE_ACT'),
            description: t('DELETE_ACT_CONFIRM', { name: curAct.label }),
            buttons: [
              { label: t('CANCEL'), iconName: 'cancel' },
              {
                label: t('DELETE'),
                iconName: 'delete',
                onclick: () => {
                  const id = curAct.id;
                  console.log(`Deleting ${id}, ${curAct.label}`);
                  if (id) {
                    actLabels = actLabels.filter((a) => a.id !== id);
                    if (curScene && curScene.ids) {
                      curScene.ids = curScene.ids.filter((i) => i !== id);
                      curScene.actId = curScene.ids.length > 0 ? curScene.ids[0] : '';
                    }
                    model.acts = model.acts?.filter((a) => a.id !== id);
                  }
                },
              },
            ],
          }),
        ],
      ]);
    },
  };
};

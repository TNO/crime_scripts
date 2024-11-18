import m, { FactoryComponent } from 'mithril';
import {
  Act,
  Activity,
  ActivityPhase,
  Cast,
  CrimeScript,
  CrimeScriptAttributes,
  ID,
  IconOpts,
  Stage,
  Measure,
  CrimeLocation,
  Transport,
  GeographicLocation,
  ActivityType,
  Product,
  Opportunity,
  Indicator,
  Partner,
  ServiceProvider,
} from '../../models';
import { FlatButton, Tabs, uniqueId, Select, ISelectOptions, SearchSelect } from 'mithril-materialized';
import { FormAttributes, LayoutForm, UIForm } from 'mithril-ui-form';
import { labelForm, literatureForm } from '../../models/forms';
import { crimeMeasureOptions } from '../../models/situational-crime-prevention';
import { I18N, t } from '../../services/translations';
import { InputOptions, toOptions } from '../../utils';

export const CrimeScriptEditor: FactoryComponent<{
  crimeScript: CrimeScript;
  cast: Cast[];
  acts: Act[];
  transports: Transport[];
  attributes: CrimeScriptAttributes[];
  locations: CrimeLocation[];
  geoLocations: GeographicLocation[];
  products: Product[];
  partners: Partner[];
  serviceProviders: ServiceProvider[];
}> = () => {
  const actsForm: UIForm<any> = [
    {
      id: 'stages',
      repeat: true,
      pageSize: 1,
      label: t('ACTS'),
      type: [] as UIForm<Partial<Stage>>,
    },
  ];

  let locationOptions: InputOptions[] = [];
  let geoLocationOptions: InputOptions[] = [];
  let transportOptions: InputOptions[] = [];
  let castOptions: InputOptions[] = [];
  let serviceProviderOptions: InputOptions[] = [];
  let attrOptions: InputOptions[] = [];
  let productOptions: InputOptions[] = [];
  let measuresForm: UIForm<any> = [];
  let activityForm: UIForm<any>;
  let opportunitiesForm: UIForm<any>;
  let indicatorsForm: UIForm<any>;

  const ActivityTypeOptions = [
    // { id: ActivityType.NONE, label: 'None' },
    { id: ActivityType.HAS_CAST, label: t('CAST') },
    { id: ActivityType.HAS_ATTRIBUTES, label: t('ATTRIBUTE') },
    { id: ActivityType.HAS_TRANSPORT, label: t('TRANSPORT') },
    { id: ActivityType.HAS_SERVICE_PROVIDER, label: t('SERVICE_PROVIDER') },
  ];

  const measOptions = crimeMeasureOptions();

  return {
    oninit: ({
      attrs: {
        cast = [],
        attributes = [],
        locations = [],
        geoLocations = [],
        transports = [],
        products = [],
        partners = [],
        serviceProviders = [],
      },
    }) => {
      castOptions = toOptions(cast, true);
      attrOptions = toOptions(attributes);
      locationOptions = locations.map(({ id, label }) => ({ id, label }));
      geoLocationOptions = toOptions(geoLocations);
      transportOptions = toOptions(transports);
      productOptions = toOptions(products);
      serviceProviderOptions = toOptions(serviceProviders);

      activityForm = [
        {
          id: 'locationIds',
          type: 'select',
          multiple: true,
          label: t('LOCATIONS', 2),
          className: 'col s12',
          options: locationOptions,
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
            {
              id: 'type',
              type: 'select',
              // show: ['!header'],
              multiple: true,
              className: 'col s6 m4 l3',
              label: t('SPECIFY'),
              options: ActivityTypeOptions,
              checkboxClass: 'col s4',
            },
            {
              id: 'cast',
              show: ['type=1'],
              type: 'search_select',
              className: 'col s6 m4 l3',
              multiple: true,
              options: castOptions,
              label: t('CAST'),
            },
            {
              id: 'attributes',
              show: ['type=2'],
              type: 'search_select',
              className: 'col s6 m4 l3',
              multiple: true,
              options: attrOptions,
              label: t('ATTRIBUTES'),
            },
            {
              id: 'transports',
              show: ['type=4'],
              type: 'search_select',
              className: 'col s6 m4 l3',
              multiple: true,
              options: transportOptions,
              label: t('TRANSPORTS'),
            },
            {
              id: 'sp',
              show: ['type=8'],
              type: 'search_select',
              className: 'col s6 m4 l3',
              multiple: true,
              options: serviceProviderOptions,
              label: t('SERVICE_PROVIDER'),
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
      ];

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
      ];

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
      ];

      const measureForm: UIForm<Measure> = [
        { id: 'id', type: 'autogenerate', autogenerate: 'id' },
        { id: 'cat', type: 'select', options: measOptions, className: 'col s6 m5 l4', label: t('CATEGORY') },
        {
          id: 'partners',
          type: 'select',
          multiple: true,
          className: 'col s6 m7 l8',
          label: t('PARTNERS'),
          options: partners.filter(({ label }) => label).map(({ id, label }) => ({ id, label, icon: 'handshake' })),
        },
        { id: 'label', type: 'textarea', className: 'col s12', label: t('NAME') },
        // { id: 'description', type: 'textarea', className: 'col s12', label: t('DESCRIPTION') },
      ];

      measuresForm = [{ id: 'measures', type: measureForm, repeat: true, label: t('MEASURE') }];
    },
    view: ({ attrs: { acts, crimeScript } }) => {
      const curActIdx = +(m.route.param('stages') || 1) - 1;
      const curActIds =
        crimeScript.stages && curActIdx < crimeScript.stages.length
          ? crimeScript.stages[curActIdx]
          : ({ id: '', ids: [] } as Stage);
      if (!curActIds.ids) curActIds.ids = [];
      const curActId = curActIds && curActIds.id;
      const curAct = curActId ? acts.find((a) => a.id === curActId) : undefined;
      if (curAct) {
        if (!curAct.measures) curAct.measures = [];
      }

      const key = curAct ? curAct.id : 'cur-act-id';
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
          onchange: () => {},
          i18n: I18N,
        } as FormAttributes<Partial<CrimeScript>>),

        curActIds &&
          curActIds.ids && [
            m(
              '.row',
              [
                m(SearchSelect<string>, {
                  key,
                  label: t('SELECT_ACT_N'),
                  options: acts,
                  initialValue: curActIds.ids,
                  className: 'col s12 m4 l5',
                  onchange: (selectedIds) => {
                    crimeScript.stages[curActIdx] = {
                      id: selectedIds.length > 0 ? selectedIds[0] : '',
                      ids: selectedIds,
                    };
                    // m.redraw();
                  },
                }),
                curActIds.ids.length > 0
                  ? m(Select, {
                      key,
                      label: t('SELECT_ACT'),
                      className: 'col s12 m4 l5',
                      initialValue: curActIds.id,
                      // disabled: curActIds.ids.length === 1,
                      options: acts.filter((a) => curActIds.ids.includes(a.id)),
                      onchange: (id) => {
                        crimeScript.stages[curActIdx].id = id[0];
                      },
                    } as ISelectOptions<ID>)
                  : undefined,
                m(FlatButton, {
                  key,
                  label: t('ACT'),
                  className: 'col s12 m4 l2',
                  iconName: 'add',
                  onclick: () => {
                    const id = uniqueId();
                    const newAct = {
                      id,
                      label: t('ACT'),
                    } as Act;
                    acts.push(newAct);
                    crimeScript.stages[curActIdx].id = id;
                    if (crimeScript.stages[curActIdx].ids) {
                      crimeScript.stages[curActIdx].ids.push(id);
                    } else {
                      crimeScript.stages[curActIdx].ids = [id];
                    }
                  },
                }),
              ].filter(Boolean)
            ),
          ],

        curAct &&
          m(
            '.row',
            m('.col.s12', [
              m('.cur-act', { key: curAct.id }, [
                m(LayoutForm, {
                  form: [
                    { id: 'label', type: 'text', className: 'col s6 m9', label: t('NAME'), show: ['!icon=1'] },
                    { id: 'label', type: 'text', className: 'col s6 m6', label: t('NAME'), show: ['icon=1'] },
                    { id: 'icon', type: 'select', className: 'col s6 m3', label: t('IMAGE'), options: IconOpts },
                    { id: 'url', type: 'base64', className: 'col s12 m3', label: t('IMAGE'), show: ['icon=1'] },
                    { id: 'description', type: 'textarea', className: 'col s12', label: t('SUMMARY') },
                  ],
                  obj: curAct,
                  onchange: () => {},
                  i18n: I18N,
                } as FormAttributes<Partial<Act>>),
                m(Tabs, {
                  tabs: [
                    {
                      title: t('STEPS'),
                      vnode: m('.acts', [
                        m(LayoutForm, {
                          form: activityForm,
                          obj: curAct,
                          onchange: () => {},
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
                          onchange: () => {},
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
                          onchange: () => {},
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
                          onchange: () => {},
                          i18n: I18N,
                        } as FormAttributes<Partial<ActivityPhase>>),
                      ]),
                    },
                  ],
                }),
              ]),
            ])
          ),
      ]);
    },
  };
};

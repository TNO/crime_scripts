import m, { type FactoryComponent } from 'mithril';
import { AlertDialog, FlatButton, SearchSelect, Select, snackbar, Tabs, uniqueId } from 'mithril-materialized';
import { type FormAttributes, LayoutForm, type UIForm } from 'mithril-ui-form';
import {
  type Act,
  type Activity,
  type ActivityPhase,
  type CrimeScript,
  collectStarterSuggestions,
  copySuggestion,
  type DataModel,
  hasCloseDuplicate,
  IconOpts,
  type ID,
  type Indicator,
  type Labelled,
  MAX_COMPOSED_ICONS,
  type Measure,
  type Opportunity,
  type Scene,
  saveAsNewSuggestion,
  suggestionKey,
} from '../../models';
import { labelForm, literatureForm } from '../../models/forms';
import { crimeMeasureOptions } from '../../models/situational-crime-prevention';
import { fetchStarterBundle } from '../../services';
import { I18N, t } from '../../services/translations';
import { type InputOptions, toOptions } from '../../utils';

export const CrimeScriptEditor: FactoryComponent<{
  model: DataModel;
  crimeScript: CrimeScript;
  update: (type: 'crimeScript' | 'cast' | 'attributes' | 'transports' | 'locations', option: Labelled) => void;
}> = () => {
  let actsForm: UIForm<{ stages: Scene[] }>;

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
  let deletePhaseOpen = false;
  let starterBundle: DataModel | undefined;
  let includeOtherLanguages = false;
  let suggestionSelection: string | undefined;

  const measOptions = crimeMeasureOptions();

  return {
    oninit: ({ attrs: { model, update } }) => {
      fetchStarterBundle().then((bundle) => {
        starterBundle = bundle;
        m.redraw();
      }).catch(() => undefined);
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
      const curActIdx = +(m.route.param('stages') || 1) - 1;
      const curScene =
        crimeScript.stages && curActIdx < crimeScript.stages.length
          ? crimeScript.stages[curActIdx]
          : undefined;
      if (curScene && !curScene.variants) curScene.variants = [];
      const curAct = curScene
        ? curScene.variants.find((variant) => variant.id === curScene.selectedVariantId) || curScene.variants[0]
        : undefined;

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
          ] as UIForm<Scene>,
        },
      ];
      const key = curAct ? curAct.id + curAct.label : 'cur-act-id';
      const suggestionPicker = (kind: 'indicator' | 'measure') => {
        if (!curAct) return undefined;
        const suggestions = collectStarterSuggestions(
          model,
          starterBundle,
          kind,
          crimeScript.language,
          includeOtherLanguages
        );
        const byId = new Map(suggestions.map((suggestion) => [suggestionKey(suggestion), suggestion]));
        return m('.row.suggestion-picker', [
          m(SearchSelect<string>, {
            className: 'col s12 m8',
            label: kind === 'indicator' ? t('INDICATOR') : t('MEASURE'),
            checkedId: suggestionSelection,
            options: suggestions.map((suggestion) => ({
              id: suggestionKey(suggestion),
              label: suggestion.label,
            })),
            onchange: (ids: string[]) => {
              const suggestion = byId.get(ids[0]);
              if (!suggestion) return;
              const copy = copySuggestion(suggestion);
              if (hasCloseDuplicate(copy.label, kind === 'indicator' ? curAct.indicators : curAct.measures)) {
                snackbar({ message: t('CLOSE_DUPLICATE'), dismissible: true });
              }
              if (kind === 'indicator') curAct.indicators.push(copy as Indicator);
              else curAct.measures.push(copy as Measure);
              suggestionSelection = undefined;
              update('crimeScript', crimeScript);
            },
          }),
          m('label.col.s12.m4', [
            m('input[type=checkbox]', {
              checked: includeOtherLanguages,
              onchange: (event: Event) => {
                includeOtherLanguages = (event.target as HTMLInputElement).checked;
              },
            }),
            m('span', t('SHOW_OTHER_LANGUAGES')),
          ]),
        ]);
      };
      const sourcedCopyActions = (kind: 'indicator' | 'measure', items: Array<Indicator | Measure>) =>
        items.filter((item) => item.derivedFrom).map((item) =>
          m(FlatButton, {
            key: `${kind}-${item.id}-save-new`,
            label: `${t('SAVE_NEW_SUGGESTION')}: ${item.label}`,
            iconName: 'content_copy',
            onclick: () => {
              const detached = saveAsNewSuggestion(item);
              if (kind === 'indicator') curAct?.indicators.push(detached as Indicator);
              else curAct?.measures.push(detached as Measure);
              update('crimeScript', crimeScript);
            },
          })
        );
      return m('.col.s12', [
        m(LayoutForm, {
          form: [
            ...labelForm(),
            {
              id: 'language',
              type: 'select',
              label: t('LANGUAGE'),
              className: 'col s6',
              options: [{ id: 'nl', label: 'Nederlands' }, { id: 'en', label: 'English' }],
            },
            { id: 'unreviewed', type: 'switch', label: t('UNREVIEWED'), className: 'col s6 switch' },
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
            crimeScript.icons = crimeScript.icons?.slice(0, MAX_COMPOSED_ICONS);
            crimeScript.icon = crimeScript.icons?.[0];
            update('crimeScript', crimeScript);
          },
          i18n: I18N,
        } as FormAttributes<Partial<CrimeScript>>),

        curScene && crimeScript.stages?.length > 0 && [
          [
            curScene.variants.length > 1
              ? m(Select<ID>, {
                key,
                label: t('SELECT_ACT'),
                className: 'col s6 m8',
                checkedId: curScene.selectedVariantId,
                options: curScene.variants,
                onchange: (id) => {
                  curScene.selectedVariantId = id[0];
                  update('crimeScript', crimeScript);
                },
              })
              : undefined,
            m(FlatButton, {
              key: `${key}-add`,
              onclick: () => {
                const newAct: Act = {
                  id: uniqueId(),
                  label: t('NEW_ACT'),
                  activities: [],
                  conditions: [],
                  indicators: [],
                  measures: [],
                  opportunities: [],
                };
                curScene.variants.push(newAct);
                curScene.selectedVariantId = newAct.id;
                update('crimeScript', crimeScript);
              },
              label: t('ADD_ACT'),
              className: 'icon-right right',
              iconClass: 'right',
              iconName: 'add',
            }),
            curAct &&
            m(FlatButton, {
              key,
              onclick: () => (deletePhaseOpen = true),
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
                    update('crimeScript', crimeScript);
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
                            update('crimeScript', crimeScript);
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
                        suggestionPicker('indicator'),
                        m(LayoutForm, {
                          form: indicatorsForm,
                          obj: curAct,
                          i18n: I18N,
                        } as FormAttributes<Partial<ActivityPhase>>),
                        ...sourcedCopyActions('indicator', curAct.indicators),
                      ]),
                    },
                    {
                      id: 'measures',
                      title: t('MEASURES'),
                      vnode: m('.measures', [
                        suggestionPicker('measure'),
                        m(LayoutForm, {
                          form: measuresForm,
                          obj: curAct,
                          i18n: I18N,
                        } as FormAttributes<Partial<ActivityPhase>>),
                        ...sourcedCopyActions('measure', curAct.measures),
                      ]),
                    },
                  ],
                }),
              ]),
            ])
          ),
          deletePhaseOpen &&
          m(AlertDialog, {
            id: 'deletePhase',
            title: t('DELETE_ACT'),
            description: t('DELETE_ACT_CONFIRM', { name: curAct.label }),
            isOpen: true,
            onToggle: (open: boolean) => (deletePhaseOpen = open),
            secondaryAction: { label: t('CANCEL'), iconName: 'cancel' },
            primaryAction: {
              label: t('DELETE'),
              iconName: 'delete',
              destructive: true,
              onclick: () => {
                const id = curAct.id;
                console.log(`Deleting ${id}, ${curAct.label}`);
                if (id && curScene) {
                  curScene.variants = curScene.variants.filter((variant) => variant.id !== id);
                  curScene.selectedVariantId = curScene.variants[0]?.id;
                  crimeScript.tracks = crimeScript.tracks?.filter((track) => track.sceneVariants[curScene.id] !== id);
                  update('crimeScript', crimeScript);
                }
              },
            },
          }),
        ],
      ]);
    },
  };
};

import m, { type FactoryComponent } from 'mithril';
import { AlertDialog, FlatButton, SearchSelect, Select, snackbar, uniqueId } from 'mithril-materialized';
import { type FormAttributes, LayoutForm, type UIForm } from 'mithril-ui-form';
import {
  type Act,
  type Activity,
  ActivityType,
  type ActivityPhase,
  activitiesToMarkdown,
  buildActivityOutline,
  type CrimeScript,
  collectStarterSuggestions,
  copySuggestion,
  type DataModel,
  hasCloseDuplicate,
  type ID,
  type Indicator,
  type Labelled,
  type Measure,
  numberActivityOutline,
  type Opportunity,
  reconcileActivityMarkdown,
  type ActivityOutlinePreview,
  type Scene,
  scriptsForMode,
  saveAsNewSuggestion,
  suggestionKey,
} from '../../models';
import { labelForm, literatureForm } from '../../models/forms';
import { crimeMeasureOptions } from '../../models/situational-crime-prevention';
import { fetchStarterBundle } from '../../services';
import { I18N, t } from '../../services/translations';
import { type InputOptions, toOptions } from '../../utils';

const createAct = (): Act => ({
  id: uniqueId(),
  label: t('NEW_ACT'),
  activities: [],
  conditions: [],
  indicators: [],
  measures: [],
  opportunities: [],
});

const createActivity = (label: string, parentId?: ID): Activity => ({
  id: uniqueId(),
  label,
  description: '',
  parentId,
  type: ActivityType.NONE,
  cast: [],
  attributes: [],
  transports: [],
});

const updateActivityType = (activity: Activity) => {
  activity.type = [
    ...(activity.cast?.length ? [ActivityType.HAS_CAST] : []),
    ...(activity.attributes?.length ? [ActivityType.HAS_ATTRIBUTES] : []),
    ...(activity.transports?.length ? [ActivityType.HAS_TRANSPORT] : []),
  ];
};

type ActDetailTab = 'conditions' | 'indicators' | 'measures';

export const CrimeScriptEditor: FactoryComponent<{
  model: DataModel;
  crimeScript: CrimeScript;
  scriptMode: 'public' | 'restricted';
  update: (type: 'crimeScript' | 'cast' | 'attributes' | 'transports' | 'locations', option: Labelled) => void;
}> = () => {
  let locationOptions: InputOptions[] = [];
  let geoLocationOptions: InputOptions[] = [];
  let transportOptions: InputOptions[] = [];
  let castOptions: InputOptions[] = [];
  let attrOptions: InputOptions[] = [];
  let productOptions: InputOptions[] = [];
  let measuresForm: UIForm<{ measures: Measure }> = [];
  let activityDetailForm: UIForm<Activity>;
  let opportunitiesForm: UIForm<{ conditions: Opportunity[] }>;
  let indicatorsForm: UIForm<{ indicators: Indicator[] }>;
  let deleteSceneOpen = false;
  let deleteActivityId: ID | undefined;
  let starterBundle: DataModel | undefined;
  let includeOtherLanguages = false;
  let suggestionSelection: string | undefined;
  let selectedActivityId: ID | undefined;
  let outlineOpen = false;
  let outlineMarkdown = '';
  let outlinePreview: ActivityOutlinePreview | undefined;
  let activeActId: ID | undefined;
  let activeDetailTab: ActDetailTab = 'conditions';

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

      activityDetailForm = [
        { id: 'label', type: 'text', className: 'col s12', label: t('NAME') },
        { id: 'description', type: 'textarea', className: 'col s12', label: t('DESCRIPTION') },
        {
          id: 'cast',
          type: 'search_select',
          className: 'col s12',
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
          type: 'search_select',
          className: 'col s12',
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
          type: 'search_select',
          className: 'col s12',
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
      ] as UIForm<Activity>;

      opportunitiesForm = [
        {
          id: 'conditions',
          repeat: true,
          type: [
            { id: 'id', type: 'autogenerate', autogenerate: 'id' },
            { id: 'label', type: 'textarea', className: 'col s12', label: t('OPPORTUNITY') },
            {
              id: 'description',
              type: 'textarea',
              className: 'col s12',
              label: t('DESCRIPTION'),
            },
          ] as UIForm<Opportunity>,
          label: t('CONDITIONS'),
        },
      ] as UIForm<{ conditions: Opportunity[] }>;

      indicatorsForm = [
        {
          id: 'indicators',
          repeat: true,
          type: [
            { id: 'id', type: 'autogenerate', autogenerate: 'id' },
            { id: 'label', type: 'textarea', className: 'col s12', label: t('INDICATOR') },
            {
              id: 'description',
              type: 'textarea',
              className: 'col s12',
              label: t('DESCRIPTION'),
            },
          ] as UIForm<Indicator>,
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
          className: 'col s8 m8',
          label: t('PARTNERS'),
          options: partners.filter(({ label }) => label).map(({ id, label }) => ({ id, label, icon: 'handshake' })),
        },
        { id: 'label', type: 'textarea', className: 'col s12', label: t('NAME') },
        { id: 'description', type: 'textarea', className: 'col s12', label: t('DESCRIPTION') },
      ];

      measuresForm = [{ id: 'measures', type: measureForm, repeat: true, label: t('MEASURE') }];
    },
    view: ({ attrs: { crimeScript, model, scriptMode, update } }) => {
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
      const key = curAct ? curAct.id + curAct.label : 'cur-act-id';
      if (activeActId !== curAct?.id) {
        activeActId = curAct?.id;
        selectedActivityId = undefined;
        outlineOpen = false;
        outlineMarkdown = '';
        outlinePreview = undefined;
      }
      const activityOutline = buildActivityOutline(curAct?.activities);
      const selectedActivity = curAct?.activities.find(({ id }) => id === selectedActivityId);
      const activityNumbers = numberActivityOutline(activityOutline);
      if (selectedActivityId && !selectedActivity) selectedActivityId = undefined;

      const persist = () => update('crimeScript', crimeScript);
      const selectScene = (index: number) => {
        selectedActivityId = undefined;
        const route = m.route.get().split('?')[0];
        m.route.set(route, { ...m.route.param(), stages: index + 1 });
      };
      const moveActivity = (activity: Activity, direction: -1 | 1) => {
        if (!curAct) return;
        const siblings = curAct.activities.filter(({ parentId }) => parentId === activity.parentId);
        const siblingIndex = siblings.findIndex(({ id }) => id === activity.id);
        const target = siblings[siblingIndex + direction];
        if (!target) return;
        const currentIndex = curAct.activities.findIndex(({ id }) => id === activity.id);
        const targetIndex = curAct.activities.findIndex(({ id }) => id === target.id);
        [curAct.activities[currentIndex], curAct.activities[targetIndex]] = [
          curAct.activities[targetIndex],
          curAct.activities[currentIndex],
        ];
        persist();
      };
      const iconButton = (
        icon: string,
        label: string,
        onclick: (event: Event) => void,
        disabled = false
      ) =>
        m(
          'button.script-editor-icon-button[type=button]',
          { title: label, 'aria-label': label, onclick, disabled },
          m('i.material-icons[aria-hidden=true]', icon)
        );
      const addScene = () => {
        const act = createAct();
        const scene: Scene = {
          id: uniqueId(),
          label: t('NEW_SCENE'),
          description: '',
          variants: [act],
          selectedVariantId: act.id,
        };
        crimeScript.stages.push(scene);
        persist();
        selectScene(crimeScript.stages.length - 1);
      };
      const addStep = (asSubstep: boolean) => {
        if (!curAct) return;
        const parentId = asSubstep
          ? selectedActivity?.parentId || selectedActivity?.id
          : undefined;
        const activity = createActivity(asSubstep ? t('NEW_SUBSTEP') : t('NEW_STEP'), parentId);
        curAct.activities.push(activity);
        selectedActivityId = activity.id;
        persist();
      };
      const openMarkdownOutline = () => {
        if (!curAct) return;
        outlineOpen = !outlineOpen;
        outlineMarkdown = activitiesToMarkdown(curAct.activities);
        outlinePreview = undefined;
      };

      const suggestionPicker = (kind: 'indicator' | 'measure') => {
        if (!curAct) return undefined;
        const suggestions = collectStarterSuggestions(
          { ...model, crimeScripts: scriptsForMode(model.crimeScripts, scriptMode) },
          starterBundle,
          kind,
          crimeScript.language,
          includeOtherLanguages,
          scriptMode
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

      const sceneForm = [
        { id: 'label', type: 'text', className: 'col s12', label: t('SCENE') },
        { id: 'isGeneric', type: 'switch', className: 'col s12 switch', label: t('IS_GENERIC') },
        { id: 'description', type: 'textarea', className: 'col s12', label: t('GOALS') },
      ] as UIForm<Scene>;
      const actForm: UIForm<Act> = [
        { id: 'label', type: 'text', className: 'col s12', label: t('NAME') },
        { id: 'description', type: 'textarea', className: 'col s12', label: t('DESCRIPTION') },
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
      ];
      const renderActDetailTabs = (act: Act) => {
        const tabs: Array<{ id: ActDetailTab; title: string; content: () => m.Children }> = [
          {
            id: 'conditions',
            title: t('CONDITIONS'),
            content: () => m('.opportunities', [
              m(LayoutForm, {
                form: opportunitiesForm,
                obj: act,
                onchange: persist,
                i18n: I18N,
              } as FormAttributes<Partial<ActivityPhase>>),
            ]),
          },
          {
            id: 'indicators',
            title: t('INDICATORS'),
            content: () => m('.indicators', [
              suggestionPicker('indicator'),
              m(LayoutForm, {
                form: indicatorsForm,
                obj: act,
                onchange: persist,
                i18n: I18N,
              } as FormAttributes<Partial<ActivityPhase>>),
              ...sourcedCopyActions('indicator', act.indicators),
            ]),
          },
          {
            id: 'measures',
            title: t('MEASURES'),
            content: () => m('.measures', [
              suggestionPicker('measure'),
              m(LayoutForm, {
                form: measuresForm,
                obj: act,
                onchange: persist,
                i18n: I18N,
              } as FormAttributes<Partial<ActivityPhase>>),
              ...sourcedCopyActions('measure', act.measures),
            ]),
          },
        ];
        const activeTab = tabs.find(({ id }) => id === activeDetailTab) || tabs[0];
        const panelId = `${act.id}-${activeTab.id}-panel`;
        return m('.act-detail-tabs', { key: `${act.id}-tabs` }, [
          m('.act-detail-tab-list[role=tablist]', { 'aria-label': `${t('ACT')} ${t('DETAILS')}` }, tabs.map((tab) =>
            m(
              'button.act-detail-tab[type=button][role=tab]',
              {
                id: `${act.id}-${tab.id}-tab`,
                class: activeTab.id === tab.id ? 'active' : '',
                'aria-controls': `${act.id}-${tab.id}-panel`,
                'aria-selected': activeTab.id === tab.id ? 'true' : 'false',
                tabindex: activeTab.id === tab.id ? 0 : -1,
                onclick: () => (activeDetailTab = tab.id),
                onkeydown: (event: KeyboardEvent) => {
                  const currentIndex = tabs.findIndex(({ id }) => id === tab.id);
                  const nextIndex =
                    event.key === 'ArrowRight'
                      ? (currentIndex + 1) % tabs.length
                      : event.key === 'ArrowLeft'
                        ? (currentIndex - 1 + tabs.length) % tabs.length
                        : event.key === 'Home'
                          ? 0
                          : event.key === 'End'
                            ? tabs.length - 1
                            : currentIndex;
                  if (nextIndex === currentIndex) return;
                  event.preventDefault();
                  activeDetailTab = tabs[nextIndex].id;
                  requestAnimationFrame(() =>
                    document.getElementById(`${act.id}-${activeDetailTab}-tab`)?.focus()
                  );
                },
              },
              tab.title
            )
          )),
          m(
            '.act-detail-tab-panel[role=tabpanel]',
            { id: panelId, 'aria-labelledby': `${act.id}-${activeTab.id}-tab` },
            activeTab.content()
          ),
        ]);
      };

      return m('.col.s12', [
        m('.classification-notice', [
          m('strong', `${t('CLASSIFICATION')}: `),
          t(crimeScript.classification === 'restricted' ? 'RESTRICTED' : 'PUBLIC'),
        ]),
        m('details.script-editor-metadata', [
          m('summary', [
            m('i.material-icons[aria-hidden=true]', 'tune'),
            m('span', t('SCRIPT_DETAILS')),
            m('small', crimeScript.label),
          ]),
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
            ],
            obj: crimeScript,
            onchange: persist,
            i18n: I18N,
          } as FormAttributes<Partial<CrimeScript>>),
        ]),

        m('.script-editor-heading', [
          m('div', [
            m('h3', t('BUILD_SCRIPT')),
            m('p', t('BUILD_SCRIPT_HELP')),
          ]),
          m(
            'button.script-editor-action[type=button]',
            { onclick: openMarkdownOutline, disabled: !curAct },
            [m('i.material-icons[aria-hidden=true]', 'format_list_bulleted'), t('EDIT_MARKDOWN_OUTLINE')]
          ),
        ]),

        outlineOpen && curAct &&
          m('.outline-markdown-panel', [
            m('.outline-markdown-copy', [
              m('h4', t('MARKDOWN_OUTLINE')),
              m('p', t('MARKDOWN_OUTLINE_HELP')),
            ]),
            m('textarea', {
              'aria-label': t('MARKDOWN_OUTLINE'),
              value: outlineMarkdown,
              rows: 12,
              oninput: (event: InputEvent) => {
                outlineMarkdown = (event.target as HTMLTextAreaElement).value;
                outlinePreview = undefined;
              },
            }),
            m('.outline-markdown-actions', [
              m(
                'button.script-editor-secondary[type=button]',
                {
                  onclick: () => {
                    navigator.clipboard.writeText(activitiesToMarkdown(curAct.activities)).then(
                      () => snackbar({ message: t('OUTLINE_COPIED') }),
                      () => snackbar({ message: t('OUTLINE_COPY_FAILED'), dismissible: true })
                    );
                  },
                },
                [m('i.material-icons[aria-hidden=true]', 'content_copy'), t('COPY_FOR_AI')]
              ),
              m(
                'button.script-editor-action[type=button]',
                {
                  onclick: () => {
                    outlinePreview = reconcileActivityMarkdown(curAct.activities, outlineMarkdown, uniqueId);
                  },
                },
                [m('i.material-icons[aria-hidden=true]', 'difference'), t('PREVIEW_CHANGES')]
              ),
            ]),
            outlinePreview &&
              (outlinePreview.errors.length > 0
                ? m('.outline-preview-error[role=alert]', [
                  m('strong', t('OUTLINE_INVALID')),
                  m('ul', outlinePreview.errors.map((error) => m('li', error))),
                ])
                : m('.outline-preview', [
                  m('.outline-preview-summary', [
                    m('span', t('OUTLINE_ADDED', { count: outlinePreview.added })),
                    m('span', t('OUTLINE_UPDATED', { count: outlinePreview.updated })),
                    m('span', t('OUTLINE_MOVED', { count: outlinePreview.moved })),
                    m('span', t('OUTLINE_PRESERVED', { count: outlinePreview.preserved })),
                  ]),
                  outlinePreview.preserved > 0 && m('p', t('OUTLINE_NO_DELETE')),
                  m(
                    'button.script-editor-action[type=button]',
                    {
                      onclick: () => {
                        curAct.activities = outlinePreview?.activities || curAct.activities;
                        outlineOpen = false;
                        outlinePreview = undefined;
                        selectedActivityId = undefined;
                        persist();
                      },
                    },
                    [m('i.material-icons[aria-hidden=true]', 'check'), t('APPLY_OUTLINE')]
                  ),
                ])),
          ]),

        m('.script-editor-workspace', [
          m('aside.script-editor-outline[aria-label]', { 'aria-label': t('SCRIPT_OUTLINE') }, [
            m('.script-editor-section-heading', [
              m('h4', t('SCENES')),
              iconButton('add', t('ADD_SCENE'), addScene),
            ]),
            crimeScript.stages.length === 0
              ? m('.script-editor-empty', [
                m('i.material-icons[aria-hidden=true]', 'account_tree'),
                m('p', t('NO_SCENES_HELP')),
              ])
              : m(
                'ol.scene-outline-list',
                crimeScript.stages.map((scene, index) =>
                  m('li.scene-outline-row', {
                    class: index === curActIdx
                      ? selectedActivityId ? 'context-active' : 'active'
                      : '',
                  }, [
                    m(
                      'button.scene-outline-main[type=button]',
                      {
                        onclick: () => selectScene(index),
                        'aria-current': index === curActIdx
                          ? selectedActivityId ? 'location' : 'step'
                          : undefined,
                      },
                      [
                        m('span.scene-outline-number', String(index + 1)),
                        m('span', [
                          m('strong', scene.label || t('UNTITLED_SCENE')),
                          m('small', t('STEP_COUNT', {
                            count:
                              (
                                scene.variants.find(({ id }) => id === scene.selectedVariantId) ||
                                scene.variants[0]
                              )?.activities?.length || 0,
                          })),
                        ]),
                      ]
                    ),
                    m('.scene-outline-actions', [
                      iconButton(
                        'arrow_upward',
                        t('MOVE_UP'),
                        (event) => {
                          event.stopPropagation();
                          if (index === 0) return;
                          [crimeScript.stages[index - 1], crimeScript.stages[index]] = [
                            crimeScript.stages[index],
                            crimeScript.stages[index - 1],
                          ];
                          persist();
                          selectScene(index - 1);
                        },
                        index === 0
                      ),
                      iconButton(
                        'arrow_downward',
                        t('MOVE_DOWN'),
                        (event) => {
                          event.stopPropagation();
                          if (index === crimeScript.stages.length - 1) return;
                          [crimeScript.stages[index + 1], crimeScript.stages[index]] = [
                            crimeScript.stages[index],
                            crimeScript.stages[index + 1],
                          ];
                          persist();
                          selectScene(index + 1);
                        },
                        index === crimeScript.stages.length - 1
                      ),
                    ]),
                  ])
                )
              ),
            curScene && [
              m('.script-editor-section-heading.steps-heading', [
                m('h4', t('STEPS')),
                iconButton('add', t('ADD_STEP'), () => addStep(false), !curAct),
              ]),
              curAct && activityOutline.length > 0
                ? m(
                  'ol.activity-outline-list',
                  activityOutline.map((activity) =>
                    m('li', [
                      m('.activity-outline-row', { class: selectedActivityId === activity.id ? 'active' : '' }, [
                        m(
                          'button.activity-outline-main[type=button]',
                          {
                            onclick: () => (selectedActivityId = activity.id),
                            'aria-current': selectedActivityId === activity.id ? 'step' : undefined,
                          },
                          [
                            m('span.activity-outline-number', activityNumbers.get(activity.id)),
                            m('span', activity.label),
                          ]
                        ),
                        m('.activity-outline-actions', [
                          iconButton('arrow_upward', t('MOVE_UP'), () => moveActivity(activity, -1)),
                          iconButton('arrow_downward', t('MOVE_DOWN'), () => moveActivity(activity, 1)),
                        ]),
                      ]),
                      activity.children.length > 0 &&
                        m(
                          'ol.activity-outline-children',
                          activity.children.map((child) =>
                            m('li.activity-outline-row', { class: selectedActivityId === child.id ? 'active' : '' }, [
                              m(
                                'button.activity-outline-main[type=button]',
                                {
                                  onclick: () => (selectedActivityId = child.id),
                                  'aria-current': selectedActivityId === child.id ? 'step' : undefined,
                                },
                                [
                                  m('span.activity-outline-number', activityNumbers.get(child.id)),
                                  m('span', child.label),
                                ]
                              ),
                              m('.activity-outline-actions', [
                                iconButton('arrow_upward', t('MOVE_UP'), () => moveActivity(child, -1)),
                                iconButton('arrow_downward', t('MOVE_DOWN'), () => moveActivity(child, 1)),
                              ]),
                            ])
                          )
                        ),
                    ])
                  )
                )
                : m('.script-editor-empty.compact', m('p', t('NO_STEPS_HELP'))),
              curAct &&
                m('.outline-add-actions', [
                  m(
                    'button.script-editor-secondary[type=button]',
                    { onclick: () => addStep(true), disabled: !selectedActivity },
                    [m('i.material-icons[aria-hidden=true]', 'subdirectory_arrow_right'), t('ADD_SUBSTEP')]
                  ),
                ]),
            ],
          ]),

          m('main.script-editor-inspector', [
            selectedActivity && curAct
              ? m.fragment({ key: selectedActivity.id }, [
                m('.inspector-heading', [
                  m('div', [
                    m('span.inspector-context', `${curScene?.label} / ${curAct.label}`),
                    m('h4', selectedActivity.parentId ? t('SUBSTEP_DETAILS') : t('STEP_DETAILS')),
                  ]),
                  m('.inspector-actions', [
                    m(
                      'button.script-editor-secondary[type=button]',
                      { onclick: () => (selectedActivityId = undefined) },
                      [m('i.material-icons[aria-hidden=true]', 'arrow_back'), t('BACK_TO_SCENE')]
                    ),
                    m(
                      'button.script-editor-danger[type=button]',
                      { onclick: () => (deleteActivityId = selectedActivity.id) },
                      [
                        m('i.material-icons[aria-hidden=true]', 'delete'),
                        t(selectedActivity.parentId ? 'DELETE_SUBSTEP' : 'DELETE_STEP'),
                      ]
                    ),
                  ]),
                ]),
                m(Select<ID | ''>, {
                  label: t('PARENT_STEP'),
                  checkedId: selectedActivity.parentId || '',
                  options: [
                    { id: '', label: t('TOP_LEVEL_STEP') },
                    ...activityOutline
                      .filter(({ id }) => id !== selectedActivity.id)
                      .map(({ id, label }) => ({ id, label })),
                  ],
                  onchange: (ids) => {
                    const parentId = ids[0];
                    if (parentId) {
                      selectedActivity.parentId = parentId;
                      delete selectedActivity.header;
                    } else {
                      delete selectedActivity.parentId;
                    }
                    persist();
                  },
                }),
                m(LayoutForm, {
                  form: activityDetailForm,
                  obj: selectedActivity,
                  onchange: () => {
                    updateActivityType(selectedActivity);
                    persist();
                  },
                  i18n: I18N,
                } as FormAttributes<Partial<Activity>>),
              ])
              : curScene
                ? m.fragment({ key: curScene.id }, [
                  m('.inspector-heading', [
                    m('div', [
                      m('span.inspector-context', t('SCENE_CONTEXT', { index: curActIdx + 1 })),
                      m('h4', curScene.label || t('UNTITLED_SCENE')),
                    ]),
                    m(
                      'button.script-editor-danger[type=button]',
                      { onclick: () => (deleteSceneOpen = true) },
                      [m('i.material-icons[aria-hidden=true]', 'delete'), t('DELETE_SCENE')]
                    ),
                  ]),
                  m(LayoutForm, {
                    form: sceneForm,
                    obj: curScene,
                    onchange: persist,
                    i18n: I18N,
                  } as FormAttributes<Partial<Scene>>),
                  curScene.variants.length > 1 && m('.act-selector', [
                    m('.act-selector-input', m(Select<ID>, {
                        key,
                        label: t('SELECT_ACT'),
                        checkedId: curScene.selectedVariantId,
                        options: curScene.variants,
                        onchange: (ids) => {
                          curScene.selectedVariantId = ids[0];
                          selectedActivityId = undefined;
                          persist();
                        },
                      })),
                  ]),
                  curAct && m('.act-editor-details', [
                    m(LayoutForm, {
                      key: `${curAct.id}-form`,
                      form: actForm,
                      obj: curAct,
                      onchange: persist,
                      i18n: I18N,
                    } as FormAttributes<Partial<Act>>),
                    renderActDetailTabs(curAct),
                  ]),
                ])
                : m.fragment({ key: 'empty' }, [m('.script-editor-empty', [
                  m('i.material-icons[aria-hidden=true]', 'account_tree'),
                  m('h4', t('NO_SCENES')),
                  m('p', t('NO_SCENES_HELP')),
                  m(
                    'button.script-editor-action[type=button]',
                    { onclick: addScene },
                    [m('i.material-icons[aria-hidden=true]', 'add'), t('ADD_SCENE')]
                  ),
                ])]),
          ]),
        ]),

        deleteActivityId && curAct &&
          m(AlertDialog, {
            id: 'deleteActivity',
            title: t('DELETE_STEP'),
            description: t('DELETE_STEP_CONFIRM', {
              name: curAct.activities.find(({ id }) => id === deleteActivityId)?.label || '',
              count: curAct.activities.filter(({ parentId }) => parentId === deleteActivityId).length,
            }),
            isOpen: true,
            onToggle: (open: boolean) => {
              if (!open) deleteActivityId = undefined;
            },
            secondaryAction: { label: t('CANCEL'), iconName: 'cancel' },
            primaryAction: {
              label: t('DELETE'),
              iconName: 'delete',
              destructive: true,
              onclick: () => {
                const id = deleteActivityId;
                curAct.activities = curAct.activities.filter(
                  (activity) => activity.id !== id && activity.parentId !== id
                );
                selectedActivityId = undefined;
                deleteActivityId = undefined;
                persist();
              },
            },
          }),
        deleteSceneOpen && curScene &&
          m(AlertDialog, {
            id: 'deleteScene',
            title: t('DELETE_SCENE'),
            description: t('DELETE_SCENE_CONFIRM', { name: curScene.label }),
            isOpen: true,
            onToggle: (open: boolean) => (deleteSceneOpen = open),
            secondaryAction: { label: t('CANCEL'), iconName: 'cancel' },
            primaryAction: {
              label: t('DELETE'),
              iconName: 'delete',
              destructive: true,
              onclick: () => {
                crimeScript.stages.splice(curActIdx, 1);
                crimeScript.tracks?.forEach((track) => delete track.sceneVariants[curScene.id]);
                deleteSceneOpen = false;
                selectedActivityId = undefined;
                persist();
                if (crimeScript.stages.length > 0) {
                  selectScene(Math.min(curActIdx, crimeScript.stages.length - 1));
                }
              },
            },
          }),
      ]);
    },
  };
};

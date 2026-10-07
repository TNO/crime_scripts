import type { Patch } from 'meiosis-setup/types';
import m, { type FactoryComponent } from 'mithril';
import { Dialog, Select } from 'mithril-materialized';
import { SlimdownView } from 'mithril-ui-form';
import {
  type Act,
  type Activity,
  activityMatchesRole,
  applyTrackSelection,
  buildActivityOutline,
  type Cast,
  type CrimeLocation,
  type CrimeScript,
  type CrimeScriptAttributes,
  type DataModel,
  findMatchingTrack,
  type GeographicLocation,
  getMatchingStarterBundleMetadata,
  type ID,
  type Labelled,
  numberActivityOutline,
  Pages,
  type Partner,
  type Product,
  relatedScriptsForActivity,
  resolveActivityRoles,
  sceneOutlineDetails,
  sceneVariantSelection,
  scriptIcon,
  selectedSceneVariant,
  type ScriptMode,
  scriptsForMode,
  findTaxonomyScriptUsages,
  type TaxonomyName,
  type Transport,
} from '../../models';
import { lookupCrimeMeasure } from '../../models/situational-crime-prevention';
import { routingSvc, type State } from '../../services';
import { t } from '../../services/translations';
import {
  generateLabeledItemsMarkup,
  highlightFactory,
  measuresToHtml,
  toCommaSeparatedList,
} from '../../utils';
import { ReferenceListComponent } from '../ui/reference';
import { IconStrip } from './icon-strip';

const text = (value: unknown): string => Array.isArray(value) ? value.join('') : String(value);

export const CrimeScriptViewer: FactoryComponent<{
  crimeScript: CrimeScript;
  cast: Cast[];
  attributes: CrimeScriptAttributes[];
  locations: CrimeLocation[];
  geoLocations: GeographicLocation[];
  products: Product[];
  partners: Partner[];
  transports: Transport[];
  curSceneId?: ID;
  curActId?: ID;
  curActivityId?: ID;
  searchFilter?: string;
  update: (patch: Patch<State>) => void;
  model: DataModel;
  scriptMode: ScriptMode;
}> = () => {
  const lookupPartner = new Map<ID, Labelled>();
  const findCrimeMeasure = lookupCrimeMeasure();
  let curTrackId = undefined as string | undefined;
  let activeRoleId = undefined as ID | undefined;
  let usageItem = undefined as { taxonomy: TaxonomyName; id: ID; label: string } | undefined;
  let lastFocusedActivityId: ID | undefined;

  const renderActivities = (
    activities: Act['activities'],
    cast: Cast[],
    attributes: CrimeScriptAttributes[],
    transports: Transport[],
    crimeScript: CrimeScript,
    model: DataModel,
    scriptMode: ScriptMode,
    targetActivityId: ID | undefined,
    highlighter: (text?: string) => m.Children,
    usageButton: (taxonomy: TaxonomyName, id: ID, label: string) => m.Vnode
  ) => {
    const outline = buildActivityOutline(activities);
    const numbers = numberActivityOutline(outline);
    const activeRole = cast.find(({ id }) => id === activeRoleId);
    const renderActivityTaxonomy = (
      taxonomy: 'attributes' | 'transports',
      ids: ID[] | undefined,
      items: Labelled[],
      heading: string,
      icon: string
    ): m.Vnode[] =>
      ids?.flatMap((id) => {
        const item = items.find((entry) => entry.id === id);
        return item ? [
          m('span.activity-taxonomy-item', {
            key: `${taxonomy}-${id}`,
            role: 'group',
            'aria-label': `${heading}: ${item.label}`,
          }, [
            m('i.material-icons[aria-hidden=true]', icon),
            m('span.activity-taxonomy-name', item.label),
            usageButton(taxonomy, item.id, item.label),
          ]),
        ] : [];
      }) || [];
    const renderActivity = (activity: Activity & { children?: Activity[] }): m.Vnode => {
      const roles = resolveActivityRoles(activity, cast);
      const taxonomyItems = [
        ...renderActivityTaxonomy('attributes', activity.attributes, attributes, t('ATTRIBUTES'), 'build'),
        ...renderActivityTaxonomy('transports', activity.transports, transports, t('TRANSPORTS'), 'directions'),
      ];
      const relatedScripts = relatedScriptsForActivity(
        activity,
        crimeScript,
        model.crimeScripts,
        scriptMode
      );
      const matchesRole = activityMatchesRole(activity, activeRoleId);
      return m('li.script-activity-item', {
        tabindex: activity.id === targetActivityId ? -1 : undefined,
        class: activity.id === targetActivityId ? 'script-activity-item--target' : '',
        oncreate: ({ dom }) => {
          if (activity.id !== targetActivityId || lastFocusedActivityId === activity.id) return;
          lastFocusedActivityId = activity.id;
          (dom as HTMLElement).focus({ preventScroll: true });
          (dom as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        },
        onupdate: ({ dom }) => {
          if (activity.id !== targetActivityId || lastFocusedActivityId === activity.id) return;
          lastFocusedActivityId = activity.id;
          (dom as HTMLElement).focus({ preventScroll: true });
          (dom as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        },
      }, [
        m('.script-activity-row', {
          class: activeRoleId ? (matchesRole ? 'role-match' : 'role-muted') : '',
        }, [
          m('span.script-activity-number', numbers.get(activity.id)),
          m('.script-activity-content', [
            m('strong.script-detail-title', highlighter(activity.label)),
            activity.description &&
              m('p.script-detail-description', highlighter(activity.description)),
            (roles.length > 0 || taxonomyItems.length > 0) &&
              m('.activity-entity-pills', [
                roles.map((role) =>
                  m('span.taxonomy-usage-control', {
                    key: role.id,
                    class: activeRoleId === role.id ? 'active' : '',
                  }, [
                    m('button.activity-role-pill[type=button]', {
                      class: activeRoleId === role.id ? 'active' : '',
                      'aria-label': `${t('CAST')}: ${role.label}`,
                      'aria-pressed': activeRoleId === role.id ? 'true' : 'false',
                      onclick: () => {
                        activeRoleId = activeRoleId === role.id ? undefined : role.id;
                      },
                    }, [m('i.material-icons[aria-hidden=true]', 'person'), role.label]),
                    m('button.taxonomy-usage-link[type=button]', {
                      'aria-label': text(t('SHOW_USAGES', { item: role.label })),
                      title: text(t('SHOW_USAGES', { item: role.label })),
                      onclick: () => (usageItem = { taxonomy: 'cast', id: role.id, label: role.label }),
                    }, m('i.material-icons[aria-hidden=true]', 'link')),
                  ])
                ),
                taxonomyItems,
              ]),
            relatedScripts.length > 0 &&
              m('.activity-related-scripts', { 'aria-label': t('RELATED_SCRIPTS') }, [
                m('span.activity-related-scripts-label', `${t('RELATED_SCRIPTS')}:`),
                relatedScripts.map((script) =>
                  m('a.activity-related-script', {
                    key: script.id,
                    href: routingSvc.href(Pages.CRIME_SCRIPT, `id=${script.id}`),
                  }, [
                    m('i.material-icons[aria-hidden=true]', 'account_tree'),
                    m('span', script.label),
                  ])
                ),
              ]),
          ]),
        ]),
        activity.children && activity.children.length > 0 &&
          m('ol.script-activity-list.nested', activity.children.map(renderActivity)),
      ]);
    };

    return [
      activeRole &&
        m('.activity-role-filter[role=status]', [
          m('span', t('FILTERED_BY_ROLE', { role: activeRole.label })),
          m('button.script-editor-secondary[type=button]', {
            onclick: () => (activeRoleId = undefined),
          }, t('CLEAR_ROLE_FILTER')),
        ]),
      m('ol.script-activity-list', outline.map(renderActivity)),
    ];
  };

  const visualizeAct = (
    {
      description,
      activities = [],
      indicators = [],
      conditions = [],
      measures = [],
    } = {} as Act,
    cast: Cast[],
    attributes: CrimeScriptAttributes[],
    transports: Transport[],
    crimeScript: CrimeScript,
    model: DataModel,
    scriptMode: ScriptMode,
    targetActivityId: ID | undefined,
    highlighter: (text?: string) => m.Children,
    mdHighlighter: (text?: string) => string,
    usageButton: (taxonomy: TaxonomyName, id: ID, label: string) => m.Vnode
  ) => {
    const attrIds = Array.from(
      activities.reduce((acc, { attributes: curAttr }) => {
        if (curAttr) curAttr.forEach((id) => acc.add(id));
        return acc;
      }, new Set<ID>())
    );
    const transIds = Array.from(
      activities.reduce((acc, { transports: curAttr }) => {
        if (curAttr) curAttr.forEach((id) => acc.add(id));
        return acc;
      }, new Set<ID>())
    );
    const md = `${conditions.length > 0
        ? `##### ${t('CONDITIONS')}

${generateLabeledItemsMarkup(conditions)}`
        : ''
      }

${indicators.length > 0
        ? `##### ${t('INDICATORS')}

${generateLabeledItemsMarkup(indicators)}`
        : ''
      }

${measures.length > 0
        ? `##### ${t('MEASURES')}

${measuresToHtml(measures, lookupPartner, findCrimeMeasure)}`
        : ''
      }`;
    return [
      description && m('.activity-group-context', highlighter(description)),
      activities.length > 0 && [
        m('h5', t('STEPS')),
        renderActivities(activities, cast, attributes, transports, crimeScript, model, scriptMode, targetActivityId, highlighter, usageButton),
      ],
      ([
        ['attributes', attributes, attrIds, t('ATTRIBUTES')],
        ['transports', transports, transIds, t('TRANSPORTS')],
      ] as const).map(([taxonomy, items, ids, heading]) =>
        ids.length > 0 && m('section', [
          m('h5', heading),
          m('ol', ids.map((id) => {
            const item = items.find((entry) => entry.id === id);
            return item && m('li', { key: id }, [item.label, usageButton(taxonomy, id, item.label)]);
          })),
        ])
      ),
      md.trim() && m(SlimdownView, { md: mdHighlighter(md) }),
    ];
  };

  return {
    oninit: ({ attrs: { crimeScript = {} as CrimeScript } }) => {
      const { tracks = [], stages: scenes = [] } = crimeScript;
      const currentTrack = findMatchingTrack(tracks, sceneVariantSelection(scenes));
      if (currentTrack) {
        curTrackId = currentTrack.id;
      } else if (tracks[0]) {
        curTrackId = tracks[0].id;
        applyTrackSelection(scenes, tracks[0]);
      }
    },
    view: ({
      attrs: {
        model,
        scriptMode,
        crimeScript,
        cast = [],
        attributes = [],
        transports = [],
        locations = [],
        geoLocations = [],
        products = [],
        partners = [],
        curSceneId,
        curActId,
        curActivityId,
        searchFilter,
        update,
      },
    }) => {
      if (lookupPartner.size < partners.length) {
        partners.forEach((p) => lookupPartner.set(p.id, p));
      }
      const { highlighter, mdHighlighter } = highlightFactory(searchFilter);
      const usageButton = (taxonomy: TaxonomyName, id: ID, itemLabel: string) =>
        m('button.taxonomy-usage-link[type=button]', {
          'aria-label': text(t('SHOW_USAGES', { item: itemLabel })),
          title: text(t('SHOW_USAGES', { item: itemLabel })),
          onclick: () => (usageItem = { taxonomy, id, label: itemLabel }),
        }, m('i.material-icons[aria-hidden=true]', 'link'));
      const {
        label = '...',
        description,
        literature,
        stages: scenes = [],
        productIds = [],
        geoLocationIds = [],
        tracks = [],
        icon,
        icons,
        url,
        language,
        aiGenerated,
        unreviewed,
        classification,
      } = crimeScript;
      const starterMetadata = getMatchingStarterBundleMetadata(crimeScript, model);

      const curTrack = curTrackId ? tracks.find((track) => track.id === curTrackId) : undefined;

      const [allCastIds, allAttrIds, allLocIds, allTranspIds, allPartnerIds] = scenes.reduce(
        (acc, stage) => {
          const act =
            stage.variants.find((variant) => variant.id === stage.selectedVariantId) || stage.variants[0];
          if (act) {
            if (act.locationIds) {
              act.locationIds.forEach((id) => acc[2].add(id));
            }
            act.activities?.forEach((activity) => {
              activity.cast?.forEach((id) => acc[0].add(id));
              activity.attributes?.forEach((id) => acc[1].add(id));
              activity.transports?.forEach((id) => acc[3].add(id));
            });
            act.measures?.forEach((measure) => measure.partners?.forEach((id) => acc[4].add(id)));
          }
          return acc;
        },
        [new Set<ID>(), new Set<ID>(), new Set<ID>(), new Set<ID>(), new Set<ID>()] as [
          cast: Set<ID>,
          attr: Set<ID>,
          locs: Set<ID>,
          transp: Set<ID>,
          partners: Set<ID>
        ]
      );

      const curScene = scenes.find((s) => s.id === curSceneId) || scenes[0];
      const curAct = curScene && (curScene.variants.find(({ id }) => id === curActId) || selectedSceneVariant(curScene));
      if (!curActivityId) lastFocusedActivityId = undefined;
      const hasScriptContentSummary =
        allCastIds.size > 0 || allAttrIds.size > 0 || allTranspIds.size > 0 || allLocIds.size > 0 || allPartnerIds.size > 0;
      const referenceCount = literature?.length || 0;
      const hasReferences = referenceCount > 0;
      const selectedActContent = curAct
        ? visualizeAct(
          curAct,
          cast,
          attributes,
          transports,
          crimeScript,
          model,
          scriptMode,
          curActivityId,
          highlighter,
          mdHighlighter,
          usageButton
        )
        : undefined;
      const selectVariant = (variantId: ID) => {
        if (!curScene || variantId === curAct?.id) return;
        curScene.selectedVariantId = variantId;
        curTrackId = findMatchingTrack(tracks, sceneVariantSelection(scenes))?.id;
        activeRoleId = undefined;
        update({ curActId: variantId, curActivityId: undefined });
      };
      const variantMetadata = (variant: Act) => {
        const activityCount = t('ACTIVITY_COUNT', { count: variant.activities.length });
        const locationLabels = variant.locationIds?.length
          ? toCommaSeparatedList(locations, variant.locationIds)
          : undefined;
        return [
          Array.isArray(activityCount) ? activityCount.join('') : activityCount,
          locationLabels && ' · ',
          locationLabels,
        ];
      };
      const variantOptions = curScene?.variants.map((variant) => {
        return {
          id: variant.id,
          label: [variant.label, ' · ', ...variantMetadata(variant)].filter(Boolean).join(''),
        };
      });

      const toLi = (taxonomy: TaxonomyName, ids: Set<string>, labels: Labelled[]) =>
        Array.from(ids).map((id) =>
          m('li', { key: id }, [
            highlighter(labels.find((c) => c.id === id)?.label || '…'),
            usageButton(taxonomy, id, labels.find((c) => c.id === id)?.label || id),
          ])
        );

      const usages = usageItem
        ? findTaxonomyScriptUsages(model, usageItem.taxonomy, usageItem.id, scriptsForMode(model.crimeScripts, scriptMode))
        : [];
      const usagesByScript = new Map<ID, typeof usages>();
      usages.forEach((usage) =>
        usagesByScript.set(usage.script.id, [...(usagesByScript.get(usage.script.id) || []), usage])
      );
      const hitCount = (count: number) => text(t('HIT_COUNT', { count }));

      return m('.col.s12', [
        usageItem && m(Dialog, {
          id: 'taxonomy-usages',
          title: `${text(t('SHOW_USAGES', { item: usageItem.label }))} · ${hitCount(usages.length)}`,
          isOpen: true,
          initialFocus: 'dialog',
          onToggle: (open: boolean) => { if (!open) usageItem = undefined; },
          content: [
            m('.taxonomy-usage-dialog-header',
              m('a', {
                href: routingSvc.href(Pages.SETTINGS, `id=${usageItem.id}`),
                onclick: () => { usageItem = undefined; },
              }, t('VIEW_IN_TAXONOMY'))
            ),
            m('.taxonomy-usage-dialog', [
              usages.length === 0 && m('p', t('NO_USAGES')),
              m('ul.taxonomy-script-hits', Array.from(usagesByScript, ([, scriptUsages]) => {
                const script = scriptUsages[0].script;
                const usagesByScene = new Map<ID, typeof usages>();
                scriptUsages.forEach((usage) => {
                  if (usage.sceneId) {
                    usagesByScene.set(usage.sceneId, [
                      ...(usagesByScene.get(usage.sceneId) || []),
                      usage,
                    ]);
                  }
                });
                return m('li', { key: script.id }, [
                  m('a', {
                    href: routingSvc.href(Pages.CRIME_SCRIPT, `id=${script.id}`),
                    onclick: () => { usageItem = undefined; },
                  }, `${script.label} · ${hitCount(scriptUsages.length)}`),
                  usagesByScene.size > 0 && m('ul.taxonomy-scene-hits',
                    Array.from(usagesByScene, ([sceneId, sceneUsages]) =>
                      m('li', { key: sceneId }, [
                        m('span', `${sceneUsages[0].sceneLabel} · ${hitCount(sceneUsages.length)}`),
                        m('ul', sceneUsages.map((usage, index) =>
                          m('li', { key: `${usage.variantId}-${usage.activityId || usage.label}-${index}` },
                            m('a', {
                              href: routingSvc.href(Pages.CRIME_SCRIPT, `id=${script.id}`),
                              onclick: () => {
                                update({
                                  currentCrimeScriptId: script.id,
                                  curSceneId: usage.sceneId,
                                  curActId: usage.variantId,
                                  curActivityId: usage.activityId,
                                });
                                usageItem = undefined;
                              },
                            }, usage.label)
                          )
                        )),
                      ])
                    )
                  ),
                ]);
              })),
            ]),
          ],
        }),
        m(
          '.right',
          m(IconStrip, {
            className: 'script-viewer-icon-strip',
            fallback: scriptIcon,
            icon,
            icons,
            uploadedImage: url,
          })
        ),
        m(
          'h4.script-viewer-title',
          highlighter(label)
        ),
        m('.script-metadata', [
          m('span.classification-badge', t(classification === 'restricted' ? 'RESTRICTED' : 'PUBLIC')),
          m('span.script-meta-pill.script-meta-pill--language', `${t('LANGUAGE')}: ${language === 'nl' ? 'Nederlands' : 'English'}`),
          productIds.map((productId) => {
            const product = products.find(({ id }) => id === productId);
            return product && m('span.script-meta-pill.script-meta-pill--product', {
              key: productId,
            }, [`${t('PRODUCTS', 1)}: ${product.label}`, usageButton('products', productId, product.label)]);
          }),
          geoLocationIds.map((id) => {
            const location = geoLocations.find((item) => item.id === id);
            return location && m('span.script-meta-pill.script-meta-pill--location', { key: id }, [
              `${t('GEOLOCATIONS', 1)}: ${location.label}`,
              usageButton('geoLocations', id, location.label),
            ]);
          }),
          aiGenerated && m('span.script-meta-pill.script-meta-pill--generated', {
            title: starterMetadata?.attribution,
          }, t('AI_GENERATED')),
          unreviewed && m('span.script-meta-pill.script-meta-pill--review', {
            title: starterMetadata?.disclaimer,
          }, t('UNREVIEWED')),
          starterMetadata?.license && m('a.script-meta-pill.script-meta-pill--source', {
            href: starterMetadata.licenseUrl,
            target: '_blank',
            rel: 'noopener noreferrer',
          }, starterMetadata.license),
        ]),

        description && m('p', highlighter(description)),
        (hasScriptContentSummary || hasReferences) &&
          m('.script-viewer-summaries', [
            hasScriptContentSummary && m('details.script-viewer-summary', [
              m('summary.script-viewer-summary-counts', [
                allCastIds.size > 0 && m('span', t('ROLE_COUNT', { count: allCastIds.size })),
                allAttrIds.size > 0 && m('span', t('ATTRIBUTE_COUNT', { count: allAttrIds.size })),
                allTranspIds.size > 0 && m('span', t('TRANSPORT_COUNT', { count: allTranspIds.size })),
                allLocIds.size > 0 && m('span', t('LOCATION_COUNT', { count: allLocIds.size })),
                allPartnerIds.size > 0 && m('span', t('PARTNER_COUNT', { count: allPartnerIds.size })),
              ]),
              m('.script-viewer-summary-grid', [
                allCastIds.size > 0 && m('section', [m('h5', t('CAST')), m('ol', toLi('cast', allCastIds, cast))]),
                allAttrIds.size > 0 && m('section', [m('h5', t('ATTRIBUTES')), m('ol', toLi('attributes', allAttrIds, attributes))]),
                allTranspIds.size > 0 && m('section', [
                  m('h5', t('TRANSPORTS', allTranspIds.size)),
                  m('ol', toLi('transports', allTranspIds, transports)),
                ]),
                allLocIds.size > 0 && m('section', [
                  m('h5', t('LOCATIONS', allLocIds.size)),
                  m('ol', toLi('locations', allLocIds, locations)),
                ]),
                allPartnerIds.size > 0 && m('section', [
                  m('h5', t('PARTNERS')),
                  m('ol', toLi('partners', allPartnerIds, partners)),
                ]),
              ]),
            ]),
            hasReferences && literature && m('details.script-viewer-summary', [
              m('summary', m('span', t('SOURCES_AND_REFERENCES', {
                count: referenceCount,
              }))),
              m(ReferenceListComponent, { references: literature }),
            ]),
          ]),

        scenes.length > 0 && m('.script-viewer-workspace', [
          m('aside.script-viewer-outline[aria-label]', { 'aria-label': t('SCENES') }, [
            m('.script-viewer-outline-heading', [
              m('h5', t('SCENES')),
              tracks.length > 0 && m('label.viewer-track-selector', [
                m('select.browser-default', {
                  'aria-label': t('TRACK'),
                  value: curTrackId || '',
                  onchange: (event: Event) => {
                    const trackId = (event.currentTarget as HTMLSelectElement).value;
                    curTrackId = trackId || undefined;
                    const track = tracks.find(({ id }) => id === trackId);
                    if (track) applyTrackSelection(scenes, track);
                    activeRoleId = undefined;
                    const selectedScene = scenes.find(({ id }) => id === curScene?.id) || scenes[0];
                    update({ curActId: selectedScene && selectedSceneVariant(selectedScene)?.id, curActivityId: undefined });
                  },
                }, [
                  !curTrackId && m('option[value=][disabled]', [
                    t('TRACK'),
                    ': ',
                    t('CUSTOM_COMBINATION'),
                  ]),
                  tracks.map((track) => m('option', {
                    key: track.id,
                    value: track.id,
                  }, [t('TRACK'), ': ', track.label])),
                ]),
              ]),
            ]),
            curTrack?.description &&
              m(SlimdownView, { className: 'viewer-track-description', md: curTrack.description }),
            m(
              'ol.scene-outline-list',
              scenes.map((scene, index) => {
                const details = sceneOutlineDetails(scene);
                return m('li.scene-outline-row', { class: curScene?.id === scene.id ? 'active' : '' }, [
                  m(
                    'button.scene-outline-main[type=button]',
                    {
                      onclick: () => {
                        activeRoleId = undefined;
                        update({
                          curSceneId: scene.id,
                          curActId: selectedSceneVariant(scene)?.id,
                          curActivityId: undefined,
                        });
                      },
                      'aria-current': curScene?.id === scene.id ? 'step' : undefined,
                    },
                    [
                      m('span.scene-outline-number', String(index + 1)),
                      m('span', [
                        m('strong', scene.label || '…'),
                        m('small', [
                          t('ACTIVITY_COUNT', { count: details.activityCount }),
                          details.variantCount > 1 && ' · ',
                          details.variantCount > 1 &&
                            t('MODUS_OPERANDI_COUNT', { count: details.variantCount }),
                          details.variantCount > 1 && details.selectedVariantLabel && ' · ',
                          details.variantCount > 1 && details.selectedVariantLabel,
                        ]),
                      ]),
                    ]
                  ),
                ]);
              })
            ),
          ]),
          m('main.script-viewer-scene', [
            curScene && [
              m('.viewer-scene-heading', [
                m('span.inspector-context', t('SCENE_CONTEXT', {
                  index: scenes.findIndex(({ id }) => id === curScene.id) + 1,
                })),
                m('h4', highlighter(curScene.label)),
                curScene.description &&
                  m(SlimdownView, { md: curScene.description, removeParagraphs: true }),
              ]),
              curAct && m('.viewer-variant-switcher', { 'aria-label': t('ACTS') }, [
                curScene.variants.length === 1
                  ? m('.viewer-variant-static', {
                    id: `${curScene.id}-${curAct.id}-label`,
                  }, [
                    m('span', highlighter(curAct.label)),
                    m('small', variantMetadata(curAct)),
                  ])
                  : curScene.variants.length <= 3
                    ? m('.viewer-variant-options[role=group]', { 'aria-label': t('ACTS') },
                      curScene.variants.map((variant) => {
                        const active = variant.id === curAct.id;
                        const triggerId = `${curScene.id}-${variant.id}-trigger`;
                        return m('button.viewer-variant-trigger[type=button]', {
                          key: variant.id,
                          id: triggerId,
                          class: active ? 'active' : '',
                          'aria-pressed': active ? 'true' : 'false',
                          'aria-controls': `${curScene.id}-variant-panel`,
                          onclick: () => selectVariant(variant.id),
                        }, [
                          m('span', highlighter(variant.label)),
                          m('small', variantMetadata(variant)),
                        ]);
                      })
                    )
                    : m('.viewer-variant-select', m(Select<string>, {
                      label: t('ACTS'),
                      options: variantOptions,
                      checkedId: curAct.id,
                      onchange: ([variantId]) => variantId && selectVariant(variantId),
                    })),
                m('.viewer-variant-panel', {
                  id: `${curScene.id}-variant-panel`,
                  'aria-labelledby': curScene.variants.length === 1
                    ? `${curScene.id}-${curAct.id}-label`
                    : curScene.variants.length <= 3
                      ? `${curScene.id}-${curAct.id}-trigger`
                      : undefined,
                  'aria-label': curScene.variants.length > 3 ? curAct.label : undefined,
                }, selectedActContent),
              ]),
            ],
          ]),
        ]),
      ]);
    },
  };
};

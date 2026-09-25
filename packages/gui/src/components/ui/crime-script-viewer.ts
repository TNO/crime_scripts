import type { Patch } from 'meiosis-setup/types';
import m, { type FactoryComponent } from 'mithril';
import { Select } from 'mithril-materialized';
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
  resolveActivityRoles,
  sceneOutlineDetails,
  sceneVariantSelection,
  scriptIcon,
  selectedSceneVariant,
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
  toMarkdownOl,
} from '../../utils';
import { ReferenceListComponent } from '../ui/reference';
import { IconStrip } from './icon-strip';

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
  searchFilter?: string;
  update: (patch: Patch<State>) => void;
  model: DataModel;
}> = () => {
  const lookupPartner = new Map<ID, Labelled>();
  const findCrimeMeasure = lookupCrimeMeasure();
  let curTrackId = undefined as string | undefined;
  let activeRoleId = undefined as ID | undefined;

  const renderActivities = (
    activities: Act['activities'],
    cast: Cast[],
    highlighter: (text?: string) => m.Children
  ) => {
    const outline = buildActivityOutline(activities);
    const numbers = numberActivityOutline(outline);
    const activeRole = cast.find(({ id }) => id === activeRoleId);
    const renderActivity = (activity: Activity & { children?: Activity[] }): m.Vnode => {
      const roles = resolveActivityRoles(activity, cast);
      const matchesRole = activityMatchesRole(activity, activeRoleId);
      return m('li.script-activity-item', [
        m('.script-activity-row', {
          class: activeRoleId ? (matchesRole ? 'role-match' : 'role-muted') : '',
        }, [
          m('span.script-activity-number', numbers.get(activity.id)),
          m('.script-activity-content', [
            m('strong.script-detail-title', highlighter(activity.label)),
            activity.description &&
              m('p.script-detail-description', highlighter(activity.description)),
            roles.length > 0 &&
              m('.activity-role-pills', { 'aria-label': t('CAST') }, roles.map((role) =>
                m('button.activity-role-pill[type=button]', {
                  key: role.id,
                  class: activeRoleId === role.id ? 'active' : '',
                  'aria-pressed': activeRoleId === role.id ? 'true' : 'false',
                  onclick: () => {
                    activeRoleId = activeRoleId === role.id ? undefined : role.id;
                  },
                }, role.label)
              )),
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

  const renderLocations = (locationIds: ID[] = [], locations: CrimeLocation[]) => {
    const locationById = new Map(locations.map((location) => [location.id, location]));
    return locationIds.length > 0 &&
      m('.variant-location-pills', { 'aria-label': t('LOCATIONS', locationIds.length) },
        locationIds.map((id) => {
          const location = locationById.get(id);
          return location && m('span.variant-location-pill', { key: id }, [
            m('i.material-icons[aria-hidden=true]', 'location_on'),
            location.label,
          ]);
        })
      );
  };

  const visualizeAct = (
    {
      description,
      activities = [],
      indicators = [],
      conditions = [],
      measures = [],
      locationIds = [],
    } = {} as Act,
    cast: Cast[],
    attributes: CrimeScriptAttributes[],
    transports: Transport[],
    locations: CrimeLocation[],
    highlighter: (text?: string) => m.Children,
    mdHighlighter: (text?: string) => string
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
    const md = `${attrIds.length > 0
        ? `##### ${t('ATTRIBUTES')}

${toMarkdownOl(attributes, attrIds)}`
        : ''
      }

${transIds.length > 0
        ? `##### ${t('TRANSPORTS')}

${toMarkdownOl(transports, transIds)}`
        : ''
      }

${conditions.length > 0
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
      (description || locationIds.length > 0) && m('.activity-group-context', [
        description && m('span.activity-group-context-copy', highlighter(description)),
        renderLocations(locationIds, locations),
      ]),
      activities.length > 0 && [
        m('h5', t('STEPS')),
        renderActivities(activities, cast, highlighter),
      ],
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
        crimeScript,
        cast = [],
        attributes = [],
        transports = [],
        locations = [],
        geoLocations = [],
        products = [],
        partners = [],
        curSceneId,
        searchFilter,
        update,
      },
    }) => {
      if (lookupPartner.size < partners.length) {
        partners.forEach((p) => lookupPartner.set(p.id, p));
      }
      const { highlighter, mdHighlighter } = highlightFactory(searchFilter);
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

      const [allCastIds, allAttrIds, allLocIds, allTranspIds] = scenes.reduce(
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
          }
          return acc;
        },
        [new Set<ID>(), new Set<ID>(), new Set<ID>(), new Set<ID>()] as [
          cast: Set<ID>,
          attr: Set<ID>,
          locs: Set<ID>,
          transp: Set<ID>
        ]
      );

      const curScene = scenes.find((s) => s.id === curSceneId) || scenes[0];
      const curAct = curScene && selectedSceneVariant(curScene);
      const hasScriptContentSummary =
        allCastIds.size > 0 || allAttrIds.size > 0 || allTranspIds.size > 0 || allLocIds.size > 0;
      const referenceCount = literature?.length || 0;
      const hasReferences = referenceCount > 0;
      const selectedActContent = curAct
        ? visualizeAct(curAct, cast, attributes, transports, locations, highlighter, mdHighlighter)
        : undefined;
      const selectVariant = (variantId: ID) => {
        if (!curScene || variantId === curAct?.id) return;
        curScene.selectedVariantId = variantId;
        curTrackId = findMatchingTrack(tracks, sceneVariantSelection(scenes))?.id;
        activeRoleId = undefined;
        update({ curActId: variantId });
      };
      const variantOptions = curScene?.variants.map((variant) => {
        const activityCount = t('ACTIVITY_COUNT', { count: variant.activities.length });
        return {
          id: variant.id,
          label: `${variant.label} · ${Array.isArray(activityCount) ? activityCount.join('') : activityCount}`,
        };
      });

      const toLi = (ids: Set<string>, labels: Labelled[]) =>
        Array.from(ids).map((id) =>
          m(
            'li',
            m(
              'a',
              {
                href: routingSvc.href(Pages.SETTINGS, `id=${id}`),
              },
              highlighter(labels.find((c) => c.id === id)?.label || '…')
            )
          )
        );

      return m('.col.s12', [
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
            }, `${t('PRODUCTS', 1)}: ${product.label}`);
          }),
          geoLocationIds.length > 0 && m(
            'span.script-meta-pill.script-meta-pill--location',
            highlighter(`${t('GEOLOCATIONS', geoLocationIds.length)}: ${toCommaSeparatedList(geoLocations, geoLocationIds)}`)
          ),
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
              ]),
              m('.script-viewer-summary-grid', [
                allCastIds.size > 0 && m('section', [m('h5', t('CAST')), m('ol', toLi(allCastIds, cast))]),
                allAttrIds.size > 0 && m('section', [m('h5', t('ATTRIBUTES')), m('ol', toLi(allAttrIds, attributes))]),
                allTranspIds.size > 0 && m('section', [
                  m('h5', t('TRANSPORTS', allTranspIds.size)),
                  m('ol', toLi(allTranspIds, transports)),
                ]),
                allLocIds.size > 0 && m('section', [
                  m('h5', t('LOCATIONS', allLocIds.size)),
                  m('ol', toLi(allLocIds, locations)),
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
                m('span.viewer-track-label', t('TRACK')),
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
                    update({ curActId: selectedScene && selectedSceneVariant(selectedScene)?.id });
                  },
                }, [
                  !curTrackId && m('option[value=][disabled]', t('CUSTOM_COMBINATION')),
                  tracks.map((track) => m('option', {
                    key: track.id,
                    value: track.id,
                  }, track.label)),
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
                        ]),
                        scene.variants.length > 1 &&
                          m('small.scene-outline-variant', details.selectedVariantLabel),
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
                    m('small', t('ACTIVITY_COUNT', { count: curAct.activities.length })),
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
                          m('small', t('ACTIVITY_COUNT', { count: variant.activities.length })),
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

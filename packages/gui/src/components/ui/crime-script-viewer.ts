import m, { FactoryComponent } from 'mithril';
import {
  Act,
  Cast,
  CrimeLocation,
  CrimeScript,
  CrimeScriptAttributes,
  DataModel,
  GeographicLocation,
  ICONS,
  ID,
  IconOpts,
  Labelled,
  Pages,
  Partner,
  Product,
  Track,
  Transport,
  missingIcon,
  scriptIcon,
} from '../../models';
import { routingSvc, State } from '../../services';
import { Button, FlatButton, ITabItem, ModalPanel, Select, Tabs } from 'mithril-materialized';
import { LayoutForm, SlimdownView, UIForm } from 'mithril-ui-form';
import { Patch } from 'meiosis-setup/types';
import { ReferenceListComponent } from '../ui/reference';
import { lookupCrimeMeasure } from '../../models/situational-crime-prevention';
import { t } from '../../services/translations';
import {
  createTooltip,
  generateLabeledItemsMarkup,
  highlightFactory,
  measuresToMarkdown,
  toCommaSeparatedList,
  toMarkdownOl,
} from '../../utils';
import { ProcessStep, ProcessVisualization } from './process-visualisation';

export const CrimeScriptViewer: FactoryComponent<{
  crimeScript: CrimeScript;
  cast: Cast[];
  acts: Act[];
  attributes: CrimeScriptAttributes[];
  locations: CrimeLocation[];
  geoLocations: GeographicLocation[];
  products: Product[];
  partners: Partner[];
  transports: Transport[];
  curActId?: ID;
  curSceneId?: ID;
  searchFilter?: string;
  update: (patch: Patch<State>) => void;
  model: DataModel;
  saveModel: (ds: DataModel) => void;
}> = () => {
  const lookupPartner = new Map<ID, Labelled>();
  const findCrimeMeasure = lookupCrimeMeasure();
  const trackForm = [
    { id: 'id', type: 'autogenerate', autogenerate: 'id' },
    { id: 'label', type: 'text', label: t('TRACK') },
    { id: 'description', type: 'textarea', label: t('DESCRIPTION') },
  ] as UIForm<Track>;
  let newTrack: Track | undefined;
  let editTrack: Track | undefined;
  let showProcessVisualization = true;
  let curTrackId = undefined as string | undefined;
  let curSceneVariants: { [sceneID: ID]: ID | undefined } = {};

  // Helper function to check if two variant selections are equal
  const variantsEqual = (
    variants1: { [sceneID: ID]: ID | undefined },
    variants2: { [sceneID: ID]: ID | undefined }
  ) => {
    const keys1 = Object.keys(variants1);
    const keys2 = Object.keys(variants2);
    if (keys1.length !== keys2.length) return false;
    return keys1.every((key) => variants1[key] === variants2[key]);
  };

  // Helper function to find a track that matches the current variant selection
  const findMatchingTrack = (tracks: Track[], sceneVariants: { [sceneID: ID]: ID | undefined }): Track | undefined => {
    return tracks.find((track) => variantsEqual(track.sceneVariants, sceneVariants));
  };

  // Helper function to check if all scenes have selected variants
  const hasCompleteVariantSelection = (scenes: any[], sceneVariants: { [sceneID: ID]: ID | undefined }): boolean => {
    const scenesWithVariants = scenes.filter((s) => s.ids && s.ids.length > 0);
    return scenesWithVariants.every((scene) => sceneVariants[scene.id] !== undefined);
  };

  // Helper function to update track selection and sync variants
  const updateTrackSelection = (trackId: string | undefined, tracks: Track[], scenes: any[]) => {
    curTrackId = trackId;
    if (trackId) {
      const track = tracks.find((t) => t.id === trackId);
      if (track) {
        // Update current scene variants to match the selected track
        curSceneVariants = { ...track.sceneVariants };
        // Update scene actIds to match the track
        scenes.forEach((scene) => {
          const actId = curSceneVariants[scene.id];
          if (actId) {
            scene.actId = actId;
          }
        });
      }
    }
    // Note: We don't modify curSceneVariants when trackId is undefined
    // This allows the current variant selection to remain intact
    console.log('Track selection updated:', { trackId, newVariants: trackId ? curSceneVariants : 'unchanged' });
  };

  // Helper function to handle variant selection
  const handleVariantSelection = (sceneId: ID, variantId: ID, tracks: Track[], scenes: any[]) => {
    // Update the current scene variants
    curSceneVariants[sceneId] = variantId;

    // Update the scene actId
    const scene = scenes.find((s) => s.id === sceneId);
    if (scene) {
      scene.actId = variantId;
    }

    // Check if there's a matching track for this selection
    const matchingTrack = findMatchingTrack(tracks, curSceneVariants);
    if (matchingTrack) {
      curTrackId = matchingTrack.id;
    } else {
      // No matching track found, clear current track
      curTrackId = undefined;
    }

    console.log('Variant selection changed:', {
      sceneId,
      variantId,
      curSceneVariants,
      matchingTrack: matchingTrack?.label,
      curTrackId,
    });
  };

  const visualizeAct = (
    { label = '...', activities = [], indicators = [], conditions = [], locationIds = [], measures = [] } = {} as Act,
    cast: Cast[],
    attributes: CrimeScriptAttributes[],
    transports: Transport[],
    locations: CrimeLocation[],
    highlighter: (text?: string) => string | undefined
  ) => {
    const castIds = Array.from(
      activities.reduce((acc, { cast: curCast }) => {
        if (curCast) curCast.forEach((id) => acc.add(id));
        return acc;
      }, new Set<ID>())
    );
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
    const md = `${
      locationIds && locationIds.length
        ? `##### ${t('LOCATIONS', locationIds.length)}

${toCommaSeparatedList(locations, locationIds)}`
        : ''
    }

${
  activities.length > 0
    ? `##### ${t('STEPS')}

${generateLabeledItemsMarkup(activities)}`
    : ''
}

${
  castIds.length > 0
    ? `##### ${t('CAST')}

${toMarkdownOl(cast, castIds)}`
    : ''
}

${
  attrIds.length > 0
    ? `##### ${t('ATTRIBUTES')}

${toMarkdownOl(attributes, attrIds)}`
    : ''
}

${
  transIds.length > 0
    ? `##### ${t('TRANSPORTS')}

${toMarkdownOl(transports, transIds)}`
    : ''
}

${
  conditions.length > 0
    ? `##### ${t('CONDITIONS')}

${conditions.map((cond, i) => `${i + 1}. ${cond.label}${createTooltip(cond)}`).join('\n')}`
    : ''
}

${
  indicators.length > 0
    ? `##### ${t('INDICATORS')}

${indicators.map((ind, i) => `${i + 1}. ${ind.label}${createTooltip(ind)}`).join('\n')}`
    : ''
}

${
  measures.length > 0
    ? `##### ${t('MEASURES')}
  
${measuresToMarkdown(measures, lookupPartner, findCrimeMeasure)}`
    : ''
}`;
    const contentTabs = [
      {
        title: label,
        md,
      },
    ];

    const tabItem: ITabItem = {
      title: label,
      vnode:
        contentTabs.length === 1
          ? m(SlimdownView, { md: highlighter(contentTabs[0].md) })
          : contentTabs.length > 1
          ? m(Tabs, {
              tabs: contentTabs.map(
                ({ title, md }) =>
                  ({
                    title,
                    vnode: m(SlimdownView, { md: highlighter(md) }),
                  } as ITabItem)
              ),
            })
          : m('div'),
    };
    return tabItem;
  };

  return {
    oninit: ({ attrs: { crimeScript = {} as CrimeScript } }) => {
      const { tracks = [], stages: scenes = [] } = crimeScript;

      // Initialize scene variants from the first track if available
      if (tracks.length > 0) {
        updateTrackSelection(tracks[0].id, tracks, scenes);
      } else {
        // Initialize with first variant of each scene if no tracks exist
        scenes.forEach((s) => {
          if (s.ids && s.ids[0]) {
            curSceneVariants[s.id] = s.ids[0];
            s.actId = s.ids[0];
          }
        });
      }
    },
    view: ({
      attrs: {
        model,
        crimeScript,
        cast = [],
        acts = [],
        attributes = [],
        transports = [],
        locations = [],
        geoLocations = [],
        products = [],
        partners = [],
        curSceneId,
        searchFilter,
        update,
        saveModel,
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
        url = scriptIcon,
      } = crimeScript;

      const scenesWithVariantsCnt = scenes.filter((s) => s.ids && s.ids.length > 1).length || false;
      const curTrack: Track | undefined = curTrackId ? tracks.find((t) => t.id === curTrackId) : undefined;

      // Check if we can add a new track (all scenes have variants selected and no matching track exists)
      const hasCompleteSelection = hasCompleteVariantSelection(scenes, curSceneVariants);
      const matchingTrack = findMatchingTrack(tracks, curSceneVariants);
      const canAddTrack = scenesWithVariantsCnt && hasCompleteSelection && !matchingTrack;

      console.log('Render state:', {
        curTrackId,
        curTrack: curTrack?.label,
        curSceneVariants,
        hasCompleteSelection,
        canAddTrack,
        matchingTrack: matchingTrack?.label,
      });

      const [allCastIds, allAttrIds, allLocIds, allTranspIds] = scenes.reduce(
        (acc, stage) => {
          const act = acts.find((a) => a.id === stage.actId);
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
      const curAct =
        curScene && acts.find((a) => (curScene.actId ? a.id === curScene.actId : a.id === curScene.ids[0]));
      const selectedActContent = curAct
        ? visualizeAct(curAct, cast, attributes, transports, locations, mdHighlighter)
        : undefined;

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

      const steps = scenes.map(({ id, actId, ids = [], isGeneric, label = '...', icon, url, description = '' }) => {
        const imgSrc = (icon === ICONS.OTHER ? url : IconOpts.find((i) => i.id === icon)?.img) || missingIcon;
        const variants =
          ids.length > 1
            ? ids
                .map((variantId) => {
                  const variant = acts.find((a) => a.id === variantId);
                  return variant
                    ? {
                        id: variantId,
                        title: variant.label,
                      }
                    : undefined;
                })
                .filter(Boolean)
            : undefined;
        return {
          id,
          title: label,
          icon: imgSrc,
          description: m(SlimdownView, { md: description, removeParagraphs: true }),
          variants,
          isGeneric,
          curVariantId: actId,
        } as ProcessStep & { isGeneric?: boolean };
      });

      return m('.col.s12', [
        m(
          '.row',
          m(
            '.col.s9',
            m(
              'h4',
              highlighter(`${label}${productIds.length > 0 ? ` (${toCommaSeparatedList(products, productIds)})` : ''}`)
            ),
            geoLocationIds.length > 0 &&
              m(
                'i.geo-location',
                highlighter(
                  `${t('GEOLOCATIONS', geoLocationIds.length)}: ${toCommaSeparatedList(geoLocations, geoLocationIds)}`
                )
              )
          ),
          m(
            '.col.s3',
            m('img.right', {
              src: url,
              alt: 'Icon',
              style: { border: '2px solid black', borderRadius: '10px', maxWidth: '100px', maxHeight: '100px' },
            })
          )
        ),

        description && m('p', highlighter(description)),
        m('.row', [
          m('.col.s6.m4', [allCastIds.size > 0 && [m('h5', t('CAST')), m('ol', toLi(allCastIds, cast))]]),
          m('.col.s6.m4', [allAttrIds.size > 0 && [m('h5', t('ATTRIBUTES')), m('ol', toLi(allAttrIds, attributes))]]),
          m('.col.s6.m4', [
            allTranspIds.size > 0 && [
              m('h5', t('TRANSPORTS', allTranspIds.size)),
              m('ol', toLi(allTranspIds, transports)),
            ],
            allLocIds.size > 0 && [m('h5', t('LOCATIONS', allLocIds.size)), m('ol', toLi(allLocIds, locations))],
          ]),
        ]),
        literature &&
          literature.length > 0 && [m('h5', t('REFERENCES')), m(ReferenceListComponent, { references: literature })],

        scenesWithVariantsCnt && [
          m('h5', t('TRACKS')),
          m('.row.tracks', [
            m(Select<string>, {
              label: t('TRACK'),
              className: 'col s6 m3',
              placeholder: t('NO_TRACK'),
              options: tracks,
              disabled: tracks.length === 0,
              checkedId: curTrackId || '',
              onchange: (options) => {
                const selectedTrackId = options[0];
                console.log('Track dropdown changed:', selectedTrackId);
                if (selectedTrackId && selectedTrackId !== '') {
                  updateTrackSelection(selectedTrackId, tracks, scenes);
                } else {
                  curTrackId = undefined;
                }
                m.redraw();
              },
            }),
            m(FlatButton, {
              modalId: 'add_track',
              iconName: 'add',
              label: t('ADD_TRACK'),
              className: 'col s6 m3',
              disabled: !canAddTrack,
              onclick: () => {
                newTrack = {
                  sceneVariants: { ...curSceneVariants },
                  label: `Track ${tracks.length + 1}`,
                  description: '',
                } as Track;
              },
            }),
            m(FlatButton, {
              modalId: 'edit_track',
              iconName: 'edit',
              label: t('EDIT_TRACK'),
              className: 'col s6 m3',
              disabled: !curTrack,
              onclick: () => {
                if (curTrack) {
                  editTrack = { ...curTrack };
                }
              },
            }),
            m(FlatButton, {
              modalId: 'del_track',
              iconName: 'delete',
              label: t('DEL_TRACK'),
              className: 'col s6 m3',
              disabled: !curTrack,
            }),
          ]),
          curTrack &&
            curTrack.description &&
            m('.row', m(SlimdownView, { className: 'col s12', md: curTrack.description })),
        ],

        m('h5', t('SCENES')),
        m(showProcessVisualization ? Button : FlatButton, {
          label: t('MAIN_ACTS'),
          style: 'font-size: 16px;',
          onclick: () => {
            showProcessVisualization = true;
            const scene = scenes.length > 0 ? scenes[0] : undefined;
            if (scene) {
              update({ curSceneId: scene.id, curActId: scene.actId || (scene.ids ? scene.ids[0] : undefined) });
            }
          },
        }),
        steps
          .filter((s) => s.isGeneric)
          .map((s) =>
            m(curScene && curScene.id === s.id ? Button : FlatButton, {
              label: s.title,
              style: 'font-size: 16px;',
              onclick: () => {
                const scene = scenes.find((stage) => stage.id === s.id);
                if (scene) {
                  showProcessVisualization = false;
                  update({ curSceneId: scene.id, curActId: scene.actId || (scene.ids ? scene.ids[0] : undefined) });
                }
              },
            })
          ),
        showProcessVisualization &&
          m(ProcessVisualization, {
            steps: steps.filter((s) => !s.isGeneric),
            selectedStep: curScene?.id,
            selectedVariant: curAct?.id,
            onStepSelect: (stepId) => {
              update({ curSceneId: stepId });
            },
            onVariantSelect: (stepId, variantId) => {
              handleVariantSelection(stepId, variantId, tracks, scenes);
              update({ curActId: variantId });
              m.redraw();
            },
          }),
        selectedActContent && [m('h4', selectedActContent.title), selectedActContent.vnode],

        // Add Track Modal
        m(ModalPanel, {
          id: 'add_track',
          title: t('ADD_TRACK'),
          description: m(
            '.row',
            newTrack &&
              m(LayoutForm<Track>, {
                form: trackForm,
                obj: newTrack,
                onchange: (_, obj) => {
                  newTrack = obj;
                },
              })
          ),
          buttons: [
            { label: t('CANCEL'), iconName: 'cancel' },
            {
              label: t('ADD_TRACK'),
              iconName: 'add',
              onclick: () => {
                if (newTrack && newTrack.label) {
                  tracks.push(newTrack);
                  curTrackId = newTrack.id;
                  crimeScript.tracks = tracks;
                  model.crimeScripts = model.crimeScripts.map((c) => (c.id === crimeScript.id ? crimeScript : c));
                  newTrack = undefined;
                  saveModel(model);
                }
              },
            },
          ],
        }),

        // Edit Track Modal
        m(ModalPanel, {
          id: 'edit_track',
          title: t('EDIT_TRACK'),
          description: m(
            '.row',
            editTrack &&
              m(LayoutForm<Track>, {
                form: trackForm,
                obj: editTrack,
                onchange: (_, obj) => {
                  editTrack = obj;
                },
              })
          ),
          buttons: [
            { label: t('CANCEL'), iconName: 'cancel' },
            {
              label: t('SAVE'),
              iconName: 'save',
              onclick: () => {
                if (editTrack && curTrack) {
                  // Update the track in the tracks array
                  const trackIndex = tracks.findIndex((t) => t.id === curTrack.id);
                  if (trackIndex !== -1) {
                    tracks[trackIndex] = editTrack;
                    crimeScript.tracks = tracks;
                    model.crimeScripts = model.crimeScripts.map((c) => (c.id === crimeScript.id ? crimeScript : c));
                    editTrack = undefined;
                    saveModel(model);
                  }
                }
              },
            },
          ],
        }),

        // Delete Track Modal
        m(ModalPanel, {
          id: 'del_track',
          title: t('DEL_TRACK'),
          description: m(
            '.row',
            curTrack &&
              m(LayoutForm<Track>, {
                form: trackForm,
                obj: curTrack,
                readonly: true,
              })
          ),
          buttons: [
            { label: t('CANCEL'), iconName: 'cancel' },
            {
              label: t('DEL_TRACK'),
              iconName: 'delete',
              onclick: () => {
                if (curTrack) {
                  crimeScript.tracks = tracks.filter((t) => t.id !== curTrack.id);
                  model.crimeScripts = model.crimeScripts.map((c) => (c.id === crimeScript.id ? crimeScript : c));
                  curTrackId = undefined;
                  saveModel(model);
                }
              },
            },
          ],
        }),
      ]);
    },
  };
};

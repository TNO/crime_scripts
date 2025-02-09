import m, { FactoryComponent } from 'mithril';
import {
  Act,
  Cast,
  CrimeLocation,
  CrimeScript,
  CrimeScriptAttributes,
  GeographicLocation,
  ICONS,
  ID,
  IconOpts,
  Labeled,
  Pages,
  Partner,
  Product,
  ServiceProvider,
  Transport,
  missingIcon,
  scriptIcon,
} from '../../models';
import { routingSvc, State } from '../../services';
import { FlatButton, ITabItem, Tabs } from 'mithril-materialized';
import { SlimdownView } from 'mithril-ui-form';
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
  serviceProviders: ServiceProvider[];
  curActIdx?: number;
  curPhaseIdx?: number;
  searchFilter?: string;
  update: (patch: Patch<State>) => void;
}> = () => {
  const lookupPartner = new Map<ID, Labeled>();
  const findCrimeMeasure = lookupCrimeMeasure();

  const visualizeAct = (
    { label = '...', activities = [], indicators = [], conditions = [], locationIds = [], measures = [] } = {} as Act,
    cast: Cast[],
    serviceProviders: ServiceProvider[],
    attributes: CrimeScriptAttributes[],
    transports: Transport[],
    locations: CrimeLocation[],
    curPhaseIdx = -1,
    highlighter: (text?: string) => string | undefined
  ) => {
    {
      const castIds = Array.from(
        activities.reduce((acc, { cast: curCast }) => {
          if (curCast) curCast.forEach((id) => acc.add(id));
          return acc;
        }, new Set<ID>())
      );
      const spIds = Array.from(
        activities.reduce((acc, { sp }) => {
          if (sp) sp.forEach((id) => acc.add(id));
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
  spIds.length > 0
    ? `##### ${t('SERVICE_PROVIDERS')}

${toMarkdownOl(serviceProviders, spIds)}`
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
                  ({ title, md }, index) =>
                    ({
                      title,
                      active: index === curPhaseIdx,
                      vnode: m(SlimdownView, { md: highlighter(md) }),
                    } as ITabItem)
                ),
              })
            : m('div'),
      };
      return tabItem;
    }
  };

  return {
    view: ({
      attrs: {
        crimeScript,
        cast = [],
        serviceProviders = [],
        acts = [],
        attributes = [],
        transports = [],
        locations = [],
        geoLocations = [],
        products = [],
        partners = [],
        curActIdx = -1,
        curPhaseIdx = 0,
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
        stages = [],
        productIds = [],
        geoLocationIds = [],
        url = scriptIcon,
      } = crimeScript;
      const [allCastIds, allSpIds, allAttrIds, allLocIds, allTranspIds] = stages.reduce(
        (acc, stage) => {
          const act = acts.find((a) => a.id === stage.id);
          if (act) {
            if (act.locationIds) {
              act.locationIds.forEach((id) => acc[3].add(id));
            }
            act.activities.forEach((activity) => {
              activity.cast?.forEach((id) => acc[0].add(id));
              activity.sp?.forEach((id) => acc[1].add(id));
              activity.attributes?.forEach((id) => acc[2].add(id));
              activity.transports?.forEach((id) => acc[4].add(id));
            });
          }
          return acc;
        },
        [new Set<ID>(), new Set<ID>(), new Set<ID>(), new Set<ID>(), new Set<ID>()] as [
          cast: Set<ID>,
          sp: Set<ID>,
          attr: Set<ID>,
          locs: Set<ID>,
          transp: Set<ID>
        ]
      );
      const selectedAct =
        0 <= curActIdx && curActIdx < acts.length
          ? acts[curActIdx]
          : stages.length > 0
          ? acts.find((a) => a.id === stages[0].id)
          : undefined;
      const selectedActContent = selectedAct
        ? visualizeAct(
            selectedAct,
            cast,
            serviceProviders,
            attributes,
            transports,
            locations,
            curPhaseIdx,
            mdHighlighter
          )
        : undefined;

      const toLi = (ids: Set<string>, labels: Labeled[]) =>
        Array.from(ids).map((id) =>
          m(
            'li',
            m(
              'a',
              {
                href: routingSvc.href(Pages.SETTINGS, `id=${id}`),
              },
              highlighter(labels.find((c) => c.id === id)?.label)
            )
          )
        );

      const steps = stages
        .map(({ id: actId, ids }) => {
          const act = acts.find((a) => a.id === actId);
          if (act) {
            const { id, label = '...', icon, url, description = '', isGeneric } = act;
            const imgSrc = (icon === ICONS.OTHER ? url : IconOpts.find((i) => i.id === icon)?.img) || missingIcon;
            const variants =
              ids.length > 1
                ? ids
                    .filter((id) => id !== actId)
                    .map((variantId) => {
                      const variant = acts.find((a) => a.id === variantId);
                      return variant
                        ? {
                            id: variantId,
                            icon:
                              (variant.icon === ICONS.OTHER
                                ? variant.url
                                : IconOpts.find((i) => i.id === variant.icon)?.img) || missingIcon,
                            title: variant.label,
                          }
                        : undefined;
                    })
                    .filter(Boolean)
                : undefined;
            // const actId = selectedAct ? selectedAct.id : undefined;
            return {
              id,
              title: label,
              icon: imgSrc,
              description: m(SlimdownView, { md: description, removeParagraphs: true }),
              variants,
              isGeneric,
            } as ProcessStep & { isGeneric?: boolean };
          } else {
            return undefined;
          }
        })
        .filter(Boolean) as Array<ProcessStep & { isGeneric?: boolean }>;

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
          m('.col.s6.m4.l3', [allCastIds.size > 0 && [m('h5', t('CAST')), m('ol', toLi(allCastIds, cast))]]),
          m('.col.s6.m4.l3', [
            allSpIds.size > 0 && [m('h5', t('SERVICE_PROVIDERS')), m('ol', toLi(allSpIds, serviceProviders))],
          ]),
          m('.col.s6.m4.l3', [
            allAttrIds.size > 0 && [m('h5', t('ATTRIBUTES')), m('ol', toLi(allAttrIds, attributes))],
          ]),
          m('.col.s6.m4.l3', [
            allTranspIds.size > 0 && [
              m('h5', t('TRANSPORTS', allTranspIds.size)),
              m('ol', toLi(allTranspIds, transports)),
            ],
            allLocIds.size > 0 && [m('h5', t('LOCATIONS', allLocIds.size)), m('ol', toLi(allLocIds, locations))],
          ]),
        ]),
        literature &&
          literature.length > 0 && [m('h5', t('REFERENCES')), m(ReferenceListComponent, { references: literature })],
        m('h5', t('ACTS')),
        m(FlatButton, {
          label: t('MAIN_ACTS'),
          style: 'font-size: 16px;',
          onclick: () => {
            const stage = stages.length > 0 ? stages[0] : undefined;
            if (stage) {
              // stage.id = variantId;
              update({ curActIdx: acts.findIndex((a) => a.id === stage.id) });
            }
          },
        }),
        steps
          .filter((s) => s.isGeneric)
          .map((s) =>
            m(FlatButton, {
              label: s.title,
              style: 'font-size: 16px;',
              onclick: () => {
                const stage = stages.find((stage) => stage.id === s.id);
                if (stage) {
                  // stage.id = variantId;
                  update({ curActIdx: acts.findIndex((a) => a.id === s.id) });
                }
              },
            })
          ),
        m(ProcessVisualization, {
          steps: steps.filter((s) => !s.isGeneric),
          selectedStep: selectedAct?.id,
          onStepSelect: (stepId) => update({ curActIdx: acts.findIndex((a) => a.id === stepId) }),
          onVariantSelect: (stepId, variantId) => {
            const stage = stages.find((s) => s.id === stepId);
            if (stage) {
              stage.id = variantId;
              update({ curActIdx: acts.findIndex((a) => a.id === variantId) });
            }
          },
        }),
        selectedActContent && [m('h4', selectedActContent.title), selectedActContent.vnode],
      ]);
    },
  };
};

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
  Partner,
  Product,
  ServiceProvider,
  missingIcon,
} from '../../models';
import { State } from '../../services';
import { ITabItem, Tabs } from 'mithril-materialized';
import { render, SlimdownView } from 'mithril-ui-form';
import { Patch } from 'meiosis-setup/types';
import { ReferenceListComponent } from '../ui/reference';
import { lookupCrimeMeasure } from '../../models/situational-crime-prevention';
import { t } from '../../services/translations';
import {
  generateLabeledItemsMarkup,
  measuresToMarkdown,
  toCommaSeparatedList,
  toMarkdownOl,
  toMarkdownUl,
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
  serviceProviders: ServiceProvider[];
  curActIdx?: number;
  curPhaseIdx?: number;
  update: (patch: Patch<State>) => void;
}> = () => {
  const lookupPartner = new Map<ID, Labeled>();
  const findCrimeMeasure = lookupCrimeMeasure();

  const visualizeAct = (
    { label = '...', activities = [], indicators = [], conditions = [], locationIds = [] } = {} as Act,
    cast: Cast[],
    serviceProviders: ServiceProvider[],
    attributes: CrimeScriptAttributes[],
    locations: CrimeLocation[],
    curPhaseIdx = -1
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
      const md = `${
        locationIds && locationIds.length
          ? `##### ${t('LOCATIONS', locationIds.length)}

${toMarkdownUl(locations, locationIds)}`
          : ''
      }

${generateLabeledItemsMarkup(activities)}


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
  conditions.length > 0
    ? `##### ${t('CONDITIONS')}

${conditions.map((cond, i) => `${i + 1}. ` + cond.label).join('\n')}`
    : ''
}

${
  indicators.length > 0
    ? `##### ${t('INDICATORS')}

${indicators.map((ind, i) => `${i + 1}. ` + ind.label).join('\n')}`
    : ''
}

${
  attrIds.length > 0
    ? `##### ${t('ATTRIBUTES')}

${toMarkdownOl(attributes, attrIds)}`
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
            ? m(SlimdownView, { md: contentTabs[0].md })
            : contentTabs.length > 1
            ? m(Tabs, {
                tabs: contentTabs.map(
                  ({ title, md }, index) =>
                    ({
                      title,
                      active: index === curPhaseIdx,
                      vnode: m(SlimdownView, { md }),
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
        locations = [],
        geoLocations = [],
        products = [],
        partners = [],
        curActIdx = -1,
        curPhaseIdx = 0,
        update,
      },
    }) => {
      if (lookupPartner.size < partners.length) {
        partners.forEach((p) => lookupPartner.set(p.id, p));
      }
      const { label = '...', description, literature, stages = [], productIds = [], geoLocationIds = [] } = crimeScript;
      const [allCastIds, allSpIds, allAttrIds, allLocIds] = stages.reduce(
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
            });
          }
          return acc;
        },
        [new Set<ID>(), new Set<ID>(), new Set<ID>(), new Set<ID>()] as [
          cast: Set<ID>,
          sp: Set<ID>,
          attr: Set<ID>,
          locs: Set<ID>
        ]
      );
      const selectedAct =
        0 <= curActIdx && curActIdx < acts.length
          ? acts[curActIdx]
          : stages.length > 0
          ? acts.find((a) => a.id === stages[0].id)
          : undefined;
      const selectedActContent = selectedAct
        ? visualizeAct(selectedAct, cast, serviceProviders, attributes, locations, curPhaseIdx)
        : undefined;
      console.log(selectedAct?.measures);
      const measuresMd =
        selectedAct && selectedAct.measures?.length > 0
          ? `##### ${t('MEASURES')}

${measuresToMarkdown(selectedAct.measures, lookupPartner, findCrimeMeasure)}`
          : undefined;
      // ${selectedAct.measures
      //   .map((measure, i) => `${i + 1}. **${findCrimeMeasure(measure.cat)?.label}:** ${measure.label}`)
      //   .join('\n')}`;

      const steps = stages
        .map(({ id: actId, ids }) => {
          const act = acts.find((a) => a.id === actId);
          if (act) {
            const { id, label = '...', icon, url, description = '' } = act;
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
            } as ProcessStep;
          } else {
            return undefined;
          }
        })
        .filter(Boolean) as ProcessStep[];

      return m('.col.s12', [
        m('h4', `${label}${productIds.length > 0 ? ` (${toCommaSeparatedList(products, productIds)})` : ''}`),
        geoLocationIds.length > 0 &&
          m(
            'i.geo-location',
            `${t('GEOLOCATIONS', geoLocationIds.length)}: ${toCommaSeparatedList(geoLocations, geoLocationIds)}`
          ),
        description && m('p', description),
        m('.row', [
          m('.col.s6.m4.l3', [
            allCastIds.size > 0 && [
              m('h5', t('CAST')),
              m(
                'ol',
                Array.from(allCastIds).map((id) => m('li', cast.find((c) => c.id === id)?.label))
              ),
            ],
          ]),
          m('.col.s6.m4.l3', [
            allSpIds.size > 0 && [
              m('h5', t('SERVICE_PROVIDERS')),
              m(
                'ol',
                Array.from(allSpIds).map((id) => m('li', serviceProviders.find((c) => c.id === id)?.label))
              ),
            ],
          ]),
          m('.col.s6.m4.l3', [
            allAttrIds.size > 0 && [
              m('h5', t('ATTRIBUTES')),
              m(
                'ol',
                Array.from(allAttrIds)
                  .map((id) => attributes.find((c) => c.id === id))
                  .filter((a) => a?.label)
                  .map((a) => m('li', a?.label))
              ),
            ],
          ]),
          m('.col.s6.m4.l3', [
            allLocIds.size > 0 && [
              m('h5', t('LOCATIONS', allLocIds.size)),
              m(
                'ol',
                Array.from(allLocIds).map((id) => m('li', locations.find((c) => c.id === id)?.label))
              ),
            ],
          ]),
        ]),
        literature &&
          literature.length > 0 && [m('h5', t('REFERENCES')), m(ReferenceListComponent, { references: literature })],
        m('h5', t('ACTS')),
        m(ProcessVisualization, {
          steps,
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
        selectedActContent && [
          m('h4', selectedActContent.title),
          selectedAct?.activities && selectedAct?.activities?.length > 0 && m('h5', t('ACTIVITIES')),
          selectedActContent.vnode,
        ],
        measuresMd && m('div.markdown', m.trust(render(measuresMd))),
      ]);
    },
  };
};

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
  Product,
  Stage,
  missingIcon,
} from '../../models';
import { State } from '../../services';
import { ITabItem, Tabs, Icon } from 'mithril-materialized';
import { render, SlimdownView } from 'mithril-ui-form';
import { Patch } from 'meiosis-setup/types';
import { ReferenceListComponent } from '../ui/reference';
import { lookupCrimeMeasure } from '../../models/situational-crime-prevention';
import { t } from '../../services/translations';
import { generateLabeledItemsMarkup, toCommaSeparatedList, toMarkdownOl, toMarkdownUl } from '../../utils';

export const CrimeScriptViewer: FactoryComponent<{
  crimeScript: CrimeScript;
  cast: Cast[];
  acts: Act[];
  attributes: CrimeScriptAttributes[];
  locations: CrimeLocation[];
  geoLocations: GeographicLocation[];
  products: Product[];
  curActIdx?: number;
  curPhaseIdx?: number;
  update: (patch: Patch<State>) => void;
}> = () => {
  const findCrimeMeasure = lookupCrimeMeasure();

  const visualizeAct = (
    { label = '...', activities = [], conditions = [], locationIds = [] } = {} as Act,
    cast: Cast[],
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
      const attrIds = Array.from(
        activities.reduce((acc, { attributes: curAttr }) => {
          if (curAttr) curAttr.forEach((id) => acc.add(id));
          return acc;
        }, new Set<ID>())
      );
      const md = `${
        locationIds
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
  conditions.length > 0
    ? `##### ${t('CONDITIONS')}

${conditions.map((cond, i) => `${i + 1}. ` + cond.label).join('\n')}`
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
        acts = [],
        attributes = [],
        locations = [],
        geoLocations = [],
        products = [],
        curActIdx = -1,
        curPhaseIdx = 0,
        update,
      },
    }) => {
      const { label = '...', description, literature, stages = [], productIds = [], geoLocationIds = [] } = crimeScript;
      const [allCastIds, allAttrIds, allLocIds] = stages.reduce(
        (acc, stage) => {
          const act = acts.find((a) => a.id === stage.id);
          if (act) {
            if (act.locationIds) {
              act.locationIds.forEach((id) => acc[2].add(id));
            }
            act.activities.forEach((activity) => {
              activity.cast?.forEach((id) => acc[0].add(id));
              activity.attributes?.forEach((id) => acc[1].add(id));
            });
          }
          return acc;
        },
        [new Set<ID>(), new Set<ID>(), new Set<ID>()] as [cast: Set<ID>, attr: Set<ID>, locs: Set<ID>]
      );
      const allStages = stages.reduce((acc, cur, index) => {
        cur.ids.forEach((id, idx) => {
          const act = acts.find((a) => a.id === id);
          if (act) {
            const counter = `${index + 1}${cur.ids.length === 1 ? '' : String.fromCharCode(97 + idx)}`;
            const title = `${counter}. ${act.label}`;
            const selectedVariant = cur.ids.length > 1 && id === cur.id;
            acc.push({ stage: cur, stageIdx: index, title, act, selectedVariant });
          }
        });
        return acc;
      }, [] as Array<{ stage: Stage; stageIdx: number; title: string; act: Act; selectedVariant: boolean }>);
      const selectedAct = curActIdx >= 0 ? acts[curActIdx] : allStages.length > 0 ? allStages[0].act : undefined;
      const selectedActContent = selectedAct
        ? visualizeAct(selectedAct, cast, attributes, locations, curPhaseIdx)
        : undefined;
      const measuresMd =
        selectedAct &&
        selectedAct.measures.length > 0 &&
        `##### ${t('MEASURES')}

${selectedAct.measures
  .map((measure, i) => `${i + 1}. ${findCrimeMeasure(measure.cat)?.label}: ${measure.label}`)
  .join('\n')}`;

      return m('.col.s12', [
        m(
          'h4',
          `${label}${productIds.length > 0 ? ` (${toCommaSeparatedList(products, productIds).toLowerCase()})` : ''}`
        ),
        geoLocationIds.length > 0 &&
          m(
            'i.geo-location',
            `${t('GEOLOCATIONS', geoLocationIds.length)}: ${toCommaSeparatedList(geoLocations, geoLocationIds)}`
          ),
        description && m('p', description),
        m('.row', [
          m('.col.s4', [
            allCastIds.size > 0 && [
              m('h5', t('CAST')),
              m(
                'ol',
                Array.from(allCastIds).map((id) => m('li', cast.find((c) => c.id === id)?.label))
              ),
            ],
          ]),
          m('.col.s4', [
            allAttrIds.size > 0 && [
              m('h5', t('ATTRIBUTES')),
              m(
                'ol',
                Array.from(allAttrIds).map((id) => m('li', attributes.find((c) => c.id === id)?.label))
              ),
            ],
          ]),
          m('.col.s4', [
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
        m(
          'ul.collection',
          allStages.map(({ stage, selectedVariant, title, act }) => {
            const { id, label = '...', icon, url, description = '' } = act;
            const imgSrc = (icon === ICONS.OTHER ? url : IconOpts.find((i) => i.id === icon)?.img) || missingIcon;
            const actId = selectedAct ? selectedAct.id : undefined;
            const onclick = () => {
              stage.id = id;
              update({ curActIdx: acts.findIndex((a) => a.id === id) });
            };
            return m(
              'li.collection-item.avatar.cursor-pointer',
              { onclick, class: actId === id ? 'active' : undefined },
              [
                m('img.circle', { src: imgSrc, alt: label }),
                m('span.title', title, selectedVariant ? m('sup', '*') : undefined),
                m('p.markdown', m.trust(render(description, true))),
                m(
                  'a.secondary-content',
                  { href: window.location.href },
                  m(Icon, {
                    iconName: 'more_horiz',
                    onclick,
                  })
                ),
              ]
            );
          })
        ),
        selectedActContent && [m('h4', selectedActContent.title), selectedActContent.vnode],
        measuresMd && m('div.markdown', m.trust(render(measuresMd))),
      ]);
    },
  };
};

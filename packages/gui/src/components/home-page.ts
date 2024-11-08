import m from 'mithril';
import { Act, CrimeScript, CrimeScriptFilter, Hierarchical, ID, Labeled, Pages, scriptIcon } from '../models';
import { MeiosisComponent, routingSvc } from '../services';
import { FlatButton, uniqueId, Icon } from 'mithril-materialized';
import { I18N, t } from '../services/translations';
import { toCommaSeparatedList } from '../utils';
import { FormAttributes, LayoutForm, UIForm } from 'mithril-ui-form';
import { crimeScriptFilterFormFactory } from '../models/forms';
// import lz from 'lz-string';

export const HomePage: MeiosisComponent = () => {
  const actLocations = (cs: CrimeScript, acts: Act[]) => {
    const csActs = cs.stages
      .map((stage) => acts.find((a) => a.id === stage.id))
      .filter((a) => typeof a !== 'undefined');
    return csActs.reduce((acc, act) => {
      if (act.locationIds) {
        acc.push(...act.locationIds);
      }
      return acc;
    }, [] as ID[]);
  };

  const includeChildren = (arr: Array<Hierarchical & Labeled>, ids: ID[]) => {
    const included = arr.filter((a) => ids.includes(a.id)).map((a) => a.id);
    const children = arr.filter((a) => a.parents?.some((p) => ids.includes(p))).map((a) => a.id);
    const grandchildren = arr.filter((a) => a.parents?.some((p) => children.includes(p))).map((a) => a.id);
    return [...included, ...children, ...grandchildren];
  };

  let crimeScriptFilterForm: UIForm<CrimeScriptFilter>;

  return {
    oninit: ({
      attrs: {
        state: { model },
        actions: { setPage },
      },
    }) => {
      const { products = [], geoLocations = [], locations = [] } = model;
      crimeScriptFilterForm = crimeScriptFilterFormFactory(
        products,
        locations,
        geoLocations
      ) as UIForm<CrimeScriptFilter>;
      setPage(Pages.HOME);
    },
    view: ({ attrs: { state, actions } }) => {
      const { model, role, crimeScriptFilter = {} as CrimeScriptFilter } = state;
      const { crimeScripts = [], products = [], geoLocations = [], locations = [], acts = [] } = model;
      const isAdmin = role === 'admin';

      const csFilter =
        crimeScriptFilter.productIds?.length > 0 ||
        crimeScriptFilter.geoLocationIds?.length > 0 ||
        crimeScriptFilter.locationIds?.length > 0
          ? (cs: CrimeScript, _idx: number, _arr: CrimeScript[]) => {
              const { productIds = [], locationIds = [], geoLocationIds = [] } = crimeScriptFilter;
              const allProductIds = includeChildren(products, productIds);
              const allGeoIds = includeChildren(geoLocations, geoLocationIds);
              const allLocIds = includeChildren(locations, locationIds);
              return (
                (allProductIds.length === 0 || cs.productIds?.some((id) => allProductIds.includes(id))) &&
                (allGeoIds?.length === 0 || cs.geoLocationIds?.some((id) => allGeoIds?.includes(id))) &&
                (allLocIds?.length === 0 || actLocations(cs, acts).some((id) => allLocIds?.includes(id)))
              );
            }
          : (_cs: CrimeScript, _idx: number, _arr: CrimeScript[]) => true;

      return m('#home-page.row.home.page', [
        isAdmin &&
          m(
            '.right-align',
            m(FlatButton, {
              label: t('NEW_SCRIPT'),
              iconName: 'add',
              className: 'small',
              onclick: () => {
                const newCrimeScript = { id: uniqueId() } as CrimeScript;
                model.crimeScripts.push(newCrimeScript);
                actions.saveModel(model);
                actions.changePage(Pages.HOME, { id: newCrimeScript.id });
              },
            })
          ),
        m(
          '.col.s12.filters',
          m(LayoutForm, {
            form: crimeScriptFilterForm,
            obj: crimeScriptFilter,
            onchange: () => {
              actions.update({ crimeScriptFilter });
            },
            i18n: I18N,
          } as FormAttributes<CrimeScriptFilter>)
        ),
        m(
          '.crime-scenes',
          m('ul.collection.with-header', [
            m('li.collection-header', m('h4', 'Crime Scripts')),
            crimeScripts
              .filter(csFilter)
              .map(({ url = scriptIcon, label, description, id, productIds = [], geoLocationIds = [] }) => {
                const onclick = () => {
                  actions.changePage(Pages.CRIME_SCRIPT, { id });
                  actions.update({ currentCrimeScriptId: id });
                };
                return m('li.collection-item.avatar.cursor-pointer', { onclick }, [
                  m('img.circle', { src: url, alt: 'Avatar' }),
                  m(
                    'span.title',
                    `${label}${
                      productIds.length > 0
                        ? ` (${t('PRODUCTS', productIds.length).toLowerCase()}: ${toCommaSeparatedList(
                            products,
                            productIds
                          )})`
                        : ''
                    }`
                  ),
                  geoLocationIds.length > 0 &&
                    m(
                      'p',
                      m(
                        'i',
                        `${t('GEOLOCATIONS', geoLocationIds.length)}: ${toCommaSeparatedList(
                          geoLocations,
                          geoLocationIds
                        )}`
                      )
                    ),
                  m('p', description),
                  m(
                    'a.secondary-content',
                    { href: routingSvc.href(Pages.CRIME_SCRIPT, `id=${id}`) },
                    m(Icon, { iconName: 'more_horiz' })
                  ),
                ]);
              }),
          ])
        ),
      ]);
    },
  };
};

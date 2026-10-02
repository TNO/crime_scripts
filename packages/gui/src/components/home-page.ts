import m from 'mithril';
import { Dialog, FlatButton, Icon } from 'mithril-materialized';
import { type FormAttributes, LayoutForm, type UIForm } from 'mithril-ui-form';
import {
  type CrimeScript,
  type CrimeScriptFilter,
  type Hierarchical,
  type ID,
  type Labelled,
  Pages,
  scriptIcon,
  scriptsForMode,
} from '../models';
import { crimeScriptFilterFormFactory } from '../models/forms';
import { type MeiosisComponent, routingSvc } from '../services';
import { I18N, t } from '../services/translations';
import { sortByLabel } from '../utils';
import { IconStrip } from './ui/icon-strip';
import { LlmScriptWizard } from './ui/llm_script_wizard';
import { NewScriptWizard } from './ui/new_script_wizard';
// import lz from 'lz-string';

export const HomePage: MeiosisComponent = () => {
  let wizardOpen = false;
  let llmWizardOpen = false;
  let labelFilter: { aiGenerated?: boolean; reviewed?: boolean } = {};

  const actLocations = (cs: CrimeScript) => {
    const csActs = cs.stages
      .map((stage) => stage.variants.find((variant) => variant.id === stage.selectedVariantId) || stage.variants[0])
      .filter((a) => typeof a !== 'undefined');
    return csActs.reduce((acc, act) => {
      if (act.locationIds) {
        acc.push(...act.locationIds);
      }
      return acc;
    }, [] as ID[]);
  };

  const includeChildren = (arr: Array<Hierarchical & Labelled>, ids: ID[]) => {
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
      const { model, role, scriptMode, crimeScriptFilter = {} as CrimeScriptFilter } = state;
      const { crimeScripts = [], products = [], geoLocations = [], locations = [] } = model;
      const isAdmin = role === 'admin';

      const csFilter = (cs: CrimeScript) => {
        const { productIds = [], locationIds = [], geoLocationIds = [] } = crimeScriptFilter;
        const allProductIds = includeChildren(products, productIds);
        const allGeoIds = includeChildren(geoLocations, geoLocationIds);
        const allLocIds = includeChildren(locations, locationIds);
        return (
          (allProductIds.length === 0 || cs.productIds?.some((id) => allProductIds.includes(id))) &&
          (allGeoIds.length === 0 || cs.geoLocationIds?.some((id) => allGeoIds.includes(id))) &&
          (allLocIds.length === 0 || actLocations(cs).some((id) => allLocIds.includes(id))) &&
          (!labelFilter.aiGenerated || cs.aiGenerated) &&
          (labelFilter.reviewed === undefined ||
            (cs.status >= 4 && !cs.unreviewed) === labelFilter.reviewed)
        );
      };
      const toggleFilter = (field: 'aiGenerated' | 'reviewed', value: boolean) => {
        labelFilter = { ...labelFilter, [field]: labelFilter[field] === value ? undefined : value };
      };
      const visibleCrimeScripts = scriptsForMode(crimeScripts, scriptMode)
        .sort(sortByLabel)
        .filter(csFilter);

      return m('#home-page.row.home.page', [
        wizardOpen &&
        m(Dialog, {
          id: 'new-script-wizard',
          title: t('NEW_SCRIPT'),
          isOpen: true,
          onToggle: (open: boolean) => (wizardOpen = open),
          content: m(NewScriptWizard, {
            state,
            actions,
          }),
        }),
        llmWizardOpen &&
        m(Dialog, {
          id: 'llm-script-wizard',
          title: t('LLM_WIZARD_TITLE'),
          isOpen: true,
          onToggle: (open: boolean) => (llmWizardOpen = open),
          content: m(LlmScriptWizard, {
            state,
            actions,
            options: { onClose: () => (llmWizardOpen = false) },
          }),
        }),
        isAdmin &&
        m(
          '.right-align.buttons.home-page-actions',
          [
            m(FlatButton, {
              label: t('LLM_WIZARD_TITLE'),
              iconName: 'auto_awesome',
              className: 'small',
              onclick: () => {
                llmWizardOpen = true;
              },
            }),
            m(FlatButton, {
              label: t('NEW_SCRIPT'),
              iconName: 'add',
              className: 'small',
              onclick: () => {
                wizardOpen = true;
              },
            }),
          ]
        ),
        m(
          '.row.filters',
          m(LayoutForm, {
            form: crimeScriptFilterForm,
            obj: crimeScriptFilter,
            onchange: () => {
              actions.update({ crimeScriptFilter });
            },
            i18n: I18N,
          } as FormAttributes<CrimeScriptFilter>)
        ),
        (labelFilter.aiGenerated || labelFilter.reviewed !== undefined) &&
          m('.active-script-filters', [
            labelFilter.aiGenerated && m('button[type=button].script-filter-chip', {
              onclick: () => toggleFilter('aiGenerated', true),
            }, `${t('AI_GENERATED')} ×`),
            labelFilter.reviewed !== undefined && m('button[type=button].script-filter-chip', {
              onclick: () => toggleFilter('reviewed', labelFilter.reviewed === true),
            }, `${t(labelFilter.reviewed ? 'REVIEWED' : 'UNREVIEWED')} ×`),
          ]),
        m(
          '.crime-scenes',
          m('ul.collection.with-header', [
            m('li.collection-header', m('h4', t('CRIME_SCRIPT_COUNT', {
              count: visibleCrimeScripts.length,
            }))),
            visibleCrimeScripts
              .map(({ icon, icons, url, label, description, id, classification, productIds = [], geoLocationIds = [], aiGenerated, unreviewed, status }) => {
                const onclick = () => {
                  actions.changePage(Pages.CRIME_SCRIPT, { id });
                  actions.update({ currentCrimeScriptId: id });
                };
                return m('li.collection-item.avatar.cursor-pointer', {
                  className: 'script-list-item--with-icons',
                  onclick,
                }, [
                  m(IconStrip, {
                    className: 'script-list-icon-strip',
                    fallback: scriptIcon,
                    icon,
                    icons,
                    uploadedImage: url,
                  }),
                  m('.script-list-title-row', [
                    m('h5.script-list-title', label),
                    m(
                      'span.classification-badge.script-list-classification',
                      t(classification === 'restricted' ? 'RESTRICTED' : 'PUBLIC')
                    ),
                    aiGenerated && m('button[type=button].classification-badge.script-filter-chip', {
                      'aria-pressed': labelFilter.aiGenerated ? 'true' : 'false',
                      onclick: (event: MouseEvent) => {
                        event.stopPropagation();
                        toggleFilter('aiGenerated', true);
                      },
                    }, t('AI_GENERATED')),
                    m('button[type=button].classification-badge.script-filter-chip', {
                      'aria-pressed': labelFilter.reviewed === (status >= 4 && !unreviewed) ? 'true' : 'false',
                      onclick: (event: MouseEvent) => {
                        event.stopPropagation();
                        toggleFilter('reviewed', status >= 4 && !unreviewed);
                      },
                    }, t(status >= 4 && !unreviewed ? 'REVIEWED' : 'UNREVIEWED')),
                  ]),
                  description && m('p.script-list-description', description),
                  (productIds.length > 0 || geoLocationIds.length > 0) &&
                  m('.script-tags', [
                    ...productIds.map((productId) => {
                      const product = products.find(({ id }) => id === productId);
                      const selected = crimeScriptFilter.productIds?.includes(productId) ?? false;
                      return product && m('button.script-product-badge', {
                        type: 'button',
                        'aria-label': `${t('PRODUCTS', 1)}: ${product.label}`,
                        'aria-pressed': selected ? 'true' : 'false',
                        onclick: (event: MouseEvent) => {
                          event.stopPropagation();
                          actions.update({
                            crimeScriptFilter: {
                              ...crimeScriptFilter,
                              productIds: selected
                                ? crimeScriptFilter.productIds.filter((filterId) => filterId !== productId)
                                : [...(crimeScriptFilter.productIds || []), productId],
                            },
                          });
                        },
                      }, product.label);
                    }),
                    ...geoLocationIds.map((locationId) => {
                      const location = geoLocations.find(({ id }) => id === locationId);
                      const selected = crimeScriptFilter.geoLocationIds?.includes(locationId) ?? false;
                      return location && m('button.script-location-badge', {
                        type: 'button',
                        'aria-label': `${t('GEOLOCATIONS', 1)}: ${location.label}`,
                        'aria-pressed': selected ? 'true' : 'false',
                        onclick: (event: MouseEvent) => {
                          event.stopPropagation();
                          actions.update({
                            crimeScriptFilter: {
                              ...crimeScriptFilter,
                              geoLocationIds: selected
                                ? crimeScriptFilter.geoLocationIds.filter((filterId) => filterId !== locationId)
                                : [...(crimeScriptFilter.geoLocationIds || []), locationId],
                            },
                          });
                        },
                      }, location.label);
                    }),
                  ]),
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

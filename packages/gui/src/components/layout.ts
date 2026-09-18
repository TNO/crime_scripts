import m from 'mithril';
import { AlertDialog, Dialog, FlatButton, Icon, TextInput, ThemeManager, ThemeToggle } from 'mithril-materialized';
import logo from '../assets/logo.svg';
import tno from '../assets/tno.svg';
import tno_white from '../assets/tno_white.svg';
import { type DataModel, normalizeDataModel, type Page, Pages, scriptsForMode } from '../models';
import { APP_TITLE, APP_TITLE_SHORT, i18n, type MeiosisComponent, t } from '../services';
import { routingSvc } from '../services/routing-service';
import { isActivePage, isSmallPage, LANGUAGE } from '../utils';
import { LanguageSwitcher } from './ui/language-switcher';
import { SideNav } from './ui/sidenav';

export const Layout: MeiosisComponent = () => {
  const style = 'font-size: 2.2rem; width: 4rem;';
  let searchDialogOpen = false;
  let clearModelOpen = false;
  // let searchDialog: M.Modal;
  // let textInput: HTMLInputElement;

  document.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (
      ev.key !== '/' ||
      searchDialogOpen ||
      (ev.target && (ev.target as HTMLTextAreaElement).type === 'textarea') ||
      (ev.target as HTMLInputElement).type === 'text'
    )
      return;
    ev.preventDefault(); // Prevent the slash key from being inputted into input fields
    searchDialogOpen = true;
    m.redraw();
  });

  return {
    view: ({ children, attrs: { state, actions } }) => {
      const { page, searchFilter, searchResults, model = {} as DataModel } = state;
      const { changePage, setSearchFilter, saveModel } = actions;
      const curPage = routingSvc
        .getList()
        .filter((p) => p.id === page)
        .shift();
      const isActive = isActivePage(page);
      const visibleScriptIds = new Set(scriptsForMode(model.crimeScripts || [], state.scriptMode).map(({ id }) => id));
      const visibleSearchResults = (searchResults || []).filter(({ crimeScriptIdx }) =>
        visibleScriptIds.has(model.crimeScripts[crimeScriptIdx]?.id)
      );

      return [
        state.needsOnboarding &&
          m(Dialog, {
            id: 'starter-onboarding',
            isOpen: true,
            onToggle: () => {},
            title: t('ONBOARDING_TITLE'),
            content: m('.row', [
              m('p.col.s12', state.onboardingError ? t('STARTER_LOAD_FAILED') : t('ONBOARDING_DESCRIPTION')),
              m(LanguageSwitcher, {
                className: 'col s12',
                currentLanguage: i18n.currentLocale,
                onLanguageChange: async (language) => {
                  localStorage.setItem(LANGUAGE, language);
                  await i18n.loadAndSetLocale(language);
                },
              }),
            ]),
            secondaryAction: {
              label: t('START_EMPTY'),
              iconName: 'note_add',
              onclick: () => actions.completeOnboarding('empty'),
            },
            primaryAction: {
              label: state.onboardingError
                ? t('RETRY')
                : i18n.currentLocale === 'nl'
                  ? t('USE_STARTER')
                  : t('SWITCH_TO_DUTCH'),
              iconName: 'library_books',
              onclick: async () => {
                if (i18n.currentLocale !== 'nl') {
                  localStorage.setItem(LANGUAGE, 'nl');
                  await i18n.loadAndSetLocale('nl');
                }
                await actions.completeOnboarding('starter');
              },
            },
          }),
        m('.main', { style: 'overflow-x: hidden' }, [
          m(
            '.navbar-fixed',
            { style: 'z-index: 1001' },
            m(
              'nav',
              m('.nav-wrapper', [
                m(
                  'a.brand-logo.hide-on-med-and-down',
                  {
                    title: APP_TITLE,
                    style: { marginLeft: '20px', height: '50%' },
                    href: routingSvc.href(Pages.LANDING),
                  },
                  [
                    m('img[width=50][height=50][alt=logo]', {
                      src: logo,
                      style: 'margin: 6px -6px;',
                    }),
                    m('span', { style: { marginLeft: '20px', verticalAlign: 'top' } }, APP_TITLE),
                  ]
                ),
                m(
                  'a.brand-logo.show-on-small',
                  {
                    title: APP_TITLE_SHORT,
                    style: { marginLeft: '20px', height: '50%' },
                    href: routingSvc.href(Pages.LANDING),
                  },
                  [
                    m('img[width=50][height=50][alt=logo]', {
                      src: logo,
                      style: { margin: '6px -6px' },
                    }),
                    m('span', { style: { marginLeft: '20px', verticalAlign: 'top' } }, APP_TITLE_SHORT),
                  ]
                ),

                m('ul.right.hide-on-med-and-down', [
                  m('li.tooltip.cursor-pointer', [
                    m(Icon, {
                      iconName: 'search',
                      style: {
                        'margin-right': '15px',
                        'font-size': '2rem',
                      },
                      onclick: (e: MouseEvent) => {
                        e.preventDefault();
                        searchDialogOpen = true;
                        // searchDialog && !searchDialog.isOpen && searchDialog.open();
                      },
                    }),
                    m('span.tooltiptext', { style: { fontSize: '1rem' } }, t('SEARCH_TOOLTIP')),
                  ]),
                  ...routingSvc
                    .getList()
                    .filter(
                      (d) =>
                        d.id !== Pages.LANDING &&
                        ((typeof d.visible === 'boolean' ? d.visible : d.visible(state)) || isActive(d))
                    )
                    .map((d: Page) =>
                      m('li', { style: { textAlign: 'center' }, class: isActive(d) }, [
                        m(
                          'a.primary-text',
                          {
                            title: d.title,
                            href: routingSvc.href(d.id),
                            onclick: () => changePage(d.id),
                          },
                          m(Icon, {
                            className: d.iconClass ? ` ${d.iconClass}` : '',
                            style,
                            iconName: typeof d.icon === 'string' ? d.icon : d.icon ? d.icon() : '',
                          })
                        ),
                      ])
                    ),
                  m('li', m(ThemeToggle)),
                ]),
              ])
            )
          ),
          m('.classification-mode-bar', [
            m('strong', `${t('SCRIPT_MODE')}: `),
            m(FlatButton, {
              label: state.scriptMode === 'public' ? t('PUBLIC_MODE') : t('RESTRICTED_MODE'),
              iconName: state.scriptMode === 'public' ? 'public' : 'lock',
              className: state.scriptMode === 'restricted' ? 'restricted-mode' : 'public-mode',
              onclick: () => actions.setScriptMode(state.scriptMode === 'public' ? 'restricted' : 'public'),
            }),
            state.scriptMode === 'restricted' && m('span', t('RESTRICTED_MODE_NOTICE')),
          ]),
          (isSmallPage() || (curPage && curPage.hasSidebar)) && [
            m(FlatButton, {
              iconName: 'menu',
              onclick: () => actions.update({ sideNavOpen: true }),
            }),
            m(SideNav, { state, actions, options: { onDelete: () => (clearModelOpen = true) } }),
          ],
          clearModelOpen &&
          m(AlertDialog, {
            id: 'clear_model',
            isOpen: true,
            onToggle: (open: boolean) => (clearModelOpen = open),
            title: t('DELETE_ITEM', 'TITLE', { item: t('MODEL') }),
            description: t('DELETE_ITEM', 'DESCRIPTION', { item: t('MODEL').toLowerCase() }),
            secondaryAction: { label: t('CANCEL'), iconName: 'cancel' },
            primaryAction: {
              label: t('DELETE'),
              iconName: 'delete',
              destructive: true,
              onclick: () => {
                saveModel(normalizeDataModel({ crimeScripts: [] }));
                changePage(Pages.HOME);
              },
            },
          }),
          searchDialogOpen &&
          m(Dialog, {
            id: 'searchDialog',
            title: t('SEARCH'),
            isOpen: true,
            onToggle: (open: boolean) => (searchDialogOpen = open),
            content: m('.row', [
              m(TextInput, {
                id: 'search',
                canClear: true,
                label: t('SEARCH'),
                onchange: () => { },
                iconName: 'search',
                defaultValue: searchFilter,
                oninput: (v) => {
                  setSearchFilter(v);
                },
                oncreate: ({ dom }) => (dom.querySelector('input') as HTMLInputElement).focus(),
              }),
              // searchDialog &&
              // searchDialog.isOpen &&
              searchFilter &&
              searchResults && [
                [m('p', t('HITS', visibleSearchResults.length))],
                visibleSearchResults.length > 0 && [
                  m(
                    'ol',
                    visibleSearchResults.map(({ crimeScriptIdx, totalScore, acts }) =>
                      m(
                        'li',
                        `${model.crimeScripts[crimeScriptIdx].label} (score ${totalScore})`,
                        m(
                          'ul.browser-default',
                          acts.map(({ sceneIdx, variantIdx, score }) => {
                            const scene = model.crimeScripts[crimeScriptIdx].stages[sceneIdx];
                            const variant = scene?.variants[variantIdx];
                            return m(
                              'li',
                              m(
                                'a.truncate',
                                {
                                  style: { cursor: 'pointer' },
                                  href: routingSvc.href(
                                    Pages.CRIME_SCRIPT,
                                    `id=${model.crimeScripts[crimeScriptIdx].id}`
                                  ),
                                  onclick: () => {
                                    if (scene && variant) {
                                      actions.setLocation(model.crimeScripts[crimeScriptIdx].id, variant.id, scene.id);
                                    }
                                  },
                                },
                                `${variant?.label || t('TEXT')} (score: ${score})`
                              )
                            );
                          })
                        )
                      )
                    )
                  ),
                ],
              ],
            ]),
          }),
          m(
            '.container',
            { style: 'padding-top: 5px' },
            model.previewMode &&
            m(FlatButton, {
              label: t('MERGE_SCRIPT'),
              iconName: 'merge',
              className: 'small',
              onclick: () => {
                actions.mergePreviewModel();
              },
            }),
            children,
            m(
              '.row',
              m(
                '.col.s12',
                m(
                  'a',
                  {
                    href: 'https://www.tno.nl',
                    target: '_blank',
                  },
                  m('img[width=100][height=50][alt=TNO website][title=TNO website].right', {
                    src: ThemeManager.getEffectiveTheme() === 'dark' ? tno_white : tno,
                  })
                )
              )
            )
          ),
          ,
        ]),
      ];
    },
  };
};

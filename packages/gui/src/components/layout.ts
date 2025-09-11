import m from 'mithril';
import { FlatButton, Icon, ModalPanel, ThemeManager, ThemeToggle, TextInput } from 'mithril-materialized';
import logo from '../assets/logo.svg';
import tno from '../assets/tno.svg';
import tno_white from '../assets/tno_white.svg';
import { Pages, Page, DataModel, defaultModel } from '../models';
import { routingSvc } from '../services/routing-service';
import { APP_TITLE, APP_TITLE_SHORT, MeiosisComponent, t } from '../services';
import { SideNav } from './ui/sidenav';
import { isActivePage, isSmallPage } from '../utils';

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

      return [
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
          (isSmallPage() || (curPage && curPage.hasSidebar)) && [
            m(FlatButton, {
              iconName: 'menu',
              onclick: () => actions.update({ sideNavOpen: true }),
            }),
            m(SideNav, { state, actions, options: { onDelete: () => (clearModelOpen = true) } }),
          ],
          clearModelOpen &&
            m(ModalPanel, {
              id: 'clear_model',
              isOpen: true,
              onClose: () => (clearModelOpen = false),
              title: t('DELETE_ITEM', 'TITLE', { item: t('MODEL') }),
              description: t('DELETE_ITEM', 'DESCRIPTION', { item: t('MODEL').toLowerCase() }),
              buttons: [
                { label: t('CANCEL'), iconName: 'cancel' },
                {
                  label: t('DELETE'),
                  iconName: 'delete',
                  onclick: () => {
                    saveModel(defaultModel);
                  },
                },
              ],
            }),
          searchDialogOpen &&
            m(ModalPanel, {
              id: 'searchDialog',
              title: t('SEARCH'),
              isOpen: true,
              onClose: () => {
                searchDialogOpen = false;
              },
              description: m('.modal-content.row', [
                m(TextInput, {
                  id: 'search',
                  canClear: true,
                  label: t('SEARCH'),
                  onchange: () => {},
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
                    [m('p', t('HITS', searchResults.length))],
                    searchResults.length > 0 && [
                      m(
                        'ol',
                        searchResults.map(({ crimeScriptIdx, totalScore, acts }) =>
                          m(
                            'li',
                            `${model.crimeScripts[crimeScriptIdx].label} (score ${totalScore})`,
                            m(
                              'ul.browser-default',
                              acts.map(({ actIdx, phaseIdx, score }) =>
                                m(
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
                                        // searchDialog.close();
                                        actions.setLocation(
                                          model.crimeScripts[crimeScriptIdx].id,
                                          String(actIdx),
                                          String(phaseIdx)
                                        );
                                      },
                                    },
                                    `${actIdx >= 0 ? model.acts[actIdx].label : t('TEXT')} (score: ${score})`
                                  )
                                )
                              )
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

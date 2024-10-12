import m from 'mithril';
import { Icon } from 'mithril-materialized';
import logo from '../assets/logo.svg';
import tno from '../assets/tno.svg';
import { Pages, Page } from '../models';
import { routingSvc } from '../services/routing-service';
import { APP_TITLE, APP_TITLE_SHORT, MeiosisComponent, t } from '../services';
import { SideNav, SideNavTrigger } from './ui/sidenav';
import { TextInputWithClear } from './ui/text-input-with-clear';
import { isActivePage, isSmallPage } from '../utils';

export const Layout: MeiosisComponent = () => {
  const style = 'font-size: 2.2rem; width: 4rem;';
  let searchDialog: M.Modal;
  let textInput: HTMLInputElement;

  document.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (
      ev.key !== '/' ||
      searchDialog?.isOpen ||
      (ev.target && (ev.target as HTMLTextAreaElement).type === 'textarea') ||
      (ev.target as HTMLInputElement).type === 'text'
    )
      return;
    ev.preventDefault(); // Prevent the slash key from being inputted into input fields
    searchDialog.open();
    textInput.focus();
  });

  return {
    view: ({ children, attrs: { state, actions } }) => {
      const { page, searchFilter, searchResults, model } = state;
      const { changePage, setSearchFilter } = actions;
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
                    style: 'margin-left: 20px; color: black; height: 50%',
                    href: routingSvc.href(Pages.LANDING),
                  },
                  [
                    m('img[width=50][height=50][alt=logo]', {
                      src: logo,
                      style: 'margin: 6px -6px;',
                    }),
                    m('span', { style: 'margin-left: 20px; vertical-align: top;' }, APP_TITLE),
                  ]
                ),
                m(
                  'a.brand-logo.show-on-small',
                  {
                    title: APP_TITLE_SHORT,
                    style: 'margin-left: 20px; color: black; height: 50%',
                    href: routingSvc.href(Pages.LANDING),
                  },
                  [
                    m('img[width=50][height=50][alt=logo]', {
                      src: logo,
                      style: 'margin: 6px -6px;',
                    }),
                    m('span', { style: 'margin-left: 20px; vertical-align: top;' }, APP_TITLE_SHORT),
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
                        searchDialog && !searchDialog.isOpen && searchDialog.open();
                      },
                    }),
                    m('span.tooltiptext', { style: { 'font-size': '1rem' } }, t('SEARCH_TOOLTIP')),
                  ]),
                  ...routingSvc
                    .getList()
                    .filter(
                      (d) =>
                        d.id !== Pages.LANDING &&
                        ((typeof d.visible === 'boolean' ? d.visible : d.visible(state)) || isActive(d))
                    )
                    .map((d: Page) =>
                      m('li', { style: 'text-align:center', class: isActive(d) }, [
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
                ]),
              ])
            )
          ),
          (isSmallPage() || (curPage && curPage.hasSidebar)) && [
            m(SideNavTrigger, { state, actions }),
            m(SideNav, { state, actions }),
          ],
          m(
            '#searchDialog.modal',
            {
              oncreate: ({ dom }) => {
                searchDialog = M.Modal.init(dom, {
                  onOpenEnd: () => {
                    if (textInput) {
                      textInput.focus();
                    }
                  },
                });
              },
            },
            [
              m('.modal-content.row', [
                m(TextInputWithClear, {
                  id: 'search',
                  label: t('SEARCH'),
                  onchange: () => {},
                  iconName: 'search',
                  initialValue: searchFilter,
                  oninput: (v) => {
                    setSearchFilter(v);
                  },
                  oncreate: ({ dom }) => (textInput = dom.querySelector('input') as HTMLInputElement),
                }),
                searchDialog &&
                  searchDialog.isOpen &&
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
                                        searchDialog.close();
                                        actions.setLocation(model.crimeScripts[crimeScriptIdx].id, actIdx, phaseIdx);
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
            ]
          ),
          m('.container', { style: 'padding-top: 5px' }, children),
          m(
            'a',
            {
              href: 'https://www.tno.nl',
              target: '_blank',
              style: {
                position: 'fixed',
                bottom: '0',
                right: '10px',
              },
            },
            m('img[width=100][height=50][alt=TNO website][title=TNO website].right', { src: tno })
          ),
        ]),
      ];
    },
  };
};

import m, { RouteDefs } from 'mithril';
import { Pages, Page } from '../models';
import { Layout } from '../components/layout';
import { AboutPage, CasePage, CrimeScriptPage, HomePage, LandingPage, SettingsPage } from '../components';
import { t } from './translations';
import { appActions, cells } from './meiosis';

class RoutingService {
  private pages!: ReadonlyArray<Page>;

  constructor() {}

  public init(locale: string) {
    const routes: Page[] = [
      {
        id: Pages.LANDING,
        title: t('LANDING', 'TITLE'),
        route: t('LANDING', 'ROUTE'),
        visible: false,
        default: true,
        hasSidebar: true,
        component: LandingPage,
      },
      {
        id: Pages.HOME,
        icon: 'home',
        title: t('HOME', 'TITLE'),
        route: t('HOME', 'ROUTE'),
        visible: true,
        hasSidebar: true,
        component: HomePage,
      },
      {
        id: Pages.CRIME_SCRIPT,
        icon: 'menu_book',
        title: t('CRIME_SCRIPT', 'TITLE'),
        route: t('CRIME_SCRIPT', 'ROUTE'),
        visible: true,
        hasSidebar: false,
        component: CrimeScriptPage,
      },
      {
        id: Pages.CASE,
        icon: 'cases',
        // iconClass: 'blue-text',
        title: t('CASE', 'TITLE'),
        route: t('CASE', 'ROUTE'),
        hasSidebar: false,
        visible: true, // ({ role }) => role === 'admin',
        component: CasePage,
      },
      // {
      //   id: Pages.ARTICLE,
      //   icon: 'newspaper',
      //   // iconClass: 'blue-text',
      //   title: t('ARTICLE', 'TITLE'),
      //   route: t('ARTICLE', 'ROUTE'),
      //   hasSidebar: false,
      //   visible: true, // ({ role }) => role === 'admin',
      //   component: ArticlePage,
      // },
      {
        id: Pages.SETTINGS,
        icon: 'edit_attributes',
        // iconClass: 'blue-text',
        title: t('SETTINGS', 'TITLE'),
        route: t('SETTINGS', 'ROUTE'),
        hasSidebar: false,
        visible: true, // ({ role }) => role === 'admin',
        component: SettingsPage,
      },
      {
        id: Pages.ABOUT,
        icon: 'info',
        title: t('ABOUT', 'TITLE'),
        route: t('ABOUT', 'ROUTE'),
        visible: true,
        component: AboutPage,
      },
    ];
    // console.log(JSON.stringify(routes, null, 2));
    this.setList(routes);
    appActions(cells()).update({ locale });
    // console.log(JSON.stringify(this.dashboards, null, 2));
  }

  public getList() {
    return this.pages;
  }

  public setList(list: Page[]) {
    this.pages = Object.freeze(list);
  }

  public get defaultRoute() {
    const dashboard = this.pages.filter((d) => d.default).shift();
    return dashboard ? dashboard.route : this.pages[0].route;
  }

  public route(page: Pages, query?: { [key: string]: string | number | undefined }) {
    const dashboard = this.pages.filter((d) => d.id === page).shift();
    return dashboard ? '#!' + dashboard.route + (query ? '?' + m.buildQueryString(query) : '') : this.defaultRoute;
  }

  public href(page: Pages, params = '' as string | number) {
    const dashboard = this.pages.filter((d) => d.id === page).shift();
    return dashboard ? `#!${dashboard.route.replace(/:\w*/, '')}?${params}` : this.defaultRoute;
  }

  public switchTo(
    page: Pages,
    params?: { [key: string]: string | number | undefined },
    query?: { [key: string]: string | number | undefined }
  ) {
    const dashboard = this.pages.filter((d) => d.id === page).shift();
    if (dashboard) {
      const url = dashboard.route + (query ? '?' + m.buildQueryString(query) : '');
      m.route.set(url, params);
    }
  }

  public routingTable() {
    // console.log('INIT');
    return this.pages.reduce((p, c) => {
      p[c.route] =
        c.hasNavBar === false
          ? {
              render: () => {
                const cell = cells();
                const actions = appActions(cell);
                return m(c.component, { ...cell, actions });
              },
            }
          : {
              // onmatch:
              //   c.id === Dashboards.LOGIN
              //     ? undefined
              //     : () => {
              //         if (c.id !== Dashboards.HOME && !Auth.isLoggedIn()) m.route.set('/login');
              //       },
              render: () => {
                const cell = cells();
                const actions = appActions(cell);
                return m(Layout, { ...cell, actions, options: {} }, m(c.component, { ...cell, actions }));
              },
            };
      return p;
    }, {} as RouteDefs);
  }
}

export const routingSvc: RoutingService = new RoutingService();

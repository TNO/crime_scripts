import { meiosisSetup } from 'meiosis-setup';
import { MeiosisCell, MeiosisConfig, Patch, Service } from 'meiosis-setup/types';
import m, { FactoryComponent } from 'mithril';
import { i18n, routingSvc, t } from '.';
import {
  Activity,
  CrimeScriptFilter,
  DataModel,
  FlexSearchResult,
  ID,
  Pages,
  SearchResult,
  ServiceProvider,
  Settings,
} from '../models';
import { aggregateFlexSearchResults, crimeScriptFilterToText, mergeDataModels, scrollToTop, tokenize } from '../utils';
import { flexSearchLookupUpdater } from './flex-search';
import { User, UserRole } from './login-service';
import { uniqueId } from 'mithril-materialized';

// const settingsSvc = restServiceFactory<Settings>('settings');
const PREVIEW_MODEL_KEY = 'CSS_PREVIEW_MODEL';
const MODEL_KEY = 'CSS_MODEL';
const USER_ROLE = 'CSS_USER_ROLE';
export const APP_TITLE = 'PAX Crime Scripting';
export const APP_TITLE_SHORT = 'PAX';

export interface State {
  page: Pages;
  model: DataModel;
  locale: string;
  loggedInUser?: User;
  role: UserRole;
  settings: Settings;
  currentCrimeScriptId?: ID;
  curActId?: ID;
  curSceneId?: ID;
  attributeFilter: string;
  searchFilter: string;
  searchResults: SearchResult[];
  caseFilter: string;
  caseResults: SearchResult[];
  crimeScriptFilter: CrimeScriptFilter;
  /** For finding search results */
  lookup: Map<string, FlexSearchResult[]>;
}

export interface Actions {
  setPage: (page: Pages, info?: string) => void;
  changePage: (
    page: Pages,
    params?: Record<string, string | number | undefined>,
    query?: Record<string, string | number | undefined>
  ) => void;
  saveModel: (ds: DataModel) => void;
  mergePreviewModel: () => void;
  saveSettings: (settings: Settings) => Promise<void>;
  setRole: (role: UserRole) => void;
  login: () => void;
  update: (patch: Patch<State>) => void;
  setSearchFilter: (searchFilter?: string) => Promise<void>;
  setAttributeFilter: (searchFilter?: string) => Promise<void>;
  setLocation: (currentCrimeScriptId: ID, actId: ID, sceneId: ID) => void;
}

export type MeiosisComponent<T extends { [key: string]: any } = {}> = FactoryComponent<{
  state: State;
  actions: Actions;
  options?: T;
}>;

export const appActions: (cell: MeiosisCell<State>) => Actions = ({ update /* states */ }) => ({
  // addDucks: (cell, amount) => {
  //   cell.update({ ducks: (value) => value + amount });
  // },
  setPage: (page, info) => {
    document.title = `${APP_TITLE} | ${t(page as any, 'TITLE').replace('_', ' ')}${info ? ` | ${info}` : ''}`;
    // const curPage = states().page;
    // if (curPage === page) return;
    update({
      page: () => {
        scrollToTop();
        return page;
      },
    });
  },
  changePage: (page, params, query) => {
    routingSvc && routingSvc.switchTo(page, params, query);
    document.title = `${APP_TITLE} | ${page.replace('_', ' ')}`;
    update({ page });
  },
  saveModel: (model) => {
    model.lastUpdate = Date.now();
    model.version = model.version ? model.version++ : 1;
    localStorage.setItem(model.previewMode ? PREVIEW_MODEL_KEY : MODEL_KEY, JSON.stringify(model));
    // console.log(JSON.stringify(model, null, 2));
    update({ model: () => model });
  },
  mergePreviewModel: () => {
    const previewStr = localStorage.getItem(PREVIEW_MODEL_KEY);
    const modelStr = localStorage.getItem(MODEL_KEY);
    try {
      if (previewStr && modelStr) {
        const preview = JSON.parse(previewStr) as DataModel;
        const model = JSON.parse(modelStr) as DataModel;
        const mergedModel = mergeDataModels(model, preview);
        localStorage.removeItem(PREVIEW_MODEL_KEY);
        localStorage.setItem(MODEL_KEY, JSON.stringify(mergedModel));
        update({ model: () => mergedModel });
      }
    } catch (e: any) {
      M.toast({
        html: `Error loading models: ${e}`,
        classes: 'red',
      });
    }
  },
  saveSettings: async (settings: Settings) => {
    // await settingsSvc.save(settings);
    update({
      settings: () => settings,
    });
  },
  setRole: (role) => {
    localStorage.setItem(USER_ROLE, role);
    update({ role });
  },
  login: () => {},
  update: (state) => update(state),
  setSearchFilter: async (searchFilter?: string) => {
    if (searchFilter) {
      // localStorage.setItem(SEARCH_FILTER_KEY, searchFilter);
      update({ searchFilter });
    } else {
      update({ searchFilter: undefined });
    }
  },
  setAttributeFilter: async (attributeFilter?: string) => {
    if (attributeFilter) {
      update({ attributeFilter });
    } else {
      update({ attributeFilter: undefined });
    }
  },
  setLocation: (currentCrimeScriptId, curActId, curSceneId) => {
    update({ currentCrimeScriptId, curActId, curSceneId });
  },
});

export const setSearchResults: Service<State> = {
  onchange: (state) => state.searchFilter,
  run: (cell) => {
    const state = cell.getState();
    const { lookup, searchFilter } = state;
    const allFlexResults: FlexSearchResult[] = [];
    if (searchFilter) {
      const searchWords = tokenize(searchFilter, i18n.stopwords);
      searchWords
        .map((word) => lookup.get(word))
        .filter((results) => typeof results !== 'undefined')
        .forEach((results) => {
          results.forEach((res) => allFlexResults.push(res));
        });
    }
    const searchResults = aggregateFlexSearchResults(allFlexResults);

    cell.update({ searchResults });
  },
};

export const setCaseSearchResults: Service<State> = {
  onchange: (state) => state.caseFilter + JSON.stringify(state.crimeScriptFilter || {}),
  run: (cell) => {
    const state = cell.getState();
    const { lookup, caseFilter, crimeScriptFilter, model } = state;
    const { products = [], transports = [], attributes = [], geoLocations = [], locations = [], cast = [] } = model;
    const crimeScriptLabels = crimeScriptFilterToText(
      [...products, ...transports, ...attributes, ...geoLocations, ...locations, ...cast],
      crimeScriptFilter
    );
    console.log(`${crimeScriptLabels || ''} ${caseFilter || ''}`);
    const allFlexResults: FlexSearchResult[] = [];
    if (crimeScriptLabels || caseFilter) {
      const searchWords = tokenize(`${crimeScriptLabels || ''} ${caseFilter || ''}`, i18n.stopwords);
      searchWords
        .map((word) => lookup.get(word))
        .filter((results) => typeof results !== 'undefined')
        .forEach((results) => {
          results.forEach((res) => allFlexResults.push(res));
        });
    }
    const caseResults = aggregateFlexSearchResults(allFlexResults);

    cell.update({ caseResults });
  },
};

const config: MeiosisConfig<State> = {
  app: {
    initial: {
      page: Pages.HOME,
      loggedInUser: undefined,
      role: 'user',
      settings: {} as Settings,
      model: {} as DataModel,
      crimeScriptFilter: {} as CrimeScriptFilter,
    } as State,
    services: [setSearchResults, setCaseSearchResults, flexSearchLookupUpdater],
  },
};
export const cells = meiosisSetup<State>(config);

cells.map(() => {
  // console.log('...redrawing');
  m.redraw();
});

export const loadData = async (ds = localStorage.getItem(MODEL_KEY)) => {
  const model: DataModel & {
    serviceProviders?: ServiceProvider[];
  } = ds ? JSON.parse(ds) : { crimeScripts: [] };
  if (typeof model.cast === 'undefined') {
    model.cast = [];
  }
  if (typeof (model as any).articles !== 'undefined') {
    delete (model as any).articles;
  }
  if (typeof model.serviceProviders !== 'undefined') {
    model.cast = [...model.cast, ...model.serviceProviders];
    delete model.serviceProviders;
    if (typeof model.acts !== 'undefined') {
      model.acts.forEach((act) => {
        if (act.activities && act.activities.length > 0) {
          act.activities.forEach((actActivity: Activity & { sp?: ID[] }) => {
            if (typeof actActivity.sp !== 'undefined') {
              if (typeof actActivity.cast === 'undefined') {
                actActivity.cast = [];
              }
              actActivity.cast = [...actActivity.cast, ...actActivity.sp];
              delete actActivity.sp;
            }
          });
        }
      });
    }
  }
  // Init stages (scenes)
  const { acts = [] } = model;
  model.crimeScripts?.forEach((crimeScript) => {
    if (!crimeScript.stages) {
      crimeScript.stages = [];
    }
    crimeScript.stages.forEach((stage) => {
      if (stage.id && stage.ids && stage.ids.includes(stage.id)) {
        const { actId, ids = [], id = ids[0] } = stage;
        const act = acts.find((act) => act.id === id);
        if (act) {
          stage.actId = id;
          stage.id = uniqueId();
          stage.label = act.label;
          stage.icon = act.icon;
          stage.description = act.description;
          stage.url = act.url;
          stage.isGeneric = (act as any).isGeneric;
          delete (act as any).isGeneric;
        }
        if (!actId) {
          stage.actId = ids[0];
        }
      }
    });
  });
  localStorage.setItem(model.previewMode ? PREVIEW_MODEL_KEY : MODEL_KEY, JSON.stringify(model));

  const role = (localStorage.getItem(USER_ROLE) || 'user') as UserRole;
  // const settings = (await settingsSvc.loadList()).shift() || ({} as Settings);

  cells().update({
    role,
    model: () => model,
    // settings: () => settings,
  });
};
loadData();

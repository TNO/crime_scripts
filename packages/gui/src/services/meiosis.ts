import { meiosisSetup } from 'meiosis-setup';
import type { MeiosisCell, MeiosisConfig, Patch, Service } from 'meiosis-setup/types';
import m, { type FactoryComponent } from 'mithril';
import { snackbar } from 'mithril-materialized';
import {
  type CrimeScriptFilter,
  type DataModel,
  type FlexSearchResult,
  type ID,
  type ScriptMode,
  importStarterBundle,
  mergeDataModels,
  normalizeDataModel,
  resolveStarterBundleUrl,
  validateStarterBundle,
  Pages,
  type SearchResult,
  type Settings,
} from '../models';
import { aggregateFlexSearchResults, crimeScriptFilterToText, scrollToTop, tokenize } from '../utils';
import { i18n, routingSvc, t } from '.';
import { flexSearchLookupUpdater } from './flex-search';
import type { User, UserRole } from './login-service';

// const settingsSvc = restServiceFactory<Settings>('settings');
const PREVIEW_MODEL_KEY = 'CSS_PREVIEW_MODEL';
const MODEL_KEY = 'CSS_MODEL';
export const ONBOARDING_CHOICE_KEY = 'CSS_ONBOARDING_CHOICE';
const USER_ROLE = 'CSS_USER_ROLE';
export const SCRIPT_MODE_KEY = 'CSS_SCRIPT_MODE';
export const APP_TITLE = 'PAX Crime Scripting';
export const APP_TITLE_SHORT = 'PAX';

export interface State {
  page: Pages;
  model: DataModel;
  locale: string;
  loggedInUser?: User;
  role: UserRole;
  scriptMode: ScriptMode;
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
  sideNavOpen: false;
  needsOnboarding: boolean;
  onboardingError?: string;
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
  completeOnboarding: (choice: 'starter' | 'empty') => Promise<void>;
  resetApplication: () => void;
  saveSettings: (settings: Settings) => Promise<void>;
  setRole: (role: UserRole) => void;
  setScriptMode: (mode: ScriptMode) => void;
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
    model.version = model.version ? model.version + 1 : 1;
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
      snackbar({
        message: `Error loading models: ${e}`,
        dismissible: true,
      });
    }
  },
  completeOnboarding: async (choice) => {
    if (choice === 'empty') {
      const model = normalizeDataModel({ crimeScripts: [] });
      localStorage.setItem(ONBOARDING_CHOICE_KEY, choice);
      localStorage.setItem(MODEL_KEY, JSON.stringify(model));
      update({ model: () => model, needsOnboarding: false, onboardingError: undefined });
      return;
    }
    try {
      const model = importStarterBundle(normalizeDataModel({ crimeScripts: [] }), await fetchStarterBundle());
      localStorage.setItem(ONBOARDING_CHOICE_KEY, choice);
      localStorage.setItem(MODEL_KEY, JSON.stringify(model));
      update({ model: () => model, needsOnboarding: false, onboardingError: undefined });
    } catch (error) {
      update({ onboardingError: error instanceof Error ? error.message : String(error) });
    }
  },
  resetApplication: () => {
    localStorage.removeItem(MODEL_KEY);
    localStorage.removeItem(PREVIEW_MODEL_KEY);
    localStorage.removeItem(ONBOARDING_CHOICE_KEY);
    localStorage.removeItem(SCRIPT_MODE_KEY);
    window.location.reload();
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
  setScriptMode: (scriptMode) => {
    localStorage.setItem(SCRIPT_MODE_KEY, scriptMode);
    update({ scriptMode });
  },
  login: () => { },
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
      scriptMode: 'public',
      settings: {} as Settings,
      model: {} as DataModel,
      needsOnboarding: false,
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
  let model: DataModel;
  try {
    model = normalizeDataModel(ds ? JSON.parse(ds) : { crimeScripts: [] });
  } catch (error) {
    snackbar({
      message: `Error loading crime-script model: ${error instanceof Error ? error.message : String(error)}`,
      dismissible: true,
    });
    throw error;
  }
  const storedModelExists = Boolean(localStorage.getItem(MODEL_KEY));
  const onboardingChoiceExists = Boolean(localStorage.getItem(ONBOARDING_CHOICE_KEY));
  if (ds && !storedModelExists && !onboardingChoiceExists) {
    localStorage.setItem(ONBOARDING_CHOICE_KEY, 'imported');
  }
  if (storedModelExists && !onboardingChoiceExists) {
    localStorage.setItem(ONBOARDING_CHOICE_KEY, 'existing');
  }
  if (ds || storedModelExists) {
    localStorage.setItem(model.previewMode ? PREVIEW_MODEL_KEY : MODEL_KEY, JSON.stringify(model));
  }

  const role = (localStorage.getItem(USER_ROLE) || 'user') as UserRole;
  const scriptMode = localStorage.getItem(SCRIPT_MODE_KEY) === 'restricted' ? 'restricted' : 'public';
  // const settings = (await settingsSvc.loadList()).shift() || ({} as Settings);

  cells().update({
    role,
    scriptMode,
    model: () => model,
    needsOnboarding: !ds && !storedModelExists && !onboardingChoiceExists,
    // settings: () => settings,
  });
};

export const fetchStarterBundle = async (): Promise<DataModel> => {
  const response = await fetch(resolveStarterBundleUrl(document.baseURI), { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Starter library could not be loaded (${response.status}).`);
  return validateStarterBundle(await response.json());
};
loadData();

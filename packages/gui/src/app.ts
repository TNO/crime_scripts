import m from 'mithril';
import 'material-icons/iconfont/filled.css';
import 'mithril-materialized/index.css';
import 'mithril-materialized/presets/compact-minimal.css';
import { snackbar, ThemeManager } from 'mithril-materialized';
// import 'materialize-css/dist/css/materialize.min.css';
// import 'materialize-css/dist/js/materialize.min.js';
import './css/style.css';
import { registerPlugin } from 'mithril-ui-form';
import { iconSearchSelectPlugin } from './components/ui/icon-search-select-plugin';
import { searchSelectPlugin } from './components/ui/search-select-plugin';
import { SimpleListEditorPlugin } from './components/ui/simple-list-editor';
import type { Languages } from './services';
import { i18n, loadData, t } from './services';
import { decodeSharedScript, sharedScriptPayloadFromHash } from './models';
import { resolveGuiLanguage } from './services/gui-language';
import { routingSvc } from './services/routing-service';
import { LANGUAGE, SAVED } from './utils';

registerPlugin('list', SimpleListEditorPlugin);
registerPlugin('icon_search_select', iconSearchSelectPlugin);
registerPlugin('search_select', searchSelectPlugin);

ThemeManager.initialize('auto');
document.documentElement.dataset.mmPreset = 'compact-minimal';
document.documentElement.setAttribute('lang', 'en');

window.onbeforeunload = (e) => {
  if (localStorage.getItem(SAVED) === 'true') return;
  localStorage.setItem(SAVED, 'true');
  e.preventDefault(); // This is necessary for older browsers
};

const guiLanguage = resolveGuiLanguage(window.location.hash, window.localStorage.getItem(LANGUAGE));
window.localStorage.setItem(LANGUAGE, guiLanguage);
i18n.addOnChangeListener((locale: string) => {
  routingSvc.init(locale);
  m.route(document.body, routingSvc.defaultRoute, routingSvc.routingTable());
});
const startApp = () => i18n.init(
  {
    en: { name: 'English', fqn: 'en-UK' },
    nl: { name: 'Nederlands', fqn: 'nl-NL', default: true },
  },
  guiLanguage as Languages
);

const importSharedPreview = async (hash: string): Promise<string | undefined> => {
  const payload = sharedScriptPayloadFromHash(hash);
  if (payload === null) return undefined;
  try {
    const model = decodeSharedScript(payload);
    const scriptId = new URLSearchParams(hash.split('?')[1]).get('id');
    if (scriptId !== model.crimeScripts[0].id) throw new Error('Shared link does not match this script.');
    await loadData(JSON.stringify(model));
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

const showSharedError = (error?: string) => {
  if (error !== undefined) snackbar({ message: `${t('SHARED_SCRIPT_INVALID')} ${error}`, dismissible: true });
};

window.addEventListener('hashchange', () => {
  if (sharedScriptPayloadFromHash(window.location.hash) === null) return;
  void importSharedPreview(window.location.hash).then(showSharedError);
});

const initialize = async () => {
  const sharedError = await importSharedPreview(window.location.hash);
  await startApp();
  showSharedError(sharedError);
};

void initialize();

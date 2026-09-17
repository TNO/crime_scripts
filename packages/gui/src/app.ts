import m from 'mithril';
import 'material-icons/iconfont/filled.css';
import 'mithril-materialized/index.css';
import { ThemeManager } from 'mithril-materialized';
// import 'materialize-css/dist/css/materialize.min.css';
// import 'materialize-css/dist/js/materialize.min.js';
import './css/style.css';
import { registerPlugin } from 'mithril-ui-form';
import { searchSelectPlugin } from './components/ui/search-select-plugin';
import { SimpleListEditorPlugin } from './components/ui/simple-list-editor';
import type { Languages } from './services';
import { i18n } from './services';
import { routingSvc } from './services/routing-service';
import { LANGUAGE, SAVED } from './utils';

registerPlugin('list', SimpleListEditorPlugin);
registerPlugin('search_select', searchSelectPlugin);

ThemeManager.initialize('auto');
document.documentElement.setAttribute('lang', 'en');

window.onbeforeunload = (e) => {
  if (localStorage.getItem(SAVED) === 'true') return;
  localStorage.setItem(SAVED, 'true');
  e.preventDefault(); // This is necessary for older browsers
};

const guiLanguage = window.localStorage.getItem(LANGUAGE) || 'nl';
i18n.addOnChangeListener((locale: string) => {
  console.log(`GUI language loaded: ${locale}`);
  routingSvc.init(locale);
  m.route(document.body, routingSvc.defaultRoute, routingSvc.routingTable());
});
i18n.init(
  {
    en: { name: 'English', fqn: 'en-UK' },
    nl: { name: 'Nederlands', fqn: 'nl-NL', default: true },
  },
  guiLanguage as Languages
);

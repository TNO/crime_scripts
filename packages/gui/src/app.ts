import m from 'mithril';
import 'material-icons/iconfont/filled.css';
import 'materialize-css/dist/css/materialize.min.css';
import 'materialize-css/dist/js/materialize.min.js';
import './css/style.css';
import { routingSvc } from './services/routing-service';
import { LANGUAGE, SAVED } from './utils';
import { Languages, i18n } from './services';
import { registerPlugin } from 'mithril-ui-form';
import { SimpleListEditorPlugin } from './components/ui/simple-list-editor';
import { searchSelectPlugin } from './components/ui/search-select-plugin';

registerPlugin('list', SimpleListEditorPlugin);
registerPlugin('search_select', searchSelectPlugin);

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

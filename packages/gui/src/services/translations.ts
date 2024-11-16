import translate, { Options, Translate } from 'translate.js';
import { plural_EN } from 'translate.js/pluralize';
import { messages, messagesNL } from './lang';
import { I18n } from 'mithril-ui-form';
import stopwordsNl from 'stopwords-nl';
import stopwordsEn from 'stopwords-en';
import { LanguageStemmer } from 'wasm-stemmers';

export type Languages = 'nl' | 'en';

const setGuiLanguage = (language: Languages) => {
  const options = {
    // These are the defaults:
    debug: true, //[Boolean]: Logs missing translations to console and add "@@" around output, if `true`.
    array: true, //[Boolean]: Returns translations with placeholder-replacements as Arrays, if `true`.
    resolveAliases: true, //[Boolean]: Parses all translations for aliases and replaces them, if `true`.
    pluralize: plural_EN, //[Function(count)]: Provides a custom pluralization mapping function, should return a string (or number)
    useKeyForMissingTranslation: true, //[Boolean]: If there is no translation found for given key, the key is used as translation, when set to false, it returns undefiend in this case
  };
  return translate(language === 'nl' ? messagesNL : messages, options) as Translate<typeof messages, Options>;
};

export type TextDirection = 'rtl' | 'ltr';

export type Locale = {
  /** Friendly name */
  name: string;
  /** Fully qualified name, e.g. 'en-UK' */
  fqn: string;
  /** Text direction: Left to right or right to left */
  dir?: TextDirection;
  /** Is the default language */
  default?: boolean;
};

export type Locales = Record<Languages, Locale>;

export type Listener = (locale: string, dir: TextDirection) => void;

const onChangeLocale: Listener[] = [];

export const i18n = {
  defaultLocale: 'en' as Languages,
  currentLocale: 'en' as Languages,
  locales: {} as Locales,
  init,
  addOnChangeListener,
  loadAndSetLocale,
  stemmer: undefined as undefined | LanguageStemmer,
  stopwords: [] as string[],
};

export const I18N: I18n = {};

export let t: Translate<typeof messages, Options> = setGuiLanguage(i18n.currentLocale);

// export let stemmer: Stemmer;
// export let tokenizer = new WordTokenizer();

async function init(locales: Locales, selectedLocale: Languages) {
  i18n.locales = locales;
  const defaultLocale = (Object.keys(locales) as Languages[]).filter((l) => (locales[l] as Locale).default).shift();
  if (defaultLocale) {
    i18n.defaultLocale = defaultLocale || selectedLocale;
    i18n.stemmer = new LanguageStemmer(i18n.defaultLocale);
  }
  document.documentElement.setAttribute('lang', selectedLocale);
  await loadAndSetLocale(selectedLocale);
}

function addOnChangeListener(listener: Listener) {
  onChangeLocale.push(listener);
}

async function loadAndSetLocale(newLocale: Languages) {
  if (i18n.currentLocale === newLocale) {
    return;
  }

  const resolvedLocale = supported(newLocale) ? newLocale : i18n.defaultLocale;
  i18n.currentLocale = resolvedLocale;
  i18n.stopwords = newLocale === 'nl' ? stopwordsNl : stopwordsEn;
  // stemmer = newLocale === 'nl' ? PorterStemmerNl : PorterStemmer;
  t = setGuiLanguage(newLocale);
  I18N.agree = t('I18n', 'agree');
  I18N.disagree = t('I18n', 'disagree');
  I18N.cancel = t('I18n', 'cancel');
  I18N.save = t('I18n', 'save');
  I18N.editRepeat = t('I18n', 'editRepeat');
  I18N.createRepeat = t('I18n', 'createRepeat');
  I18N.deleteItem = t('I18n', 'deleteItem');
  I18N.pickOne = t('I18n', 'pickOne');
  I18N.pickOneOrMore = t('I18n', 'pickOneOrMore');
  onChangeLocale.forEach((listener) => listener(i18n.currentLocale, dir()));
}

function supported(locale: Languages) {
  return Object.keys(i18n.locales).indexOf(locale) >= 0;
}

function dir(locale = i18n.currentLocale) {
  return (i18n.locales[locale] as Locale).dir || 'ltr';
}

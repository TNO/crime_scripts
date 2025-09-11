import m, { Attributes, FactoryComponent } from 'mithril';
import { Select } from 'mithril-materialized';
import { Languages, t } from '../../services';

export interface LanguageSwitcherAttrs extends Attributes {
  currentLanguage: Languages;
  onLanguageChange: (language: Languages) => void;
}

export const LanguageSwitcher: FactoryComponent<LanguageSwitcherAttrs> = () => {
  return {
    view: ({ attrs: { currentLanguage, onLanguageChange, className } }) => {
      return m(Select<Languages>, {
        iconName: 'language',
        checkedId: currentLanguage,
        className,
        options: [
          {
            id: 'en',
            label: 'English',
          },
          {
            id: 'nl',
            label: 'Nederlands',
          },
        ],
        label: t('LANGUAGE'),
        onchange: (language) => onLanguageChange(language[0]),
      });
    },
  };
};

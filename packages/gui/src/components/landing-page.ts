import m from 'mithril';
import { Button, Icon } from 'mithril-materialized';
import background from '../assets/background.webp';
import { Pages } from '../models';
import { APP_TITLE, type MeiosisComponent, t } from '../services';

// const readerAvailable = window.File && window.FileReader && window.FileList && window.Blob;

export const LandingPage: MeiosisComponent = () => {
  let starterLoading = false;

  return {
    oninit: ({
      attrs: {
        actions: { setPage },
      },
    }) => {
      setPage(Pages.LANDING);
    },
    view: ({ attrs: { actions } }) => [
      m('.center', [
        m('.landing-hero', [
          m('img.landing-hero-image[width=1408][height=704]', { src: background, alt: '' }),
          m('.landing-hero-content', [
            m('h1', APP_TITLE),
            m('p', t('LANDING_CTA_DESCRIPTION')),
            m(Button, {
              className: 'landing-hero-cta',
              label: starterLoading ? t('LOADING_STARTER') : t('USE_STARTER'),
              iconName: 'library_books',
              disabled: starterLoading,
              onclick: async () => {
                starterLoading = true;
                const imported = await actions.importStarterLibrary();
                starterLoading = false;
                if (imported) actions.changePage(Pages.HOME);
              },
            }),
          ]),
        ]),
        m(
          '.section',
          m('.row.container.center', [
            m('.row', [
              m(
                '.col.s12.m4',
                m('.intro-block', [
                  m('.center', m(Icon, { iconName: 'cases' })),
                  m('h5.center', t('LANDING_CASES', 'TITLE')),
                  m('p.light', t('LANDING_CASES', 'DESC')),
                ])
              ),
              m(
                '.col.s12.m4',
                m('.intro-block', [
                  m('.center', m(Icon, { iconName: 'handshake' })),
                  m('h5.center', t('LANDING_HAND', 'TITLE')),
                  m('p.light', t('LANDING_HAND', 'DESC')),
                ])
              ),
              m(
                '.col.s12.m4',
                m('.intro-block', [
                  m('.center', m(Icon, { iconName: 'security' })),
                  m('h5.center', t('LANDING_SECURITY', 'TITLE')),
                  m('p.light', t('LANDING_SECURITY', 'DESC')),
                ])
              ),
            ]),
          ])
        ),
      ]),
    ],
  };
};

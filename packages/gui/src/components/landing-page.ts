import m from 'mithril';
import { Icon } from 'mithril-materialized';
import background from '../assets/background.jpg';
import { MeiosisComponent, t } from '../services';
import { Pages } from '../models';

// const readerAvailable = window.File && window.FileReader && window.FileList && window.Blob;

export const LandingPage: MeiosisComponent = () => {
  return {
    oninit: ({
      attrs: {
        actions: { setPage },
      },
    }) => {
      setPage(Pages.LANDING);
    },
    view: ({}) => [
      m('.center', { style: 'position: relative;' }, [
        // m(
        //   '.overlay.center',
        //   {
        //     style: 'position: absolute; width: 100%',
        //   },
        //   [
        //     m('h3.indigo-text.text-darken-4.bold.hide-on-med-and-down', 'Introduction'),
        //   ]
        // ),
        m('img.responsive-img', { src: background }),
        m(
          '.section.white',
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

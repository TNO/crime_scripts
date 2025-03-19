import m from 'mithril';
import { Pages } from '../models';
import { MeiosisComponent, t } from '../services';
import { SlimdownView } from 'mithril-ui-form';

const license = `

## Gebruiksvoorwaarden

Om de PAX-methode en het prototype in de praktijk te testen leg ik bij deze onderstaande uitgangspunten ter informatie en bevestiging voor. PAX is nog in de onderzoeksfase en geen af eindproduct. Omdat het onderzoek met een subsidie is bekostigd heeft TNO voor zo ver van toepassing het intellectueel eigendom (weliswaar verkregen door samenwerking met RIEC’s). TNO stelt met het oog op de evaluatie en beproeving PAX ter beschikking aan het RIEC en andere (online) gebruikers. Daarbij gelden de volgende afpraken:
- DOEL: De haalbaarheid van de TNO PAX-methode en het bijbehorende prototype instrumentarium in de RIEC-praktijk te testen, en de werkgroep crime scripting in staat te stellen de bruikbaarheid van de methode aan de hand van fenomeen en casus informatie te onderzoeken
- WAT: PAX-methode en het bijhorend prototype worden beschikbaar gesteld aan het werkgroep crime scripting en derden.

Alle eventuele inhoudelijke inzichten & conclusies met betrekking tot concrete operationele casuïstiek door de RIEC’s of een RIEC-partner kunnen zonder toestemming van TNO niet worden toegerekend aan de inzet van TNO-PAX dan wel aan TNO in zijn algemeenheid. 

TNO voert een onderzoek uit op basis van een aan TNO verstrekte subsidie:
- Er is derhalve geen sprake van een levering van een product of dienst van TNO aan een opdrachtgever.
- TNO-PAX wordt in dit kader as-is ter beschikking gesteld voor het DOEL. Dwz. er zijn geen garanties met betrekking tot de beschikbaarheid, functionaliteit of de kwaliteit (sterker nog dat soort aspecten zijn juist vaak nog het onderwerp van studie).
- TNO kan niet aansprakelijk gesteld worden voor enige schade (en vervolgschade) als gevolg van de inzet van het TNO-PAX ten tijde van de ter beschikkingstelling;
- TNO wordt gevrijwaard van enige mogelijke inbreuk op eventuele rechten van derden;

<hr/>

`;

export const AboutPage: MeiosisComponent = () => {
  return {
    oninit: ({
      attrs: {
        actions: { setPage },
      },
    }) => {
      setPage(Pages.ABOUT);
    },
    view: () => {
      return m('#about-page.row.about.page', [
        m('.col.s12', [
          m(SlimdownView, { md: license }),
          m('h4', t('ABOUT', 'TITLE')),
          m(SlimdownView, { md: t('ABOUT', 'TEXT') }),
        ]),
      ]);
    },
  };
};

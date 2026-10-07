import m from 'mithril';
import { SlimdownView } from 'mithril-ui-form';
import guideSourceNl from '../../../../documentation/handleiding.nl.md?raw';
import guideSourceEn from '../../../../documentation/user-guide.en.md?raw';
import guideCaptionsNl from '../../../../documentation/assets/user-guide/pax-handleiding.nl.vtt?url';
import guideCaptionsEn from '../../../../documentation/assets/user-guide/en/pax-user-guide.en.vtt?url';
import guideVideoNl from '../../../../documentation/assets/user-guide/pax-handleiding.webm';
import guideVideoEn from '../../../../documentation/assets/user-guide/en/pax-user-guide.webm';
import homeScreenshotNl from '../../../../documentation/assets/user-guide/01-home.png';
import scriptScreenshotNl from '../../../../documentation/assets/user-guide/02-script-view.png';
import editorScreenshotNl from '../../../../documentation/assets/user-guide/03-script-edit.png';
import llmBriefScreenshotNl from '../../../../documentation/assets/user-guide/04-llm-brief.png';
import llmPromptScreenshotNl from '../../../../documentation/assets/user-guide/05-llm-prompt-light.png';
import llmJsonScreenshotNl from '../../../../documentation/assets/user-guide/06-llm-json-paste.png';
import llmReviewScreenshotNl from '../../../../documentation/assets/user-guide/07-llm-review.png';
import menuScreenshotNl from '../../../../documentation/assets/user-guide/08-menu.png';
import scriptSharingScreenshotNl from '../../../../documentation/assets/user-guide/09-script-sharing.png';
import caseAnalysisScreenshotNl from '../../../../documentation/assets/user-guide/10-case-analysis.png';
import learningModeScreenshotNl from '../../../../documentation/assets/user-guide/11-learning-mode.png';
import homeScreenshotEn from '../../../../documentation/assets/user-guide/en/01-home.png';
import scriptScreenshotEn from '../../../../documentation/assets/user-guide/en/02-script-view.png';
import editorScreenshotEn from '../../../../documentation/assets/user-guide/en/03-script-edit.png';
import llmBriefScreenshotEn from '../../../../documentation/assets/user-guide/en/04-llm-brief.png';
import llmPromptScreenshotEn from '../../../../documentation/assets/user-guide/en/05-llm-prompt-light.png';
import llmJsonScreenshotEn from '../../../../documentation/assets/user-guide/en/06-llm-json-paste.png';
import llmReviewScreenshotEn from '../../../../documentation/assets/user-guide/en/07-llm-review.png';
import menuScreenshotEn from '../../../../documentation/assets/user-guide/en/08-menu.png';
import scriptSharingScreenshotEn from '../../../../documentation/assets/user-guide/en/09-script-sharing.png';
import caseAnalysisScreenshotEn from '../../../../documentation/assets/user-guide/en/10-case-analysis.png';
import learningModeScreenshotEn from '../../../../documentation/assets/user-guide/en/11-learning-mode.png';
import { Pages } from '../models';
import { i18n, type MeiosisComponent, t } from '../services';
import { escapeMarkdownAssetUrl } from '../services/markdown-url';
import { routingSvc } from '../services/routing-service';

const VIDEO_MARKER = '<!-- PAX_GUIDE_VIDEO -->';

const localizeGuide = (source: string, assets: Map<string, string>) =>
  [...assets].reduce(
    (markdown, [path, url]) => markdown.split(path).join(escapeMarkdownAssetUrl(url)),
    source
  ).split(VIDEO_MARKER);

const videoStepsNl = [
  {
    start: 0,
    end: 3,
    time: '0:00',
    title: 'Werkruimte openen',
    description: 'Laad de starterbibliotheek of kies een bestaand script.',
  },
  {
    start: 3,
    end: 6,
    time: '0:03',
    title: 'Een rol kiezen',
    description: 'Redacteur ontgrendelt scriptbewerking; Beheerder ook rollen en andere taxonomie. Dit is geen toegangsbeveiliging.',
  },
  {
    start: 6,
    end: 9,
    time: '0:06',
    title: 'Taal en scriptmodus kiezen',
    description: 'Kies de interface-taal en werk in publieke of afgeschermde modus.',
  },
  {
    start: 9,
    end: 12,
    time: '0:09',
    title: 'De collectie uitwisselen',
    description: 'Download of upload JSON; inlezen vervangt de lokale werkruimte. Bij import van een afgeschermd script schakelt de modus automatisch om. Een publieke permanente link opent een kopie.',
  },
  {
    start: 12,
    end: 15,
    time: '0:12',
    title: 'Een script bekijken',
    description: 'Bekijk scènes en M.O. Gebruik het linkicoon bij een taxonomie-item om zijn vindplaatsen te zien.',
  },
  {
    start: 15,
    end: 18,
    time: '0:15',
    title: 'Eén script uitwisselen',
    description: 'Deel een publiek script per link of exporteer JSON, Word of een SVG/PNG-barrièremodel.',
  },
  {
    start: 18,
    end: 21,
    time: '0:18',
    title: 'Een script bewerken',
    description: 'Wijzig scriptgegevens, scènes, modi operandi en activiteiten.',
  },
  {
    start: 21,
    end: 24,
    time: '0:21',
    title: 'De LLM-opdracht invullen',
    description: 'Beschrijf taal, onderwerp, regio, detailniveau en bronnen.',
  },
  {
    start: 24,
    end: 27,
    time: '0:24',
    title: 'De prompt controleren',
    description: 'Controleer en kopieer de prompt naar een LLM naar keuze.',
  },
  {
    start: 27,
    end: 30,
    time: '0:27',
    title: 'De JSON plakken',
    description: 'Plak uitsluitend het JSON-antwoord terug in PAX.',
  },
  {
    start: 30,
    end: 36,
    time: '0:30',
    title: 'Het resultaat controleren',
    description: 'Bekijk scènes, taxonomie en bronnen vóór de importbevestiging.',
  },
  {
    start: 36,
    end: 40,
    time: '0:36',
    title: 'Een casus verkennen',
    description: 'Vergelijk concrete waarnemingen en zie welk bewijs is gevonden en wat nog niet is verklaard.',
  },
  {
    start: 40,
    end: 44,
    time: '0:40',
    title: 'Oefenen in de leermodus',
    description: 'Reconstrueer delen van een publiek script en vergelijk uw interpretatie zonder afwijkingen automatisch fout te noemen.',
  },
];

const videoStepsEn = [
  {
    start: 0,
    end: 3,
    time: '0:00',
    title: 'Open the workspace',
    description: 'Load the starter library or select an existing script.',
  },
  {
    start: 3,
    end: 6,
    time: '0:03',
    title: 'Select a role',
    description: 'Editor unlocks script editing; Administrator also unlocks roles and other taxonomy. This is not access control.',
  },
  {
    start: 6,
    end: 9,
    time: '0:06',
    title: 'Select language and script mode',
    description: 'Choose the interface language and work in public or restricted mode.',
  },
  {
    start: 9,
    end: 12,
    time: '0:09',
    title: 'Exchange the collection',
    description: 'Download or upload JSON; uploading replaces the local workspace. Importing a restricted script switches modes automatically. A public permanent link opens a copy.',
  },
  {
    start: 12,
    end: 15,
    time: '0:12',
    title: 'View a script',
    description: 'Explore scenes and M.O.; link icons show where taxonomy items are used.',
  },
  {
    start: 15,
    end: 18,
    time: '0:15',
    title: 'Exchange one script',
    description: 'Share a public script by link or export JSON, Word, or an SVG/PNG barrier model.',
  },
  {
    start: 18,
    end: 21,
    time: '0:18',
    title: 'Edit a script',
    description: 'Change script details, scenes, modi operandi, and activities.',
  },
  {
    start: 21,
    end: 24,
    time: '0:21',
    title: 'Complete the LLM brief',
    description: 'Describe the language, topic, region, detail level, and sources.',
  },
  {
    start: 24,
    end: 27,
    time: '0:24',
    title: 'Review the prompt',
    description: 'Check and copy the prompt to an LLM of your choice.',
  },
  {
    start: 27,
    end: 30,
    time: '0:27',
    title: 'Paste the JSON',
    description: 'Paste only the JSON response back into PAX.',
  },
  {
    start: 30,
    end: 36,
    time: '0:30',
    title: 'Review the result',
    description: 'Check scenes, taxonomy, and sources before confirming import.',
  },
  {
    start: 36,
    end: 40,
    time: '0:36',
    title: 'Explore a case',
    description: 'Compare concrete observations and see matched evidence and any unexplained facts.',
  },
  {
    start: 40,
    end: 44,
    time: '0:40',
    title: 'Practise in learning mode',
    description: 'Reconstruct parts of a public script and compare your interpretation without treating differences as automatically wrong.',
  },
];

const guides = {
  nl: {
    sections: localizeGuide(guideSourceNl, new Map([
      ['assets/user-guide/01-home.png', homeScreenshotNl],
      ['assets/user-guide/02-script-view.png', scriptScreenshotNl],
      ['assets/user-guide/03-script-edit.png', editorScreenshotNl],
      ['assets/user-guide/04-llm-brief.png', llmBriefScreenshotNl],
      ['assets/user-guide/05-llm-prompt-light.png', llmPromptScreenshotNl],
      ['assets/user-guide/06-llm-json-paste.png', llmJsonScreenshotNl],
      ['assets/user-guide/07-llm-review.png', llmReviewScreenshotNl],
      ['assets/user-guide/08-menu.png', menuScreenshotNl],
      ['assets/user-guide/09-script-sharing.png', scriptSharingScreenshotNl],
      ['assets/user-guide/10-case-analysis.png', caseAnalysisScreenshotNl],
      ['assets/user-guide/11-learning-mode.png', learningModeScreenshotNl],
    ])),
    captions: guideCaptionsNl,
    video: guideVideoNl,
    steps: videoStepsNl,
    captionLanguage: 'nl',
    captionLabel: 'Nederlands',
  },
  en: {
    sections: localizeGuide(guideSourceEn, new Map([
      ['assets/user-guide/en/01-home.png', homeScreenshotEn],
      ['assets/user-guide/en/02-script-view.png', scriptScreenshotEn],
      ['assets/user-guide/en/03-script-edit.png', editorScreenshotEn],
      ['assets/user-guide/en/04-llm-brief.png', llmBriefScreenshotEn],
      ['assets/user-guide/en/05-llm-prompt-light.png', llmPromptScreenshotEn],
      ['assets/user-guide/en/06-llm-json-paste.png', llmJsonScreenshotEn],
      ['assets/user-guide/en/07-llm-review.png', llmReviewScreenshotEn],
      ['assets/user-guide/en/08-menu.png', menuScreenshotEn],
      ['assets/user-guide/en/09-script-sharing.png', scriptSharingScreenshotEn],
      ['assets/user-guide/en/10-case-analysis.png', caseAnalysisScreenshotEn],
      ['assets/user-guide/en/11-learning-mode.png', learningModeScreenshotEn],
    ])),
    captions: guideCaptionsEn,
    video: guideVideoEn,
    steps: videoStepsEn,
    captionLanguage: 'en',
    captionLabel: 'English',
  },
};

export const GuidePage: MeiosisComponent = () => {
  let activeStep = 0;
  let videoElement: HTMLVideoElement | undefined;

  return {
    oninit: ({
      attrs: {
        actions: { setPage },
      },
    }) => {
      setPage(Pages.GUIDE);
    },
    view: () => {
      const guide = guides[i18n.currentLocale];
      const [guideIntroduction, guideBody] = guide.sections;
      const videoSteps = guide.steps;
      return m('article.guide-page', [
        m(
          'a.guide-back-link',
          { href: routingSvc.href(Pages.LANDING) },
          [
            m('i.material-icons[aria-hidden=true]', 'arrow_back'),
            m('span', t('GUIDE_BACK')),
          ]
        ),
        m('.guide-copy', m(SlimdownView, { md: guideIntroduction })),
        m('section.guide-walkthrough[aria-labelledby=guide-video-title]', [
          m('.guide-video-pane', [
            m(
              'video[controls][playsinline][preload=metadata][width=1440][height=900]',
              {
                'aria-label': t('LANDING_GUIDE_VIDEO_LABEL'),
                oncreate: ({ dom }) => {
                  videoElement = dom as HTMLVideoElement;
                },
                onremove: () => {
                  videoElement = undefined;
                },
                ontimeupdate: (event: Event) => {
                  const currentTime = (event.currentTarget as HTMLVideoElement).currentTime;
                  const nextStep = videoSteps.findIndex(({ start, end }) => currentTime >= start && currentTime < end);
                  if (nextStep >= 0 && nextStep !== activeStep) {
                    activeStep = nextStep;
                    m.redraw();
                  }
                },
              },
              [
                m('source', { src: guide.video, type: 'video/webm' }),
                m('track', {
                  default: true,
                  kind: 'captions',
                  src: guide.captions,
                  srclang: guide.captionLanguage,
                  label: guide.captionLabel,
                }),
              ]
            ),
            m('p.guide-video-caption', t('GUIDE_VIDEO_CAPTION')),
          ]),
          m('.guide-video-explanation', [
            m('h2#guide-video-title', t('GUIDE_VIDEO_TITLE')),
            m('p', t('GUIDE_VIDEO_DESCRIPTION')),
            m(
              'ol.guide-video-steps',
              videoSteps.map((step, index) =>
                m('li', { class: activeStep === index ? 'active' : '' }, [
                  m(
                    'button',
                    {
                      type: 'button',
                      'aria-current': activeStep === index ? 'step' : undefined,
                      onclick: () => {
                        if (videoElement) videoElement.currentTime = step.start;
                        activeStep = index;
                      },
                    },
                    [
                      m('span.guide-step-time', step.time),
                      m('span.guide-step-copy', [
                        m('strong', step.title),
                        m('span', step.description),
                      ]),
                    ]
                  ),
                ])
              )
            ),
          ]),
        ]),
        m('.guide-copy', m(SlimdownView, { md: guideBody })),
      ]);
    },
  };
};

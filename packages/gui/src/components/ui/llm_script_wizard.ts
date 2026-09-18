import m from 'mithril';
import { FlatButton, snackbar } from 'mithril-materialized';
import {
  buildLlmScriptPrompt,
  confirmGeneratedScriptImport,
  copyPromptToClipboard,
  type ContentLanguage,
  GeneratedScriptValidationError,
  type GeneratedScriptPreview,
  type GeneratedScriptValidationCode,
  type LlmDetailPreset,
  prepareGeneratedScriptImport,
  Pages,
} from '../../models';
import type { Act, Labelled } from '../../models';
import { i18n, type MeiosisComponent, t } from '../../services';

type Step = 'brief' | 'prompt' | 'paste' | 'preview';

const errorKeys: Record<GeneratedScriptValidationCode, string> = {
  invalidJson: 'LLM_ERROR_INVALID_JSON',
  expectedObject: 'LLM_ERROR_EXPECTED_OBJECT',
  expectedArray: 'LLM_ERROR_EXPECTED_ARRAY',
  expectedString: 'LLM_ERROR_EXPECTED_STRING',
  expectedNumber: 'LLM_ERROR_EXPECTED_NUMBER',
  expectedBoolean: 'LLM_ERROR_EXPECTED_BOOLEAN',
  missingField: 'LLM_ERROR_MISSING_FIELD',
  unknownField: 'LLM_ERROR_UNKNOWN_FIELD',
  invalidValue: 'LLM_ERROR_INVALID_VALUE',
  unsafeUrl: 'LLM_ERROR_UNSAFE_URL',
  duplicateId: 'LLM_ERROR_DUPLICATE_ID',
  danglingReference: 'LLM_ERROR_DANGLING_REFERENCE',
};

export const LlmScriptWizard: MeiosisComponent<{ onClose: () => void }> = () => {
  let step: Step = 'brief';
  let language: ContentLanguage = i18n.currentLocale;
  let domain = '';
  let geography = '';
  let preset: LlmDetailPreset = 'practical';
  let sourceUrls = '';
  let sourceText = '';
  let prompt = '';
  let pastedJson = '';
  let preview: GeneratedScriptPreview | undefined;
  let validationError: GeneratedScriptValidationError | undefined;

  const createPrompt = () => {
    if (!domain.trim() || !geography.trim()) {
      snackbar({ message: t('LLM_BRIEF_REQUIRED'), dismissible: true });
      return;
    }
    prompt = buildLlmScriptPrompt({
      language,
      domain: domain.trim(),
      geography: geography.trim(),
      preset,
      sourceUrls,
      sourceText,
    });
    step = 'prompt';
  };

  const validatePaste = (classification: 'public' | 'restricted') => {
    try {
      preview = prepareGeneratedScriptImport(pastedJson, language, classification);
      validationError = undefined;
      step = 'preview';
    } catch (error) {
      preview = undefined;
      validationError = error instanceof GeneratedScriptValidationError
        ? error
        : new GeneratedScriptValidationError('$', 'invalidValue', String(error));
    }
  };

  const textField = (
    id: string,
    label: string,
    value: string,
    onchange: (value: string) => void,
    textarea = false
  ) =>
    m('.input-field.col.s12', [
      textarea
        ? m(`textarea#${id}.materialize-textarea`, {
            value,
            oninput: (event: InputEvent) => onchange((event.target as HTMLTextAreaElement).value),
          })
        : m(`input#${id}`, {
            type: 'text',
            value,
            oninput: (event: InputEvent) => onchange((event.target as HTMLInputElement).value),
          }),
      m('label.active', { for: id }, label),
    ]);

  const labelledItem = (item: Labelled, details?: m.Children) =>
    m('li.llm-preview-item', [
      m('strong', item.label),
      item.description && m('p', item.description),
      details,
    ]);

  const labelledList = (title: string, items: Labelled[], details?: (item: Labelled) => m.Children) =>
    m('section.llm-preview-section', [
      m('h6', title),
      items.length
        ? m('ul.browser-default', items.map((item) => labelledItem(item, details?.(item))))
        : m('p.llm-empty', t('LLM_NONE')),
    ]);

  const actPreview = (act: Act) =>
    m('section.llm-preview-act', [
      m('h6', act.label),
      act.description && m('p', act.description),
      labelledList(t('ACTIVITIES'), act.activities, (item) => {
        const activity = item as Act['activities'][number];
        return m('small', [
          activity.cast?.length ? `${t('CAST')}: ${activity.cast.join(', ')}. ` : '',
          activity.attributes?.length ? `${t('ATTRIBUTES')}: ${activity.attributes.join(', ')}. ` : '',
          activity.transports?.length ? `${t('TRANSPORTS')}: ${activity.transports.join(', ')}.` : '',
        ]);
      }),
      labelledList(t('CONDITIONS'), act.conditions, (item) =>
        m('small', `${t('TYPE')}: ${(item as Act['conditions'][number]).type}`)
      ),
      labelledList(t('OPPORTUNITIES'), act.opportunities),
      labelledList(t('INDICATORS'), act.indicators),
      labelledList(t('MEASURES'), act.measures, (item) => {
        const measure = item as Act['measures'][number];
        return m('small', `${t('CATEGORY')}: ${measure.cat}. ${t('PARTNERS')}: ${measure.partners.join(', ') || '—'}`);
      }),
    ]);

  return {
    view: ({ attrs: { state, actions, options } }) =>
      m('.llm-script-wizard', [
        m('ol.llm-step-list', [
          m('li', { className: step === 'brief' ? 'active' : '' }, t('LLM_STEP_BRIEF')),
          m('li', { className: step === 'prompt' ? 'active' : '' }, t('LLM_STEP_PROMPT')),
          m('li', { className: step === 'paste' ? 'active' : '' }, t('LLM_STEP_PASTE')),
          m('li', { className: step === 'preview' ? 'active' : '' }, t('LLM_STEP_PREVIEW')),
        ]),
        step === 'brief' && m('.llm-step', [
          m('p.llm-privacy-note', t('LLM_PRIVACY_NOTE')),
          m('.row', [
            m('.input-field.col.s12.m6', [
              m('select#llm-language.browser-default', {
                value: language,
                onchange: (event: Event) => (language = (event.target as HTMLSelectElement).value as ContentLanguage),
              }, [
                m('option', { value: 'nl' }, t('DUTCH')),
                m('option', { value: 'en' }, t('ENGLISH')),
              ]),
              m('label.active', { for: 'llm-language' }, t('LANGUAGE')),
            ]),
            m('.input-field.col.s12.m6', [
              m('select#llm-preset.browser-default', {
                value: preset,
                onchange: (event: Event) => (preset = (event.target as HTMLSelectElement).value as LlmDetailPreset),
              }, [
                m('option', { value: 'orienting' }, t('LLM_PRESET_ORIENTING')),
                m('option', { value: 'practical' }, t('LLM_PRESET_PRACTICAL')),
                m('option', { value: 'operational' }, t('LLM_PRESET_OPERATIONAL')),
              ]),
              m('label.active', { for: 'llm-preset' }, t('LLM_DETAIL_PRESET')),
            ]),
            textField('llm-domain', t('LLM_DOMAIN'), domain, (value) => (domain = value)),
            textField('llm-geography', t('LLM_GEOGRAPHY'), geography, (value) => (geography = value)),
            textField('llm-source-urls', t('LLM_SOURCE_URLS'), sourceUrls, (value) => (sourceUrls = value), true),
            m('p.col.s12.helper-text', t('LLM_URLS_NOT_FETCHED')),
            textField('llm-source-text', t('LLM_SOURCE_TEXT'), sourceText, (value) => (sourceText = value), true),
          ]),
          m('.llm-actions', [
            m(FlatButton, { label: t('CANCEL'), iconName: 'close', onclick: options?.onClose }),
            m(FlatButton, { label: t('LLM_BUILD_PROMPT'), iconName: 'arrow_forward', onclick: createPrompt }),
          ]),
        ]),
        step === 'prompt' && m('.llm-step', [
          m('p', t('LLM_PROMPT_HELP')),
          m('textarea.llm-code-field', {
            readonly: true,
            value: prompt,
            'aria-label': t('LLM_GENERATED_PROMPT'),
          }),
          m('.llm-actions', [
            m(FlatButton, { label: t('BACK'), iconName: 'arrow_back', onclick: () => (step = 'brief') }),
            m(FlatButton, {
              label: t('LLM_COPY_PROMPT'),
              iconName: 'content_copy',
              onclick: async () => {
                try {
                  const copied = await copyPromptToClipboard(prompt, navigator.clipboard);
                  snackbar({
                    message: copied ? t('LLM_PROMPT_COPIED') : t('LLM_COPY_FAILED'),
                    dismissible: !copied,
                  });
                } catch {
                  snackbar({ message: t('LLM_COPY_FAILED'), dismissible: true });
                }
              },
            }),
            m(FlatButton, { label: t('LLM_CONTINUE_TO_PASTE'), iconName: 'arrow_forward', onclick: () => (step = 'paste') }),
          ]),
        ]),
        step === 'paste' && m('.llm-step', [
          m('p', t('LLM_PASTE_HELP')),
          m('textarea.llm-code-field', {
            value: pastedJson,
            placeholder: '{ "schemaVersion": 3, ... }',
            'aria-label': t('LLM_PASTED_JSON'),
            oninput: (event: InputEvent) => {
              pastedJson = (event.target as HTMLTextAreaElement).value;
              validationError = undefined;
            },
          }),
          validationError && m('.card-panel.red.lighten-5.red-text.text-darken-4.llm-validation-error', {
            role: 'alert',
          }, [
            m('strong', t('LLM_VALIDATION_FAILED')),
            m('div', t('LLM_VALIDATION_ERROR', {
              path: validationError.path,
              reason: t(errorKeys[validationError.code] as never),
            })),
          ]),
          m('.llm-actions', [
            m(FlatButton, { label: t('BACK'), iconName: 'arrow_back', onclick: () => (step = 'prompt') }),
            m(FlatButton, {
              label: t('LLM_VALIDATE_PREVIEW'),
              iconName: 'fact_check',
              onclick: () => validatePaste(state.scriptMode),
            }),
          ]),
        ]),
        step === 'preview' && preview && m('.llm-step', [
          m('p.llm-preview-intro', t('LLM_PREVIEW_HELP')),
          m('dl.llm-preview-summary', [
            m('div', [m('dt', t('NAME')), m('dd', preview.script.label)]),
            m('div', [m('dt', t('LANGUAGE')), m('dd', preview.script.language.toUpperCase())]),
            m('div', [
              m('dt', t('CLASSIFICATION')),
              m('dd', t(preview.script.classification === 'restricted' ? 'RESTRICTED' : 'PUBLIC')),
            ]),
            m('div', [m('dt', t('SCENES')), m('dd', String(preview.counts.scenes))]),
            m('div', [m('dt', t('REFERENCES')), m('dd', String(preview.counts.sources))]),
            m('div', [m('dt', t('LLM_TAXONOMY_ITEMS')), m('dd', String(preview.counts.taxonomyItems))]),
          ]),
          preview.script.description && m('p', preview.script.description),
          m('.script-provenance', [
            m('span.badge', t('AI_GENERATED')),
            m('span.badge', t('UNREVIEWED')),
          ]),
          m('.llm-complete-preview', [
            m('section.llm-preview-section', [
              m('h5', t('SCENES')),
              preview.script.stages.length
                ? preview.script.stages.map((scene) =>
                    m('article.llm-preview-scene', [
                      m('h6', scene.label),
                      scene.description && m('p', scene.description),
                      scene.variants.map(actPreview),
                    ])
                  )
                : m('p.llm-empty', t('LLM_NONE')),
            ]),
            m('section.llm-preview-section', [
              m('h5', t('REFERENCES')),
              preview.script.literature.length
                ? m('ul.browser-default', preview.script.literature.map((source) =>
                    labelledItem(source, [
                      source.authors && m('div', `${t('AUTHORS')}: ${source.authors}`),
                      source.type && m('div', `${t('TYPE')}: ${source.type}`),
                      source.url && m('div.llm-source-url', source.url),
                      source.usedFor && m('div', `${t('USED_FOR')}: ${source.usedFor}`),
                    ])
                  ))
                : m('p.llm-empty', t('LLM_NONE')),
            ]),
            m('section.llm-preview-section', [
              m('h5', t('LLM_REFERENCED_TAXONOMIES')),
              labelledList(t('CAST'), preview.model.cast),
              labelledList(t('ATTRIBUTES'), preview.model.attributes),
              labelledList(t('LOCATIONS', preview.model.locations.length), preview.model.locations),
              labelledList(t('GEOLOCATIONS', preview.model.geoLocations.length), preview.model.geoLocations),
              labelledList(t('PRODUCTS', preview.model.products.length), preview.model.products),
              labelledList(t('TRANSPORTS'), preview.model.transports),
              labelledList(t('PARTNERS'), preview.model.partners),
            ]),
            preview.script.tracks?.length
              ? labelledList(t('TRACKS'), preview.script.tracks, (item) => {
                  const track = item as NonNullable<GeneratedScriptPreview['script']['tracks']>[number];
                  return m('small', Object.entries(track.sceneVariants)
                    .map(([sceneId, variantId]) => `${sceneId}: ${variantId || '—'}`).join(', '));
                })
              : null,
          ]),
          m('p.llm-confirm-note', t('LLM_CONFIRM_NOTE')),
          m('.llm-actions', [
            m(FlatButton, {
              label: t('BACK'),
              iconName: 'arrow_back',
              onclick: () => {
                preview = undefined;
                step = 'paste';
              },
            }),
            m(FlatButton, {
              label: t('LLM_CONFIRM_IMPORT'),
              iconName: 'library_add',
              onclick: () => {
                const imported = confirmGeneratedScriptImport(state.model, preview!);
                const importedScript = imported.crimeScripts[imported.crimeScripts.length - 1];
                actions.saveModel(imported);
                options?.onClose();
                snackbar({ message: t('LLM_IMPORTED') });
                actions.changePage(Pages.CRIME_SCRIPT, { id: importedScript.id });
              },
            }),
          ]),
        ]),
      ]),
  };
};

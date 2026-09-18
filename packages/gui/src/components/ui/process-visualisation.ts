import m, { type FactoryComponent, type Vnode } from 'mithril';
import { type IconValue, missingIcon } from '../../models';
import { IconStrip } from './icon-strip';

export interface ProcessStep {
  id: string;
  icon?: IconValue;
  icons?: IconValue[];
  uploadedImage?: string;
  title: string;
  description?: string | Vnode;
  variants?: ProcessVariant[];
  curVariantId?: string;
}

export interface ProcessVariant {
  id: string;
  icon?: string;
  title: string;
}

export interface ProcessVisualizationAttrs {
  steps: ProcessStep[];
  onStepSelect?: (stepId: string) => void;
  onVariantSelect?: (stepId: string, variantId: string) => void;
  selectedStep?: string;
  selectedVariant?: string;
}

export const ProcessVisualization: FactoryComponent<ProcessVisualizationAttrs> = () => {
  const selectStep = (stepId: string, attrs: ProcessVisualizationAttrs) => {
    if (attrs.onStepSelect) {
      attrs.onStepSelect(stepId);
    }
  };

  const selectVariant = (event: Event, stepId: string, variantId: string, attrs: ProcessVisualizationAttrs) => {
    event.stopPropagation();
    if (attrs.onVariantSelect) {
      attrs.onVariantSelect(stepId, variantId);
    }
  };

  return {
    view: ({ attrs }) => {
      const { steps, selectedStep, selectedVariant } = attrs;
      const activeStep = steps.find(({ id }) => id === selectedStep);

      return m('.process-visualization', [
        m('.process-container', [
          steps.map((step, i) =>
            m(
              '.process-step',
              {
                class: [
                  selectedStep === step.id ? 'active' : '',
                  step.variants && step.variants.length ? 'has-variants' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
                  .trim(),
                onclick: () => selectStep(step.id, attrs),
              },
              [
                m('.step-number', i + 1),
                m(IconStrip, {
                  className: 'step-icon-strip',
                  fallback: missingIcon,
                  icon: step.icon,
                  icons: step.icons,
                  uploadedImage: step.uploadedImage,
                }),
                m('.step-content', [
                  m('h4.step-title', step.title),
                  step.curVariantId &&
                    step.variants &&
                    m('h5.step-subtitle', step.variants.find((v) => v.id === step.curVariantId)?.title),
                  m('.step-description', step.description),
                ]),
              ]
            )
          ),
        ]),
        activeStep?.variants &&
          m('.process-variants-panel', [
            m('h5.process-variants-title', activeStep.title),
            m(
              '.process-variants-list',
              activeStep.variants.map((variant) =>
                m(
                  'button.variant-option',
                  {
                    type: 'button',
                    class: selectedVariant === variant.id ? 'active' : '',
                    'aria-pressed': selectedVariant === variant.id ? 'true' : 'false',
                    onclick: (event: Event) => selectVariant(event, activeStep.id, variant.id, attrs),
                  },
                  [
                    variant.icon &&
                      m('img.variant-icon', {
                        src: variant.icon,
                        alt: '',
                      }),
                    variant.title,
                  ]
                )
              )
            ),
          ]),
      ]);
    },
  };
};

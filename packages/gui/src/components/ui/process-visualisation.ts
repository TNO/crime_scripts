import m, { FactoryComponent, Vnode } from 'mithril';

export interface ProcessStep {
  id: string;
  icon: string;
  title: string;
  description?: string | Vnode;
  variants?: ProcessVariant[];
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
  let currentStep: string | null = null;

  const toggleStep = (stepId: string, attrs: ProcessVisualizationAttrs) => {
    console.log('TOGGLE');
    currentStep = currentStep === stepId ? null : stepId;
    if (attrs.onStepSelect) {
      attrs.onStepSelect(stepId);
    }
  };

  const selectVariant = (event: Event, stepId: string, variantId: string, attrs: ProcessVisualizationAttrs) => {
    console.log('VARIANT');
    event.stopPropagation();
    if (attrs.onVariantSelect) {
      attrs.onVariantSelect(stepId, variantId);
    }
  };

  return {
    view: ({ attrs }) => {
      const { steps, selectedStep, selectedVariant } = attrs;
      return m('.process-container', [
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
              onclick: () => toggleStep(step.id, attrs),
            },
            [
              m('.step-number', i + 1),
              m('img.step-icon', {
                src: step.icon,
                alt: `${step.title} icon`,
              }),
              m('.step-content', [
                m('h4.step-title.truncate', step.title),
                m('.step-description', step.description),
                step.variants &&
                  m('.variants-container', [
                    step.variants.map((variant) =>
                      m(
                        '.variant-option',
                        {
                          class: selectedVariant === variant.id ? 'active' : '',
                          onclick: (e: Event) => selectVariant(e, step.id, variant.id, attrs),
                        },
                        [
                          variant.icon &&
                            m('img.variant-icon', {
                              src: variant.icon,
                              alt: `${variant.title} icon`,
                            }),
                          variant.title,
                        ]
                      )
                    ),
                  ]),
              ]),
            ]
          )
        ),
      ]);
    },
  };
};

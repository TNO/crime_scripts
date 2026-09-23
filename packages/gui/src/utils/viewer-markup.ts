type LabelledItem = {
  id: string;
  label: string;
  description?: string;
};

type ViewerItem = LabelledItem & {
  header?: boolean;
  parentId?: string;
};

type Barrier = LabelledItem & {
  cat: string;
  partners: string[];
};

type BarrierCategory = {
  label: string;
};

type BarrierMarkupLabels = {
  category: string;
  partners: string;
  settingsRoute: string;
};

const resolveBarrierDetails = (
  measure: Barrier,
  lookupPartner: Map<string, LabelledItem>,
  findCrimeMeasure: (id: string) => BarrierCategory | undefined
) => ({
  category: findCrimeMeasure(measure.cat)?.label,
  partners: Array.from(new Set(measure.partners || []))
    .map((partnerId) => lookupPartner.get(partnerId))
    .filter((partner): partner is LabelledItem => Boolean(partner))
    .sort((a, b) => a.label.localeCompare(b.label)),
});

export const escapeViewerText = (value = '') =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] || character
  );

export const highlightMarkupText = (markup: string, pattern: RegExp) =>
  markup
    .split(/(<[^>]+>)/g)
    .map((part) =>
      part.startsWith('<')
        ? part
        : part.replace(pattern, (match) => `<mark style="background:yellow;">${match}</mark>`)
    )
    .join('');

const itemMarkup = (item: LabelledItem) =>
  `<strong class="script-detail-title">${escapeViewerText(item.label)}</strong>${
    item.description
      ? `<p class="script-detail-description">${escapeViewerText(item.description)}</p>`
      : ''
  }`;

export const generateLabeledItemsMarkup = (items: ViewerItem[] = []): string => {
  const itemIds = new Set(items.map(({ id }) => id));
  const hasExplicitHierarchy = items.some(({ parentId }) => parentId !== undefined);
  let legacyParentId: string | undefined;
  const normalized = items.map((item) => {
    if (hasExplicitHierarchy) return item;
    if (item.header) {
      legacyParentId = item.id;
      return item;
    }
    return legacyParentId ? { ...item, parentId: legacyParentId } : item;
  });
  const nested = normalized
    .filter(({ parentId }) => !parentId || !itemIds.has(parentId))
    .map((item) => ({
      ...item,
      children: normalized.filter(({ parentId }) => parentId === item.id),
    }));

  return `<ol class="script-detail-list">${nested
    .map((item) => {
      const children = item.children.length
        ? `<ol class="script-detail-list nested" type="a">${item.children
            .map((child) => `<li>${itemMarkup(child)}</li>`)
            .join('')}</ol>`
        : '';
      return `<li>${itemMarkup(item)}${children}</li>`;
    })
    .join('')}</ol>`;
};

export const measuresToMarkup = (
  measures: Barrier[],
  lookupPartner: Map<string, LabelledItem>,
  findCrimeMeasure: (id: string) => BarrierCategory | undefined,
  labels: BarrierMarkupLabels
): string => {
  const items = measures.map((measure) => {
    const { category, partners } = resolveBarrierDetails(measure, lookupPartner, findCrimeMeasure);
    const partnerLinks = partners
      .map(
        (partner) =>
          `<a href="#!${labels.settingsRoute}?id=${encodeURIComponent(partner.id)}">${escapeViewerText(partner.label)}</a>`
      );

    return `<li class="barrier-item">
<strong class="barrier-title">${escapeViewerText(measure.label)}</strong>
${measure.description ? `<p class="barrier-description">${escapeViewerText(measure.description)}</p>` : ''}
<div class="barrier-meta">
${category ? `<span class="barrier-category">${escapeViewerText(labels.category)}: ${escapeViewerText(category)}</span>` : ''}
${partnerLinks.length ? `<span class="barrier-partners"><strong>${escapeViewerText(labels.partners)}:</strong> ${partnerLinks.join(', ')}</span>` : ''}
</div>
</li>`;
  });

  return `<ol class="barrier-list">${items.join('')}</ol>`;
};

export const measuresToMarkdown = (
  measures: Barrier[],
  lookupPartner: Map<string, LabelledItem>,
  findCrimeMeasure: (id: string) => BarrierCategory | undefined,
  labels: BarrierMarkupLabels
): string =>
  measures
    .map((measure, index) => {
      const { category, partners } = resolveBarrierDetails(measure, lookupPartner, findCrimeMeasure);
      const details = [
        measure.description ? `   ${measure.description}` : '',
        category ? `   **${labels.category}:** ${category}` : '',
        partners.length
          ? `   **${labels.partners}:** ${partners
              .map((partner) => `[${partner.label}](#!${labels.settingsRoute}?id=${encodeURIComponent(partner.id)})`)
              .join(', ')}`
          : '',
      ].filter(Boolean);
      return `${index + 1}. **${measure.label}**${details.length ? `\n${details.join('\n')}` : ''}`;
    })
    .join('\n');

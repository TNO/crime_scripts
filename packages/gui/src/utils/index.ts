import m from 'mithril';
import { padLeft } from 'mithril-materialized';
import {
  Act,
  Activity,
  CrimeScript,
  CrimeScriptFilter,
  DataModel,
  FlexSearchResult,
  Hierarchical,
  ID,
  Labeled,
  Measure,
  NewsArticle,
  Page,
  Pages,
  SearchResult,
} from '../models';
import { i18n, t } from '../services';
import saveAs from 'file-saver';

export const LANGUAGE = 'CSS_LANGUAGE';
export const SAVED = 'CSS_MODEL_SAVED';

const supRegex = /\^([^_ ]+)(_|$|\s)/g;
const subRegex = /\_([^\^ ]+)(\^|$|\s)/g;

/** Expand markdown notation by converting A_1 to subscript and x^2 to superscript. */
export const subSup = (s: string) => (s ? s.replace(supRegex, `<sup>$1</sup>`).replace(subRegex, `<sub>$1</sub>`) : s);

export const capitalize = (s?: string) => s && s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Debounce function wrapper, i.e. between consecutive calls of the wrapped function,
 * there will be at least TIMEOUT milliseconds.
 * @param func Function to execute
 * @param timeout Timeout in milliseconds
 * @returns
 */
export const debounce = (func: (...args: any) => void, timeout: number) => {
  let timer: number;
  return (...args: any) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      func(...args);
    }, timeout);
  };
};

export const formatDate = (date: number | Date = new Date(), separator = '-') => {
  const d = new Date(date);
  return `${d.getFullYear()}${separator}${padLeft(d.getMonth() + 1)}${separator}${padLeft(d.getDate())}`;
};

/**
 * Get a color that is clearly visible against a background color
 * @param backgroundColor Background color, e.g. #99AABB
 * @returns
 */
export const getTextColorFromBackground = (backgroundColor?: string) => {
  if (!backgroundColor) {
    return 'black-text';
  }
  const c = backgroundColor.substring(1); // strip #
  const rgb = parseInt(c, 16); // convert rrggbb to decimal
  const r = (rgb >> 16) & 0xff; // extract red
  const g = (rgb >> 8) & 0xff; // extract green
  const b = (rgb >> 0) & 0xff; // extract blue

  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709

  return luma < 105 ? 'white-text' : 'black-text';
};

type Option<T> = {
  id: T;
  label: string;
  title?: string;
};

export const getOptionsLabel = <T>(options: Array<Option<T>>, id?: T | T[], showTitle = true) => {
  if (!id) {
    return '';
  }
  const print = (o: Option<T>) =>
    showTitle ? `${o.label}${o.title ? ` (${o.title.replace(/\.\s*$/, '')})` : ''}` : o.label;
  if (id instanceof Array) {
    return options
      .filter((o) => id.indexOf(o.id) >= 0)
      .map((o) => print(o))
      .join(', ');
  }
  const found = options.filter((o) => o.id === id).shift();
  return found ? print(found) : '';
};

/** Join a list of items with a comma, and use AND for the last item in the list. */
export const joinListWithAnd = (arr: string[] = [], and = 'and', prefix = '') => {
  const terms = arr.filter((term) => term);
  return terms.length === 0
    ? ''
    : prefix +
        (terms.length === 1
          ? terms[0]
          : `${terms
              .slice(0, terms.length - 1)
              .map((t, i) => (i === 0 || typeof t === 'undefined' ? t : t.toLowerCase()))
              .join(', ')} ${and} ${terms[terms.length - 1].toLowerCase()}`);
};

/** Convert markdown text to HTML */
// export const markdown2html = (markdown = '') =>
//   m.trust(render(markdown, true, true));

export const isUnique = <T>(item: T, pos: number, arr: T[]) => arr.indexOf(item) == pos;

/** Generate an array of numbers, from start till end, with optional step size. */
export const generateNumbers = (start: number, end: number, step: number = 1): number[] => {
  if (start > end) {
    throw new Error('Start number must be less than or equal to the end number.');
  }

  if (step <= 0) {
    throw new Error('Step size must be a positive number.');
  }

  const length = Math.floor((end - start) / step) + 1;
  return Array.from({ length }, (_, index) => start + index * step);
};

export const getRandomValue = <T>(array: T[]): T | undefined => {
  if (array.length === 0) {
    return undefined;
  }

  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
};

/**
 * Deep copy function for TypeScript.
 * @param T Generic type of target/copied value.
 * @param target Target value to be copied.
 * @see Source project, ts-deepcopy https://github.com/ykdr2017/ts-deepcopy
 * @see Code pen https://codepen.io/ErikVullings/pen/ejyBYg
 */
export const deepCopy = <T>(target: T): T => {
  if (target === null) {
    return target;
  }
  if (target instanceof Date) {
    return new Date(target.getTime()) as any;
  }
  if (target instanceof Array) {
    const cp = [] as any[];
    (target as any[]).forEach((v) => {
      cp.push(v);
    });
    return cp.map((n: any) => deepCopy<any>(n)) as any;
  }
  if (typeof target === 'object') {
    const cp = { ...(target as { [key: string]: any }) } as {
      [key: string]: any;
    };
    Object.keys(cp).forEach((k) => {
      cp[k] = deepCopy<any>(cp[k]);
    });
    return cp as T;
  }
  return target;
};

/** Compute a contrasting background color */
export const contrastingColor = (backgroundColor: string) => {
  const backgroundRgb = [
    parseInt(backgroundColor[1] + backgroundColor[2], 16),
    parseInt(backgroundColor[3] + backgroundColor[4], 16),
    parseInt(backgroundColor[5] + backgroundColor[6], 16),
  ];
  const luminance = 0.2126 * backgroundRgb[0] + 0.7152 * backgroundRgb[1] + 0.0722 * backgroundRgb[2];

  // If the background is dark, use white text.
  if (luminance < 20) {
    return '#ffffff';
  }

  // If the background is light, use black text.
  return '#000000';
};

export const scrollToSection = (e: MouseEvent, id: string): void => {
  e.preventDefault();
  const element = document.getElementById(id);

  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  } else {
    console.log(`Element with id ${id} not found.`);
  }
};

export const scrollToTop = (): void => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
};

export const addLeadingSpaces = (str: string, numSpaces: number): string => {
  // Create a string with the specified number of spaces
  const spaces = ' '.repeat(numSpaces);
  // Concatenate the spaces with the original string
  return spaces + str;
};

export type InputOptions = {
  id: string;
  label?: string;
  group?: string;
  icon?: string;
};

export const toOptions = (arr: Array<Hierarchical & Labeled>, noGroup = false): InputOptions[] =>
  arr.map(({ id, label, parents }) => ({
    id,
    label,
    group: noGroup
      ? undefined
      : parents && parents.length > 0
      ? arr.find((l) => l.id === parents[0])?.label
      : t('OTHER'),
  }));

export const resolveOptions = (arr: Array<Labeled> = [], ids: ID | ID[] = []) => {
  ids = Array.isArray(ids) ? ids : [ids];
  return arr.filter((a) => ids.includes(a.id));
};

/** Convert to markdown unsorted list */
export const toMarkdownUl = (arr: Array<Labeled> = [], ids: ID | ID[] = []) =>
  resolveOptions(arr, ids)
    .map((a) => `- ${a.label}`)
    .join('\n');

/** Convert to markdown sorted list */
export const toMarkdownOl = (arr: Array<Labeled> = [], ids: ID | ID[] = []) =>
  resolveOptions(arr, ids)
    .map((a, i) => `${i + 1}. ${a.label}`)
    .join('\n');

/** Convert to comma-separated sorted list */
export const toCommaSeparatedList = (arr: Array<Labeled> = [], ids: ID | ID[] = []) =>
  resolveOptions(arr, ids)
    .map((a, _i) => a.label)
    .join(', ');

export const createTooltip = (c: Labeled) =>
  c.description ? `&nbsp;<div class="info tooltip">&#8505;<span class="tooltiptext">${c.description}</span></div>` : '';

export const generateLabeledItemsMarkup = (items: Array<Labeled & { header?: boolean }> = []): string => {
  const [_, nested] = items.reduce(
    (acc, cur) => {
      const [isNested] = acc;
      if (cur.header) {
        (acc[0] = true), acc[1].push({ ...cur, children: [] });
      } else {
        if (isNested) {
          const lastItem = acc[1][acc[1].length - 1];
          if (lastItem) {
            lastItem.children.push({ ...cur });
          }
        } else {
          acc[1].push({ ...cur, children: [] });
        }
      }
      return acc;
    },
    [false, []] as [isNested: boolean, nested: Array<Labeled & { children: Labeled[] }>]
  );

  return (
    '<ol>' +
    nested
      .map((item) => {
        const children =
          item.children.length > 0 ? item.children.map((c) => `<li>${c.label}${createTooltip(c)}</li>`).join('') : '';
        return `<li>${item.label}${createTooltip(item)}${children ? `<ol type="a">${children}</ol>` : ''}</li>`;
      })
      .join('\n') +
    '</ol>'
  );
};

export const crimeScriptFilterToText = (arr: Array<Labeled> = [], filter = {} as CrimeScriptFilter) => {
  const {
    productIds = [],
    geoLocationIds = [],
    locationIds = [],
    roleIds = [],
    attributeIds = [],
    transportIds = [],
  } = filter;
  return toCommaSeparatedList(arr, [
    ...productIds,
    ...geoLocationIds,
    ...locationIds,
    ...roleIds,
    ...attributeIds,
    ...transportIds,
  ]);
};

/** Tokenize a text by removing punctuation, splitting the text into stems, lowercasing and removing stopwords and (almost) empty strings */
export const tokenize = (text: string = '', stopwords: string[]): string[] => {
  return i18n.stemmer!.stemText(text).filter((word) => word.length > 2 && !stopwords.includes(word));
};

/** Aggregate all search results to determine the most relevant crimescript (and act of that crimescript) */
export const aggregateFlexSearchResults = (results: FlexSearchResult[]): SearchResult[] => {
  // Step 1: Aggregate by crimeScriptIdx
  const crimeScriptMap = new Map<number, SearchResult>();

  for (const [crimeScriptIdx, actIdx, phaseIdx, score] of results) {
    if (!crimeScriptMap.has(crimeScriptIdx)) {
      crimeScriptMap.set(crimeScriptIdx, {
        crimeScriptIdx,
        totalScore: 0,
        acts: [],
      });
    }

    const crimeScript = crimeScriptMap.get(crimeScriptIdx)!;
    crimeScript.totalScore += score;

    const existingAct = crimeScript.acts.find((act) => act.actIdx === actIdx);
    if (existingAct) {
      existingAct.score += score;
    } else {
      crimeScript.acts.push({ actIdx, phaseIdx, score });
    }
  }

  // Step 2: Sort the results
  const sortedResults = Array.from(crimeScriptMap.values()).sort((a, b) => {
    // Sort by total score of crimeScript
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }

    // If total scores are equal, sort by the highest scoring act
    const maxScoreA = Math.max(...a.acts.map((act) => act.score));
    const maxScoreB = Math.max(...b.acts.map((act) => act.score));
    return maxScoreB - maxScoreA;
  });

  // Sort acts within each crimeScript
  sortedResults.forEach((crimeScript) => {
    crimeScript.acts.sort((a, b) => b.score - a.score);
  });

  return sortedResults;
};

export const isActivePage = (page: Pages) => (d: Page) => page === d.id ? 'active' : undefined;

/**
 * Determines whether the current page is considered small based on the width of the window.
 * @returns A boolean indicating whether the current page is small.
 */
export const isSmallPage = (): boolean => {
  const width = window.innerWidth;

  // Materialize medium size range: 601px - 992px
  return width < 601;
  // && width <= 992;
};

/** Sort labels alphabetically */
export const sortByLabel = ({ label: labelA = '' }: Labeled, { label: labelB = '' }: Labeled) =>
  labelA.localeCompare(labelB);

/**
 * Converts an array of measures into a markdown-formatted string grouped by partner label.
 * @param measures - An array of Measure objects.
 * @param lookupPartner - A Map<ID, Labeled> object used for looking up partner labels.
 * @param findCrimeMeasure - A function that takes a string (id) and returns an object with properties id, icon?, label, and group.
 * @returns A string containing markdown-formatted measures grouped by partner label.
 */
export const measuresToMarkdown = (
  measures: Measure[],
  lookupPartner: Map<ID, Labeled>,
  findCrimeMeasure: (id: string) =>
    | {
        id: string;
        icon?: string;
        label: string;
        group: string;
      }
    | undefined
): string => {
  type PartnerMeasure = {
    id: string;
    label: string;
    description?: string;
    cat?: string;
  };
  const addMeasure = (partnerLabel: string, measure: Measure) => {
    if (!groupedMeasures.has(partnerLabel)) {
      groupedMeasures.set(partnerLabel, []);
    }
    groupedMeasures.get(partnerLabel)?.push({
      id: measure.id,
      label: measure.label,
      description: measure.description,
      cat: findCrimeMeasure(measure.cat)?.label,
    });
  };

  const groupedMeasures = new Map<string, PartnerMeasure[]>();

  const othersLabel = t('OTHER');
  for (const measure of measures) {
    if (measure.partners && measure.partners.length) {
      for (const partner of measure.partners) {
        const partnerLabel = lookupPartner.get(partner)?.label || othersLabel;
        addMeasure(partnerLabel, measure);
      }
    } else {
      addMeasure(othersLabel, measure);
    }
  }

  let markdown = '';

  const sortedKeys = Array.from(groupedMeasures.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map((a) => a[0]);
  let i = 0;
  for (const partnerLabel of sortedKeys) {
    i++;
    const measures = groupedMeasures.get(partnerLabel) || [];
    measures.sort(({ cat: catA = '' }, { cat: catB = '' }) => catA.localeCompare(catB));
    markdown += `${i}. **${partnerLabel}**:\n`;
    markdown += `${measures
      .map((measure) => `  - **${measure.cat}**: ${measure.label}${createTooltip(measure)}`)
      .join('\n')}\n`;
  }

  // console.log(markdown);
  return markdown;
};

/**
 * Function to highlight matched words
 */
// export const highlight = (text: string, search?: string): m.Children => {
export const highlight = (text: string, searchTerms?: string | string[]): m.Children => {
  if (!searchTerms || !searchTerms.length) return text; // Return plain text if no search terms

  const searchTermList = Array.isArray(searchTerms)
    ? searchTerms
    : searchTerms
        .split(/\s+/g)
        .map((s) => s.trim())
        .filter(Boolean);
  // Escape special regex characters in search terms
  const escapedTerms = searchTermList.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  // Create a single regex to match any of the terms
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

  // Split the text by the regex and wrap matching parts
  const parts = text.split(regex);
  return parts.map((part) => (regex.test(part) ? m('mark', { style: 'background: yellow;' }, part) : part));
};

export const highlightFactory = (searchTerms?: string | string[]) => {
  if (!searchTerms || !searchTerms.length)
    return {
      highlighter: (text?: string) => text || '',
      mdHighlighter: (text?: string) => text || '',
    }; // Return plain text if no search terms

  const searchTermList = Array.isArray(searchTerms)
    ? searchTerms
    : searchTerms
        .split(/\s+/g)
        .map((s) => s.trim())
        .filter(Boolean);
  // Escape special regex characters in search terms
  const escapedTerms = searchTermList.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  // Create a single regex to match any of the terms
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

  return {
    highlighter: (text?: string) => {
      if (!text) return [];
      // Split the text by the regex and wrap matching parts
      const parts = text.split(regex);
      return parts.map((part) => (regex.test(part) ? m('mark', { style: 'background: yellow;' }, part) : part));
    },
    mdHighlighter: (text?: string) => {
      if (!text) return '';
      // Split the text by the regex and wrap matching parts
      const parts = text.split(regex);
      return parts
        .map((part) => (regex.test(part) ? `<mark style="background:yellow;">${part}</mark>` : part))
        .join('');
    },
  };
};

/** Converts a crime script to a Word docx document and saves it */
export const toJSON = async (filename: string, cs: Partial<CrimeScript>, model: DataModel) => {
  const stageIds = cs.stages?.reduce((acc, stage) => {
    stage.ids?.forEach((id) => acc.add(id));
    return acc;
  }, new Set<ID>());
  const acts = model.acts.filter((a) => stageIds?.has(a.id));
  const castIds = acts.reduce((acc, act) => {
    act.activities.forEach((activity) => {
      activity.cast?.forEach((cm) => acc.add(cm));
    });
    return acc;
  }, new Set<ID>());
  const cast = model.cast.filter((a) => castIds?.has(a.id));
  const attributeIds = acts.reduce((acc, act) => {
    act.activities.forEach((activity) => {
      activity.attributes?.forEach((cm) => acc.add(cm));
    });
    return acc;
  }, new Set<ID>());
  const attributes = model.attributes.filter((a) => attributeIds?.has(a.id));
  const transportIds = acts.reduce((acc, act) => {
    act.activities.forEach((activity) => {
      activity.transports?.forEach((cm) => acc.add(cm));
    });
    return acc;
  }, new Set<ID>());
  const transports = model.transports.filter((a) => transportIds?.has(a.id));
  const partnerIds = acts.reduce((acc, act) => {
    act.measures.forEach((measure) => {
      measure.partners?.forEach((cm) => acc.add(cm));
    });
    return acc;
  }, new Set<ID>());
  const partners = model.partners.filter((a) => partnerIds?.has(a.id));
  const serviceProviderIds = acts.reduce((acc, act) => {
    act.activities.forEach((activity) => {
      activity.sp?.forEach((cm) => acc.add(cm));
    });
    return acc;
  }, new Set<ID>());
  const serviceProviders = model.serviceProviders.filter((a) => serviceProviderIds?.has(a.id));
  const locationsIds = acts.reduce((acc, act) => {
    act.locationIds?.forEach((id) => {
      acc.add(id);
    });
    return acc;
  }, new Set<ID>());
  const locations = model.locations.filter((a) => locationsIds?.has(a.id));
  const geoLocations = model.geoLocations.filter((a) => cs.geoLocationIds?.includes(a.id));
  const products = model.products.filter((a) => cs.productIds?.includes(a.id));

  const dataStr =
    'data:text/json;charset=utf-8,' +
    encodeURIComponent(
      JSON.stringify({
        ...model,
        previewMode: true,
        crimeScripts: [cs],
        acts,
        cast,
        locations,
        geoLocations,
        products,
        attributes,
        transports,
        partners,
        serviceProviders,
        lastUpdate: Date.now(),
      } as DataModel)
    );
  saveAs(dataStr, filename.replace('.docx', '.json'));
};

export function mergeDataModels(model1: DataModel, model2: DataModel): DataModel {
  const labelToIdMap = new Map<string, ID>();

  const mergeLabeledArrays = <T extends { id: ID; label: string }>(arr1: T[], arr2: T[]): T[] => {
    const mergedMap = new Map<ID, T>();

    arr1.forEach((item) => {
      mergedMap.set(item.id, item);
      labelToIdMap.set(item.label, item.id);
    });

    arr2.forEach((item) => {
      if (!mergedMap.has(item.id)) {
        const existingId = labelToIdMap.get(item.label);

        if (existingId) {
          const existingItem = mergedMap.get(existingId)!;
          mergedMap.set(existingId, {
            ...existingItem,
            ...item,
            id: existingId,
          });
        } else {
          mergedMap.set(item.id, item);
          labelToIdMap.set(item.label, item.id);
        }
      }
    });

    return Array.from(mergedMap.values());
  };

  const updateActReferences = (acts: Act[]): Act[] => {
    return acts.map((act) => ({
      ...act,
      locationIds: act.locationIds?.map((id) => labelToIdMap.get(id) || id),
      activities: act.activities.map(updateActivityReferences),
    }));
  };

  const updateActivityReferences = (activity: Activity): Activity => ({
    ...activity,
    cast: activity.cast?.map((id) => labelToIdMap.get(id) || id),
    attributes: activity.attributes?.map((id) => labelToIdMap.get(id) || id),
    sp: activity.sp?.map((id) => labelToIdMap.get(id) || id),
    transports: activity.transports?.map((id) => labelToIdMap.get(id) || id),
  });

  const mergeArticles = (arr1: NewsArticle[], arr2: NewsArticle[]): NewsArticle[] => {
    const mergedMap = new Map<string, NewsArticle>();

    arr1.forEach((article) => mergedMap.set(article.url, article));

    arr2.forEach((article) => {
      const existingArticle = mergedMap.get(article.url);
      if (!existingArticle) {
        mergedMap.set(article.url, article);
      }
    });

    return Array.from(mergedMap.values());
  };

  return {
    version: Math.max(model1.version, model2.version),
    lastUpdate: Math.max(model1.lastUpdate, model2.lastUpdate),
    previewMode: false,

    crimeScripts: mergeLabeledArrays(model1.crimeScripts, model2.crimeScripts),
    cast: mergeLabeledArrays(model1.cast, model2.cast),
    attributes: mergeLabeledArrays(model1.attributes, model2.attributes),
    locations: mergeLabeledArrays(model1.locations, model2.locations),
    geoLocations: mergeLabeledArrays(model1.geoLocations, model2.geoLocations),
    products: mergeLabeledArrays(model1.products, model2.products),
    transports: mergeLabeledArrays(model1.transports, model2.transports),
    partners: mergeLabeledArrays(model1.partners, model2.partners),
    serviceProviders: mergeLabeledArrays(model1.serviceProviders, model2.serviceProviders),
    acts: updateActReferences(mergeLabeledArrays(model1.acts, model2.acts)),
    articles: mergeArticles(model1.articles, model2.articles),
  };
}

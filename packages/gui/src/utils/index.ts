import { padLeft } from 'mithril-materialized';
import { CrimeScriptFilter, FlexSearchResult, Hierarchical, ID, Labeled, Page, Pages, SearchResult } from '../models';
import { t } from '../services';

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

export const generateLabeledItemsMarkup = (items: Array<Labeled & { header?: boolean }> = []): string => {
  // Check if there are any header items
  const hasHeaders = items.some((item) => item.header);

  // Initialize result string
  let result = '';

  // Initialize ordered list items
  let listItems: string[] = [];

  // Process each item
  items.forEach((item) => {
    if (item.header && hasHeaders) {
      // If we have collected list items, render them before the header
      if (listItems.length > 0) {
        result += `<ol>\n${listItems.join('\n')}\n</ol>\n`;
        listItems = [];
      }

      // Add header with optional description
      result += `<h6>${item.label}</h6>\n`;
      if (item.description) {
        result += `<p>${item.description}</p>\n`;
      }
    } else {
      // Create list item with optional description
      let listItem = `<li>${item.label}`;
      if (item.description) {
        listItem += `<br>${item.description}`;
      }
      listItem += '</li>';
      listItems.push(listItem);
    }
  });

  // If we have remaining list items, render them
  if (listItems.length > 0) {
    result += `<ol>\n${listItems.join('\n')}\n</ol>\n`;
  }

  return result.trim();
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

/** Tokenize a text by removing punctuation, splitting the text into words, lowercasing and removing stopwords and (almost) empty strings */
export const tokenize = (text: string = '', stopwords: string[]): string[] => {
  // return tokenizer.tokenize(text).map((word) => stemmer.stem(word));
  return text
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/) // Split into words
    .map((word) => word.toLowerCase()) // Convert to lowercase
    .filter((word) => word.length > 2 && !stopwords.includes(word)); // Exclude stopwords and empty strings
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

export const isSmallPage = (): boolean => {
  const width = window.innerWidth;

  // Materialize medium size range: 601px - 992px
  return width < 601;
  // && width <= 992;
};

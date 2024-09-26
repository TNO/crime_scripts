import { Service } from 'meiosis-setup/types';
import { State } from './meiosis';
import { DataModel, Hierarchical, ID, Labeled } from '../models';
import { i18n } from './translations';

export type FlexSearchResult = [crimeScriptIdx: number, actIdx: number, phaseIdx: number, score: number];

export const tokenize = (text: string = '', stopwords: string[]): string[] => {
  return text
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/) // Split into words
    .map((word) => word.toLowerCase()) // Convert to lowercase
    .filter((word) => word.length > 2 && !stopwords.includes(word)); // Exclude stopwords and empty strings
};

export enum SearchScore {
  EXACT_MATCH = 3,
  PARENT_MATCH = 2,
  OTHER_MATCH = 1,
}

/**
 * A flexible search solution:
 *
 * Build an index where each word refers to one or more locations in a crime script. The locations are encoded with an array of tuples,
 * where each tuple represents a document location, and contains the following properties:
 * crime script idx (index), phase idx, act idx, score.
 *
 * The score represents the quality of the match:
 *  - 3: for exact matching of any attribute or one of its synonyms (transport, product, crime attribute, location)
 *  - 2: for exact matching of the parent of any attribute or one of its synonyms
 *  - 1: for other matches, e.g. in the label or description.
 *
 * Every time the model is updated, recreate/update this index (depending on the speed).
 *
 * When labels or descriptions are added, first remove the stopwords for the current language model.
 *
 * For each crime script, add the label and description and map location(s).
 *    For each stage, add each act
 *      For each act, add the label and description, and the location(s)
 *        For each activity, add the label, cast, transport, attributes.
 *          If cast, transport, attributes have synonyms, add them too.
 *          If cast, transport, attributes have parents, add them too, but with a lower score.
 *        For each condition, add the label.
 *
 * When searching for words or a casus description, remove stopwords. Next.
 *    For each word, look them up in the index and add them to the search result array.
 * The search result array is sorted;
 * - Highest scoring crime script idx
 *   - Highest scoring stage/act idx
 */
export const flexSearchLookupUpdater: Service<State> = {
  onchange: (state) => `${state.locale} - ${state.model.lastUpdate}`,
  run: (cell) => {
    const state = cell.getState();
    if (!state.locale) return;
    const { model = {} as DataModel } = state;
    const { crimeScripts = [], cast = [], attributes = [], acts = [], locations = [], transports = [] } = model;

    const itemLookup = [...cast, ...attributes, ...transports, ...locations].reduce(
      (acc, cur) => acc.set(cur.id, cur),
      new Map<ID, Labeled & Hierarchical>()
    );

    const lookup = new Map<string, FlexSearchResult[]>();

    const updateLookup = (word: string, res: FlexSearchResult) => {
      word = word.trim().toLowerCase();
      const found = lookup.get(word);
      if (found) {
        lookup.set(word, [...found, res]);
      } else {
        lookup.set(word, [res]);
      }
    };

    const processItemIds = (itemIds: ID[], res: FlexSearchResult, includeParents = true) => {
      itemIds
        .map((id) => itemLookup.get(id))
        .filter((item) => typeof item !== 'undefined')
        .forEach((item) => {
          updateLookup(item.label, res);
          item.synonyms?.forEach((syn) => updateLookup(syn, res));
          if (includeParents && item.parents)
            processItemIds(item.parents, [res[0], res[1], res[2], SearchScore.PARENT_MATCH] as FlexSearchResult, false);
        });
    };

    crimeScripts.forEach((crimeScript, crimeScriptIdx) => {
      const { label = '', description = '', stages: actVariants = [] } = crimeScript;
      const flexLoc: FlexSearchResult = [crimeScriptIdx, -1, -1, SearchScore.OTHER_MATCH];
      tokenize(label + ' ' + description, i18n.stopwords).forEach((word) => updateLookup(word, flexLoc));
      actVariants.forEach(({ ids }) => {
        ids.forEach((actId) => {
          const actIdx = acts.findIndex((a) => a.id === actId);
          if (actIdx < 0) return;
          const act = acts[actIdx];
          [act.preparation, act.preactivity, act.activity, act.postactivity].forEach((phase, phaseIdx) => {
            if (phase.locationIds && Array.isArray(phase.locationIds)) {
              processItemIds(phase.locationIds, [
                crimeScriptIdx,
                actIdx,
                phaseIdx,
                SearchScore.EXACT_MATCH,
              ] as FlexSearchResult);
            }
            const res: FlexSearchResult = [crimeScriptIdx, actIdx, phaseIdx, SearchScore.OTHER_MATCH];
            phase.activities?.forEach((activity) => {
              const { label = '', description = '', cast = [], attributes = [], transports = [] } = activity;
              tokenize(label + ' ' + description, i18n.stopwords).forEach((word) => updateLookup(word, res));
              const exactRes: FlexSearchResult = [crimeScriptIdx, actIdx, phaseIdx, SearchScore.EXACT_MATCH];
              processItemIds([...cast, ...attributes, ...transports], exactRes);
            });
            phase.conditions?.forEach((condition) => {
              const { label = '', description = '' } = condition;
              tokenize(label + ' ' + description, i18n.stopwords).forEach((word) => updateLookup(word, res));
            });
          });
        });
      });
    });
    cell.update({ lookup: () => lookup });
  },
};

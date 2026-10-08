import type { Act, Cast, CrimeScript, ID, Labelled } from './data-model.ts';

export type LearningQuestionKind =
  | 'scene-selection'
  | 'scene-order'
  | 'activity-selection'
  | 'role-selection'
  | 'indicator-selection'
  | 'measure-selection';

export type LearningCandidate = Labelled;

export type LearningQuestion = {
  id: ID;
  kind: LearningQuestionKind;
  context: string;
  candidates: LearningCandidate[];
  referenceIds: ID[];
};

export type LearningExercise = {
  id: string;
  seed: number;
  scriptId: ID;
  scriptLabel: string;
  questions: LearningQuestion[];
};

export type LearningComparison = {
  matchesReference: boolean;
  matchedIds: ID[];
  missingIds: ID[];
  additionalIds: ID[];
  matchingOrderPairs?: number;
  referenceOrderPairs?: number;
};

export const learningScripts = (
  scripts: readonly CrimeScript[],
  reviewedOnly: boolean
) => reviewedOnly
  ? scripts.filter(({ status, unreviewed }) => status >= 4 && !unreviewed)
  : [...scripts];

export const isLearningExerciseAvailable = (
  exercise: LearningExercise,
  scripts: readonly CrimeScript[]
) => scripts.some(({ id }) => id === exercise.scriptId);

const randomForSeed = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffled = <T>(items: readonly T[], random: () => number): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};

const asCandidate = ({ id, label, description }: Labelled): LearningCandidate => {
  if (typeof label !== 'string' || !label.trim()) {
    console.warn(`Learning exercise item "${id}" has no label; displaying its ID.`);
    return { id, label: id, description };
  }
  return { id, label, description };
};

const uniqueAlternatives = (
  reference: readonly LearningCandidate[],
  alternatives: readonly LearningCandidate[]
) => {
  const ids = new Set(reference.map(({ id }) => id));
  const labels = new Set(reference.map(({ label }) => label.trim().toLocaleLowerCase()));
  return alternatives.filter(({ id, label }) => {
    const normalizedLabel = label.trim().toLocaleLowerCase();
    if (ids.has(id) || labels.has(normalizedLabel)) return false;
    ids.add(id);
    labels.add(normalizedLabel);
    return true;
  });
};

const candidatePool = (
  reference: readonly LearningCandidate[],
  alternatives: readonly LearningCandidate[],
  random: () => number
) => shuffled([
  ...reference,
  ...shuffled(uniqueAlternatives(reference, alternatives), random).slice(0, 4),
], random);

const variantsOf = (scripts: readonly CrimeScript[]) =>
  scripts.flatMap(({ stages }) => stages.flatMap(({ variants }) => variants));

const firstVariantWith = (script: CrimeScript, hasItems: (variant: Act) => boolean) =>
  script.stages.flatMap(({ variants }) => variants).find(hasItems);

export const generateLearningExercise = (
  script: CrimeScript,
  scripts: readonly CrimeScript[],
  cast: readonly Cast[],
  seed: number
): LearningExercise => {
  const random = randomForSeed(seed);
  const compatibleScripts = scripts.filter(({ id, classification, language }) =>
    id !== script.id && classification === script.classification && language === script.language
  );
  const scriptVariants = variantsOf([script]);
  const compatibleVariants = variantsOf(compatibleScripts);
  const sceneReference = script.stages.map(asCandidate);
  const questions: LearningQuestion[] = [
    {
      id: `${script.id}:scene-selection`,
      kind: 'scene-selection',
      context: script.label,
      candidates: candidatePool(
        sceneReference,
        compatibleScripts.flatMap(({ stages }) => stages.map(asCandidate)),
        random
      ),
      referenceIds: sceneReference.map(({ id }) => id),
    },
    {
      id: `${script.id}:scene-order`,
      kind: 'scene-order',
      context: script.label,
      candidates: shuffled(sceneReference, random),
      referenceIds: sceneReference.map(({ id }) => id),
    },
  ];

  const activityVariant = firstVariantWith(script, ({ activities }) => activities.length > 0);
  if (activityVariant) {
    const reference = activityVariant.activities.map(asCandidate);
    questions.push({
      id: `${script.id}:${activityVariant.id}:activities`,
      kind: 'activity-selection',
      context: activityVariant.label,
      candidates: candidatePool(
        reference,
        compatibleVariants.flatMap(({ activities }) => activities.map(asCandidate)),
        random
      ),
      referenceIds: reference.map(({ id }) => id),
    });

  }

  const castById = new Map(cast.map((role) => [role.id, role]));
  const roleActivity = scriptVariants
    .flatMap(({ activities }) => activities)
    .find(({ cast: roleIds = [] }) => roleIds.some((id) => castById.has(id)));
  if (roleActivity?.cast?.length) {
    const reference = roleActivity.cast.flatMap((id) => {
      const role = castById.get(id);
      return role ? [asCandidate(role)] : [];
    });
    const compatibleRoleIds = new Set(
      compatibleVariants.flatMap(({ activities }) => activities.flatMap(({ cast: ids = [] }) => ids))
    );
    questions.push({
      id: `${script.id}:${roleActivity.id}:roles`,
      kind: 'role-selection',
      context: roleActivity.label,
      candidates: candidatePool(
        reference,
        cast.filter(({ id }) => compatibleRoleIds.has(id)).map(asCandidate),
        random
      ),
      referenceIds: reference.map(({ id }) => id),
    });
  }

  const indicatorVariant = firstVariantWith(script, ({ indicators }) => indicators.length > 0);
  if (indicatorVariant) {
    const reference = indicatorVariant.indicators.map(asCandidate);
    questions.push({
      id: `${script.id}:${indicatorVariant.id}:indicators`,
      kind: 'indicator-selection',
      context: indicatorVariant.label,
      candidates: candidatePool(
        reference,
        compatibleVariants.flatMap(({ indicators }) => indicators.map(asCandidate)),
        random
      ),
      referenceIds: reference.map(({ id }) => id),
    });
  }

  const measureVariant = firstVariantWith(script, ({ measures }) => measures.length > 0);
  if (measureVariant) {
    const reference = measureVariant.measures.map(asCandidate);
    questions.push({
      id: `${script.id}:${measureVariant.id}:measures`,
      kind: 'measure-selection',
      context: measureVariant.label,
      candidates: candidatePool(
        reference,
        compatibleVariants.flatMap(({ measures }) => measures.map(asCandidate)),
        random
      ),
      referenceIds: reference.map(({ id }) => id),
    });
  }

  return {
    id: `${script.id}:${seed}`,
    seed,
    scriptId: script.id,
    scriptLabel: script.label,
    questions,
  };
};

export const compareLearningAnswer = (
  question: LearningQuestion,
  answerIds: readonly ID[]
): LearningComparison => {
  const answer = [...new Set(answerIds)];
  const reference = [...new Set(question.referenceIds)];
  const referenceSet = new Set(reference);
  const answerSet = new Set(answer);
  const comparison: LearningComparison = {
    matchesReference: question.kind === 'scene-order'
      ? answer.length === reference.length && answer.every((id, index) => id === reference[index])
      : answer.length === reference.length && reference.every((id) => answerSet.has(id)),
    matchedIds: answer.filter((id) => referenceSet.has(id)),
    missingIds: reference.filter((id) => !answerSet.has(id)),
    additionalIds: answer.filter((id) => !referenceSet.has(id)),
  };

  if (question.kind === 'scene-order') {
    const positions = new Map(answer.map((id, index) => [id, index]));
    let matchingOrderPairs = 0;
    for (let left = 0; left < reference.length; left += 1) {
      for (let right = left + 1; right < reference.length; right += 1) {
        const leftPosition = positions.get(reference[left]);
        const rightPosition = positions.get(reference[right]);
        if (
          typeof leftPosition === 'number' &&
          typeof rightPosition === 'number' &&
          leftPosition < rightPosition
        ) {
          matchingOrderPairs += 1;
        }
      }
    }
    comparison.matchingOrderPairs = matchingOrderPairs;
    comparison.referenceOrderPairs = reference.length * (reference.length - 1) / 2;
  }

  return comparison;
};

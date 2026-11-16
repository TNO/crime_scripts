export const CRIME_PREVENTION_STRATEGIES = [
  {
    id: '1', labelKey: 'INCREASE_EFFORT', icon: 'fitness_center',
    sub: [
      { id: '1_1', labelKey: 'TARGET_HARDEN' },
      { id: '1_2', labelKey: 'CONTROL_ACCESS' },
      { id: '1_3', labelKey: 'SCREEN_EXITS' },
      { id: '1_4', labelKey: 'DEFLECT_OFFENDERS' },
      { id: '1_5', labelKey: 'CONTROL_TOOLS' },
    ],
  },
  {
    id: '2', labelKey: 'INCREASE_RISKS', icon: 'warning',
    sub: [
      { id: '2_1', labelKey: 'EXTEND_GUARDIANSHIP' },
      { id: '2_2', labelKey: 'ASSIST_SURVEILLANCE' },
      { id: '2_3', labelKey: 'REDUCE_ANONYMITY' },
      { id: '2_4', labelKey: 'USE_PLACE_MANAGERS' },
      { id: '2_5', labelKey: 'STRENGTHEN_SURVEILLANCE' },
    ],
  },
  {
    id: '3', labelKey: 'REDUCE_REWARDS', icon: 'do_not_disturb',
    sub: [
      { id: '3_1', labelKey: 'CONCEAL_TARGETS' },
      { id: '3_2', labelKey: 'REMOVE_TARGETS' },
      { id: '3_3', labelKey: 'IDENTIFY_PROPERTY' },
      { id: '3_4', labelKey: 'DISRUPT_MARKETS' },
      { id: '3_5', labelKey: 'DENY_BENEFITS' },
    ],
  },
  {
    id: '4', labelKey: 'REDUCE_PROVOCATIONS', icon: 'peace',
    sub: [
      { id: '4_1', labelKey: 'REDUCE_FRUSTRATIONS' },
      { id: '4_2', labelKey: 'AVOID_DISPUTES' },
      { id: '4_3', labelKey: 'REDUCE_TEMPTATION' },
      { id: '4_4', labelKey: 'NEUTRALIZE_PRESSURE' },
      { id: '4_5', labelKey: 'DISCOURAGE_IMITATION' },
    ],
  },
  {
    id: '5', labelKey: 'REMOVE_EXCUSES', icon: 'delete',
    sub: [
      { id: '5_1', labelKey: 'SET_RULES' },
      { id: '5_2', labelKey: 'POST_INSTRUCTIONS' },
      { id: '5_3', labelKey: 'ALERT_CONSCIENCE' },
      { id: '5_4', labelKey: 'ASSIST_COMPLIANCE' },
      { id: '5_5', labelKey: 'CONTROL_DRUGS' },
    ],
  },
] as const;

export const MEASURE_CATEGORIES = [
  { id: '0_0', labelKey: 'MISC', groupKey: 'MISC' },
  ...CRIME_PREVENTION_STRATEGIES.flatMap(({ labelKey: groupKey, sub }) =>
    sub.map(({ id, labelKey }) => ({ id, labelKey, groupKey }))
  ),
] as const;

export type MeasureCategoryId = typeof MEASURE_CATEGORIES[number]['id'];

export const isMeasureCategoryId = (value: unknown): value is MeasureCategoryId =>
  MEASURE_CATEGORIES.some(({ id }) => id === value);

import { CRIME_PREVENTION_STRATEGIES, MEASURE_CATEGORIES } from '@crime-script/core/measure-categories';
import { t } from '../services';

export const crimePreventionStrategies = () =>
  CRIME_PREVENTION_STRATEGIES.map(({ id, labelKey, icon, sub }) => ({
    id,
    label: t(labelKey),
    icon,
    sub: sub.map(({ id, labelKey }) => ({
      id,
      label: t(labelKey, 'TITLE'),
      desc: t(labelKey, 'DESC'),
    })),
  }));

export const crimeMeasureOptions = (useGroupInLabel = false) => {
  const createLabel = (label: string, group: string) => (useGroupInLabel ? `${group} > ${label}` : label);
  return MEASURE_CATEGORIES.map(({ id, labelKey, groupKey }) => {
    const group = t(groupKey);
    const miscellaneous = labelKey === 'MISC';
    const label = miscellaneous ? group : t(labelKey, 'TITLE');
    return {
      id,
      label: createLabel(label, group),
      group,
      ...(miscellaneous ? { icon: 'more_horiz' } : {}),
    };
  });
};

export const lookupCrimeMeasure = () => {
  const cmo = crimeMeasureOptions(true).reduce((acc, cur) => {
    acc.set(cur.id, cur);
    return acc;
  }, new Map<string, { id: string; icon?: string; label: string; group: string }>());

  return (id: string) => cmo.get(id);
};

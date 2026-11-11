import React from 'react';
import type { RankingCriterion, RankingCriterionInput } from '@/types';

/**
 * Ordered ranking criteria builder.
 *
 * The client did not ask for weights, they asked for a priority order:
 *   "So let's say I want to consider the cost. In addition to the cost, I want
 *    to consider the date range also... So they can actually rank one, two,
 *    three, 4."
 *
 * So this control is about SEQUENCE, not sliders. Criterion #1 dominates the
 * ranking; the ones below it only break ties.
 */

export const CRITERION_META: Record<
  RankingCriterion,
  { label: string; hint: string; direction: string }
> = {
  COST: {
    label: 'Total Cost',
    hint: 'Material cost + operational cost, from material master and recipe operations',
    direction: 'Lower is better',
  },
  REWORK_CYCLES: {
    label: 'Reprocess Cycles',
    hint: 'Average rework orders chained to the runs that used this path',
    direction: 'Lower is better',
  },
  RECENCY: {
    label: 'Recency',
    hint: 'How recently this exact combination was last produced',
    direction: 'More recent is better',
  },
  PRODUCTION_LINE: {
    label: 'Production Line Match',
    hint: 'Prefers paths historically run on the line you selected',
    direction: 'Match is better',
  },
  SEASON: {
    label: 'Season Match',
    hint: 'Prefers paths run in the same season as the order start date',
    direction: 'Match is better',
  },
  EFFICIENCY: {
    label: 'Operation Hours',
    hint: 'Total setup + run + teardown hours across the recipe',
    direction: 'Lower is better',
  },
};

const ALL_CRITERIA = Object.keys(CRITERION_META) as RankingCriterion[];

interface Props {
  value: RankingCriterionInput[];
  onChange: (next: RankingCriterionInput[]) => void;
}

export const RankingCriteriaBuilder: React.FC<Props> = ({ value, onChange }) => {
  const selected = [...value].sort((a, b) => a.priority - b.priority);
  const selectedKeys = selected.map((c) => c.criterion);
  const available = ALL_CRITERIA.filter((c) => !selectedKeys.includes(c));

  // Priorities are always renumbered 1..n so the API never receives gaps or
  // duplicate priorities after a move/remove.
  const renumber = (criteria: RankingCriterion[]): RankingCriterionInput[] =>
    criteria.map((criterion, index) => ({ criterion, priority: index + 1 }));

  const move = (index: number, delta: number) => {
    const next = [...selectedKeys];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(renumber(next));
  };

  const remove = (index: number) => {
    const next = selectedKeys.filter((_, i) => i !== index);
    onChange(renumber(next));
  };

  const add = (criterion: RankingCriterion) => {
    onChange(renumber([...selectedKeys, criterion]));
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Ranking Criteria — in priority order</label>
        <p className="text-xs text-gray-500">
          Criterion <strong>#1 dominates</strong> the ranking. The ones below it only break
          ties. Reorder them to change what the recommendation optimises for.
        </p>
      </div>

      {selected.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          No criteria selected. Add at least one below, otherwise candidates can only be
          ordered by how often they were used historically.
        </p>
      )}

      <ol className="space-y-2">
        {selected.map((item, index) => {
          const meta = CRITERION_META[item.criterion];
          return (
            <li
              key={item.criterion}
              className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg p-3"
            >
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                <p className="text-xs text-gray-500">{meta.hint}</p>
                <p className="text-xs text-gray-400 mt-0.5">{meta.direction}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${meta.label} up`}
                  className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-gray-50"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === selected.length - 1}
                  aria-label={`Move ${meta.label} down`}
                  className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-gray-50"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove ${meta.label}`}
                  className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50"
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      {available.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">Add a criterion</p>
          <div className="flex flex-wrap gap-2">
            {available.map((criterion) => (
              <button
                key={criterion}
                type="button"
                onClick={() => add(criterion)}
                title={CRITERION_META[criterion].hint}
                className="text-xs px-2.5 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-600 hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50"
              >
                + {CRITERION_META[criterion].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

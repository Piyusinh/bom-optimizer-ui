import React from 'react';
import type { BomCompareResponse } from '@/types';

/**
 * 'Proposed Recipe' comparison — RTM Production item 1:
 *   "Production/Planned static BOM vs proposed BOM comparison"
 *
 * Shows the current BOM the planner would otherwise run, the proposed one, and
 * a line-by-line diff with the cost impact of every change. Nothing is written
 * anywhere until the planner explicitly clicks Adopt.
 */

const CHANGE_STYLES: Record<string, string> = {
  ADDED: 'bg-green-100 text-green-700',
  REMOVED: 'bg-red-100 text-red-700',
  QUANTITY_CHANGED: 'bg-amber-100 text-amber-700',
  UNCHANGED: 'bg-gray-100 text-gray-500',
};

const money = (value: number, currency = 'USD') =>
  `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

interface Props {
  data: BomCompareResponse;
  onClose: () => void;
  onAdopt: () => void;
  adopting: boolean;
}

export const ProposedRecipeModal: React.FC<Props> = ({
  data,
  onClose,
  onAdopt,
  adopting,
}) => {
  const { baseline, proposed, diffs, total_cost_delta, total_cost_delta_percent } = data;
  const cheaper = total_cost_delta < 0;
  const changed = diffs.filter((d) => d.change_type !== 'UNCHANGED');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Static BOM vs Proposed Recipe
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Candidate #{proposed.rank} — production version{' '}
              {proposed.production_version || 'n/a'}, recipe {proposed.recipe_id || 'n/a'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close comparison"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Cost summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Current BOM</p>
              <p className="text-lg font-semibold text-gray-900">
                {money(baseline.cost.total_cost, baseline.cost.currency)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                mat {money(baseline.cost.material_cost, '')} + ops{' '}
                {money(baseline.cost.operational_cost, '')}
              </p>
            </div>
            <div className="bg-primary-50 rounded-lg p-3">
              <p className="text-xs text-primary-700">Proposed BOM</p>
              <p className="text-lg font-semibold text-primary-900">
                {money(proposed.cost.total_cost, proposed.cost.currency)}
              </p>
              <p className="text-xs text-primary-600 mt-0.5">
                mat {money(proposed.cost.material_cost, '')} + ops{' '}
                {money(proposed.cost.operational_cost, '')}
              </p>
            </div>
            <div
              className={`rounded-lg p-3 ${cheaper ? 'bg-green-50' : 'bg-red-50'}`}
            >
              <p className={`text-xs ${cheaper ? 'text-green-700' : 'text-red-700'}`}>
                Cost Impact
              </p>
              <p
                className={`text-lg font-semibold ${
                  cheaper ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {cheaper ? '−' : '+'}
                {money(Math.abs(total_cost_delta), '')}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  cheaper ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {Math.abs(total_cost_delta_percent).toFixed(1)}%{' '}
                {cheaper ? 'cheaper' : 'more expensive'}
              </p>
            </div>
          </div>

          {/* Cycles comparison — the RTM 'Avg cycles / Avg reprocess cycles' pair */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Current avg cycles', baseline.avg_cycles],
              ['Proposed avg cycles', proposed.avg_cycles],
              ['Current reprocess cycles', baseline.avg_reprocess_cycles],
              ['Proposed reprocess cycles', proposed.avg_reprocess_cycles],
            ].map(([label, val]) => (
              <div key={label as string} className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-base font-semibold text-gray-900">
                  {(val as number).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Component diff */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-800">Component Changes</h4>
              <span className="text-xs text-gray-500">
                {changed.length} changed of {diffs.length} lines
              </span>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Component</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Change</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Current Qty</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Proposed Qty</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Unit</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Cost Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {diffs.map((d) => (
                    <tr
                      key={d.component}
                      className={d.change_type === 'UNCHANGED' ? 'text-gray-400' : ''}
                    >
                      <td className="px-3 py-2 font-medium">{d.component}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            CHANGE_STYLES[d.change_type]
                          }`}
                        >
                          {d.change_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {d.baseline_quantity?.toLocaleString() ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {d.proposed_quantity?.toLocaleString() ?? '—'}
                      </td>
                      <td className="px-3 py-2">{d.unit}</td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${
                          d.cost_impact < 0
                            ? 'text-green-700'
                            : d.cost_impact > 0
                              ? 'text-red-700'
                              : ''
                        }`}
                      >
                        {d.cost_impact === 0
                          ? '—'
                          : `${d.cost_impact > 0 ? '+' : '−'}${Math.abs(
                              d.cost_impact,
                            ).toLocaleString()}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operations */}
          {proposed.operations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">
                Proposed Recipe Operations
              </h4>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Op</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Work Center</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Setup h</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Run h</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Rate/h</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Op Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {proposed.operations.map((op) => (
                      <tr key={op.operation_number}>
                        <td className="px-3 py-2">{op.operation_number}</td>
                        <td className="px-3 py-2">{op.description || '—'}</td>
                        <td className="px-3 py-2">{op.work_center || '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {op.setup_time_hours}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {op.run_time_hours}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {op.cost_per_hour}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {op.operation_cost.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {proposed.violations.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-medium text-red-800 mb-1">Constraint violations</p>
              {proposed.violations.map((v, i) => (
                <p key={i} className="text-xs text-red-700">
                  ⚠ {v}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">
            Adopt records the decision in the audit log. SAP write-back is a Phase 2
            capability — nothing is pushed to the ERP from here.
          </p>
          <div className="flex flex-shrink-0 gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">
              Cancel
            </button>
            <button
              onClick={onAdopt}
              disabled={adopting || !proposed.feasible}
              title={
                proposed.feasible
                  ? 'Record the decision to adopt this recipe'
                  : 'Cannot adopt a candidate that fails hard constraints'
              }
              className="btn-primary text-sm disabled:opacity-50"
            >
              {adopting ? 'Adopting...' : 'Adopt this Recipe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { RankingCriteriaBuilder } from '@/components/production/RankingCriteriaBuilder';
import { ProposedRecipeModal } from '@/components/production/ProposedRecipeModal';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useApiMutation } from '@/hooks/useApiMutation';
import {
  adoptCandidate,
  analyzeProduction,
  compareBom,
  fetchMaterials,
  fetchPlannedOrders,
  fetchProcessOrders,
  fetchProductionLines,
} from '@/services/api';
import type {
  AdoptResponse,
  AnchorType,
  BomCompareResponse,
  MaterialSummary,
  OrderOption,
  ProductionAnalyzeRequest,
  ProductionAnalyzeResponse,
  ProductionCandidate,
  ProductionLineOption,
  RankingCriterionInput,
} from '@/types';

/**
 * Production Persona — Phase 1.
 *
 * Implements the RTM 'Production' selection sheet and 'Prod Output Persona'
 * output layout:
 *
 *   Plant (mandatory) + exactly ONE anchor (material / planned order /
 *   process order), optionally narrowed by production line and date range,
 *   ranked by criteria the planner puts in priority order.
 *
 * Every number shown here is computed deterministically by the Decision Core.
 * No AI is involved in the ranking — the same inputs always give the same
 * output, which is what makes it auditable.
 */

const ANCHOR_OPTIONS: { type: AnchorType; label: string; hint: string }[] = [
  {
    type: 'MATERIAL',
    label: 'Material',
    hint: 'Analyse every historical way this finished material has been produced',
  },
  {
    type: 'PLANNED_ORDER',
    label: 'Planned Order',
    hint: 'Simulate against an unfirmed planned order, including stock availability',
  },
  {
    type: 'PROCESS_ORDER',
    label: 'Process Order',
    hint: 'Optimise a specific order before it is released to the shop floor',
  },
];

const money = (value: number, currency = 'USD') =>
  `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const DEFAULT_CRITERIA: RankingCriterionInput[] = [
  { criterion: 'COST', priority: 1 },
  { criterion: 'REWORK_CYCLES', priority: 2 },
  { criterion: 'RECENCY', priority: 3 },
];

export const ProductionPersona: React.FC = () => {
  const [plant, setPlant] = useState('');
  const [anchorType, setAnchorType] = useState<AnchorType>('MATERIAL');
  const [anchorValue, setAnchorValue] = useState('');
  const [productionLine, setProductionLine] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [criteria, setCriteria] = useState<RankingCriterionInput[]>(DEFAULT_CRITERIA);

  const [result, setResult] = useState<ProductionAnalyzeResponse | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [comparison, setComparison] = useState<BomCompareResponse | null>(null);
  const [adoptMessage, setAdoptMessage] = useState<string | null>(null);

  // ── Pickers ────────────────────────────────────────────────────────────────

  const { data: materials } = useApiQuery<MaterialSummary[]>(() => fetchMaterials(), []);

  // Plant list is derived from the materials we actually have data for, so the
  // planner cannot select a plant that would return nothing.
  const plants = useMemo(
    () => Array.from(new Set((materials || []).map((m) => m.plant))).sort(),
    [materials],
  );

  const plantMaterials = useMemo(
    () => (materials || []).filter((m) => !plant || m.plant === plant),
    [materials, plant],
  );

  const { data: lines } = useApiQuery<ProductionLineOption[]>(
    () => (plant ? fetchProductionLines(plant) : Promise.resolve([])),
    [plant],
  );

  const { data: orders } = useApiQuery<OrderOption[]>(
    () => {
      if (!plant || anchorType === 'MATERIAL') return Promise.resolve([]);
      return anchorType === 'PLANNED_ORDER'
        ? fetchPlannedOrders(plant)
        : fetchProcessOrders(plant);
    },
    [plant, anchorType],
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const { mutate: runAnalysis, loading: analyzing, error: analyzeError } =
    useApiMutation<ProductionAnalyzeRequest, ProductionAnalyzeResponse>(
      (req) => analyzeProduction(req),
      {
        onSuccess: (res) => {
          setResult(res);
          setExpanded(res.candidates[0]?.id ?? null);
          setAdoptMessage(null);
        },
      },
    );

  const { mutate: runCompare, loading: comparing } = useApiMutation<
    { decisionId: string; candidateId: string },
    BomCompareResponse
  >(({ decisionId, candidateId }) => compareBom(decisionId, candidateId), {
    onSuccess: (res) => setComparison(res),
  });

  const { mutate: runAdopt, loading: adopting } = useApiMutation<
    { decision_id: string; candidate_id: string },
    AdoptResponse
  >((payload) => adoptCandidate(payload), {
    onSuccess: (res) => {
      setAdoptMessage(res.message);
      setComparison(null);
    },
  });

  const canSubmit = Boolean(plant && anchorValue && !analyzing);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    runAnalysis({
      plant,
      anchor: { type: anchorType, value: anchorValue },
      production_line: productionLine || null,
      date_range: dateFrom || dateTo ? { from: dateFrom || null, to: dateTo || null } : null,
      quantity: quantity === '' ? null : Number(quantity),
      ranking_criteria: criteria,
      constraints: {
        must_use_registered_components: false,
        avoid_components: [],
      },
    });
  };

  return (
    <PageLayout pageName="Production Persona">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Production Persona</h2>
          <p className="text-sm text-gray-500 mt-1">
            Find the best way to produce a material, based on what actually happened on the
            shop floor. The system reads every historical run, merges identical component
            combinations, costs each one from material master and recipe operations, then
            ranks them by the criteria you put in priority order.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          {/* Step 1 — plant + anchor */}
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Step 1 — Scope
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Plant is mandatory. Then pick <strong>exactly one</strong> anchor — a material,
              a planned order, or a process order.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">
                Plant <span className="text-red-500">*</span>
              </label>
              <select
                className="input-field"
                value={plant}
                onChange={(e) => {
                  setPlant(e.target.value);
                  setAnchorValue('');
                  setProductionLine('');
                }}
              >
                <option value="">Select plant...</option>
                {plants.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Costs, stock and recipes are all plant-specific.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="label">Anchor</label>
              <div className="grid grid-cols-3 gap-2">
                {ANCHOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    title={opt.hint}
                    onClick={() => {
                      setAnchorType(opt.type);
                      setAnchorValue('');
                    }}
                    className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                      anchorType === opt.type
                        ? 'border-primary-500 bg-primary-50 text-primary-800 font-medium'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {ANCHOR_OPTIONS.find((o) => o.type === anchorType)?.hint}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">
                {anchorType === 'MATERIAL'
                  ? 'Material'
                  : anchorType === 'PLANNED_ORDER'
                    ? 'Planned Order'
                    : 'Process Order'}{' '}
                <span className="text-red-500">*</span>
              </label>
              {anchorType === 'MATERIAL' ? (
                <select
                  className="input-field"
                  value={anchorValue}
                  disabled={!plant}
                  onChange={(e) => setAnchorValue(e.target.value)}
                >
                  <option value="">
                    {plant ? 'Select material...' : 'Select a plant first'}
                  </option>
                  {plantMaterials.map((m) => (
                    <option key={`${m.material}-${m.plant}`} value={m.material}>
                      {m.material} — {m.bom_count} historical runs
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="input-field"
                  value={anchorValue}
                  disabled={!plant}
                  onChange={(e) => setAnchorValue(e.target.value)}
                >
                  <option value="">
                    {plant ? 'Select order...' : 'Select a plant first'}
                  </option>
                  {(orders || []).map((o) => (
                    <option key={o.order_id} value={o.order_id}>
                      {o.order_id} — {o.material} ({o.quantity.toLocaleString()})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {anchorType === 'MATERIAL'
                  ? 'More historical runs give a richer comparison.'
                  : 'The order supplies the material, quantity and production start date.'}
              </p>
            </div>

            <div>
              <label className="label">Production Line (optional)</label>
              <select
                className="input-field"
                value={productionLine}
                disabled={!plant}
                onChange={(e) => setProductionLine(e.target.value)}
              >
                <option value="">All lines</option>
                {(lines || []).map((l) => (
                  <option key={l.work_center} value={l.work_center}>
                    {l.work_center}
                    {l.run_count > 0 ? ` — ${l.run_count} runs` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Restricts the analysis to runs on one machine or line.
              </p>
            </div>

            <div>
              <label className="label">Quantity (optional)</label>
              <input
                type="number"
                className="input-field"
                value={quantity}
                placeholder="Defaults to the order quantity"
                onChange={(e) =>
                  setQuantity(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
              <p className="text-xs text-gray-400 mt-1">
                Component quantities and run-time costs are scaled to this batch size.
              </p>
            </div>
          </div>

          {/* Step 2 — date window */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Step 2 — History Window
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Defaults to the last 24 months. A formulation from ten years ago is rarely
              relevant, so old runs are excluded unless you widen this.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="label">From</label>
                <input
                  type="date"
                  className="input-field"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="label">To</label>
                <input
                  type="date"
                  className="input-field"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Step 3 — ranking criteria */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Step 3 — Ranking Priority
            </p>
            <RankingCriteriaBuilder value={criteria} onChange={setCriteria} />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <button type="submit" disabled={!canSubmit} className="btn-primary">
              {analyzing ? 'Analyzing...' : 'Rank Production Paths'}
            </button>
            {!plant && (
              <p className="text-xs text-amber-600 mt-2">Select a plant to continue.</p>
            )}
            {plant && !anchorValue && (
              <p className="text-xs text-amber-600 mt-2">
                Select a {anchorType.toLowerCase().replace('_', ' ')} to continue.
              </p>
            )}
            {analyzeError && (
              <p className="text-xs text-red-600 mt-2">{analyzeError}</p>
            )}
          </div>
        </form>

        {analyzing && <LoadingSpinner />}

        {adoptMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-800">Adoption recorded</p>
            <p className="text-xs text-green-700 mt-0.5">{adoptMessage}</p>
          </div>
        )}

        {result && !analyzing && (
          <ResultsPanel
            result={result}
            expanded={expanded}
            onToggle={(id) => setExpanded(expanded === id ? null : id)}
            onCompare={(candidateId) =>
              runCompare({ decisionId: result.request_id, candidateId })
            }
            comparing={comparing}
          />
        )}

        {comparison && (
          <ProposedRecipeModal
            data={comparison}
            adopting={adopting}
            onClose={() => setComparison(null)}
            onAdopt={() =>
              runAdopt({
                decision_id: comparison.decision_id,
                candidate_id: comparison.candidate_id,
              })
            }
          />
        )}
      </div>
    </PageLayout>
  );
};

// ─── Results ──────────────────────────────────────────────────────────────────

interface ResultsPanelProps {
  result: ProductionAnalyzeResponse;
  expanded: string | null;
  onToggle: (id: string) => void;
  onCompare: (candidateId: string) => void;
  comparing: boolean;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({
  result,
  expanded,
  onToggle,
  onCompare,
  comparing,
}) => {
  if (result.candidates_count === 0) {
    return (
      <div className="card">
        <p className="text-sm font-medium text-gray-800">No production paths found</p>
        <p className="text-xs text-gray-500 mt-1">
          No historical runs matched this material, plant, line and date window. Try
          widening the date range or clearing the production line filter. If the database
          is empty, generate demo data and then master data from the Data Management page.
        </p>
      </div>
    );
  }

  const baseline = result.baseline;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-900">
          {result.candidates_count} distinct production path
          {result.candidates_count !== 1 ? 's' : ''} ranked
        </h3>
        <span className="text-xs text-gray-400">
          {result.material} @ {result.plant} · qty {result.quantity.toLocaleString()} ·
          trace {result.trace_id.slice(0, 8)}
        </span>
      </div>

      <p className="text-xs text-gray-500">
        Ranked by{' '}
        {result.ranking_criteria
          .slice()
          .sort((a, b) => a.priority - b.priority)
          .map((c, i) => `${i + 1}. ${c.criterion.replace('_', ' ').toLowerCase()}`)
          .join(', ')}
        . Everything is measured against the <strong>current BOM</strong> — the combination
        used most often historically.
      </p>

      {baseline && (
        <div className="card bg-gray-50 border-gray-200">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Current BOM (baseline)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
            <Metric label="Total cost" value={money(baseline.cost.total_cost, baseline.cost.currency)} />
            <Metric label="Material cost" value={money(baseline.cost.material_cost, '')} />
            <Metric label="Operational cost" value={money(baseline.cost.operational_cost, '')} />
            <Metric label="Avg cycles" value={baseline.avg_cycles.toFixed(2)} />
            <Metric
              label="Avg reprocess cycles"
              value={baseline.avg_reprocess_cycles.toFixed(2)}
            />
          </div>
        </div>
      )}

      {result.candidates.map((cand) => (
        <CandidateCard
          key={cand.id}
          candidate={cand}
          isExpanded={expanded === cand.id}
          onToggle={() => onToggle(cand.id)}
          onCompare={() => onCompare(cand.id)}
          comparing={comparing}
        />
      ))}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-semibold text-gray-900 tabular-nums">{value}</p>
  </div>
);

interface CandidateCardProps {
  candidate: ProductionCandidate;
  isExpanded: boolean;
  onToggle: () => void;
  onCompare: () => void;
  comparing: boolean;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate: c,
  isExpanded,
  onToggle,
  onCompare,
  comparing,
}) => {
  const savings = c.cost_reduction_percent;

  return (
    <div
      className={`card border-l-4 ${
        c.rank === 1
          ? 'border-l-green-500'
          : c.feasible
            ? 'border-l-blue-400'
            : 'border-l-red-400'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-gray-900">#{c.rank}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                c.feasible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {c.feasible ? 'Feasible' : 'Infeasible'}
            </span>
            {c.production_version && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                {c.production_version}
              </span>
            )}
            {c.production_line && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {c.production_line}
              </span>
            )}
            {c.season && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {c.season}
              </span>
            )}
            {c.legal_approval_required && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                Legal approval required
              </span>
            )}
          </div>

          <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{c.rank_reason}</p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold text-primary-700 tabular-nums">
            {money(c.cost.total_cost, c.cost.currency)}
          </p>
          <p className="text-xs text-gray-400">
            mat {c.cost.material_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
            + ops{' '}
            {c.cost.operational_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          {savings !== null && savings !== 0 && (
            <p
              className={`text-xs font-medium mt-0.5 ${
                savings > 0 ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {savings > 0 ? '↓' : '↑'} {Math.abs(savings).toFixed(1)}% vs current
            </p>
          )}
        </div>
      </div>

      {/* Headline metrics from the RTM Prod Output Persona layout */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
        <Tile label="Avg cycles" value={c.avg_cycles.toFixed(2)} />
        <Tile label="Reprocess cycles" value={c.avg_reprocess_cycles.toFixed(2)} />
        <Tile label="Operation hours" value={c.total_operation_hours.toFixed(1)} />
        <Tile label="Historical runs" value={String(c.occurrence_count)} />
        <Tile
          label="Last used"
          value={c.last_used_date ? c.last_used_date.slice(0, 10) : '—'}
        />
      </div>

      {c.violations.length > 0 && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-2.5">
          {c.violations.slice(0, 4).map((v, i) => (
            <p key={i} className="text-xs text-red-700">
              ⚠ {v}
            </p>
          ))}
          {c.violations.length > 4 && (
            <p className="text-xs text-red-600 mt-0.5">
              +{c.violations.length - 4} more
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={onToggle} className="btn-secondary text-xs">
          {isExpanded ? 'Hide details' : `Show ${c.components.length} components`}
        </button>
        <button onClick={onCompare} disabled={comparing} className="btn-primary text-xs">
          {comparing ? 'Loading...' : 'Proposed Recipe'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Component</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Planned</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Actual</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Unit</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Scrap %</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Unit cost</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Ext. cost</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {c.components.map((comp) => {
                  const required =
                    comp.planned_quantity * (1 + comp.scrap_percent / 100);
                  const short =
                    comp.available_stock !== null && required > comp.available_stock;
                  return (
                    <tr key={comp.component} className={short ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2 font-medium">{comp.component}</td>
                      <td className="px-3 py-2 text-gray-500">
                        {comp.material_type || '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {comp.planned_quantity.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                        {comp.actual_quantity !== null
                          ? comp.actual_quantity.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })
                          : '—'}
                      </td>
                      <td className="px-3 py-2">{comp.unit}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {comp.scrap_percent || 0}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {comp.unit_cost.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {comp.extended_cost.toLocaleString()}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${
                          short ? 'text-red-700 font-medium' : 'text-gray-500'
                        }`}
                      >
                        {comp.available_stock !== null
                          ? comp.available_stock.toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">
            <strong>Planned</strong> comes from the historical BOM, scaled to your batch
            size. <strong>Actual</strong> is the average quantity really issued to those
            orders (movement type 261) — the gap between the two is the real dosing
            deviation. Rows highlighted red are short on stock.
          </p>

          {c.source_orders.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">
                Source orders ({c.source_orders.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {c.source_orders.slice(0, 12).map((o) => (
                  <span key={o} className="text-xs bg-gray-100 rounded px-2 py-1">
                    {o}
                  </span>
                ))}
                {c.source_orders.length > 12 && (
                  <span className="text-xs text-gray-400 px-2 py-1">
                    +{c.source_orders.length - 12} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Tile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="text-center bg-gray-50 rounded p-2">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-semibold text-gray-900 tabular-nums">{value}</p>
  </div>
);

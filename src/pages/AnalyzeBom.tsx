import React, { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useApiMutation } from '@/hooks/useApiMutation';
import { analyzeBom, explainDecision, fetchMaterials } from '@/services/api';
import type { AnalyzeBomRequest, AnalyzeBomResponse, ExplainResponse, Candidate, MaterialSummary } from '@/types';

export const AnalyzeBom: React.FC = () => {
  const [result, setResult] = useState<AnalyzeBomResponse | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);

  // Load available materials
  const { data: materials } = useApiQuery<MaterialSummary[]>(() => fetchMaterials(), []);

  // Form state
  const [form, setForm] = useState<AnalyzeBomRequest>({
    material: '',
    plant: '',
    quantity: 1000,
    due_date: '',
    constraints: {
      must_use_registered_components: true,
      avoid_components: [],
      max_components: undefined,
      min_quantity_per_component: undefined,
    },
    scoring_profile: {
      cost_weight: 0.5,
      lead_time_weight: 0.3,
      risk_weight: 0.1,
      historical_success_weight: 0.1,
    },
  });

  const { mutate: runAnalysis, loading: analyzing } = useApiMutation<AnalyzeBomRequest, AnalyzeBomResponse>(
    (req) => analyzeBom(req),
    { onSuccess: (res) => { setResult(res); setExplanation(null); } }
  );

  const { mutate: runExplain, loading: explaining } = useApiMutation<{ decision_id: string; candidate_id: string }, ExplainResponse>(
    (req) => explainDecision(req),
    { onSuccess: (res) => setExplanation(res.explanation) }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.material || !form.plant) return;
    runAnalysis(form);
  };

  const handleExplain = (candidateId: string) => {
    if (!result) return;
    setSelectedCandidate(candidateId);
    runExplain({ decision_id: result.request_id, candidate_id: candidateId });
  };

  return (
    <PageLayout pageName="Analyze BOM">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analyze BOM</h2>
          <p className="text-sm text-gray-500 mt-1">
            For a finished material, find every distinct component combination used historically
            to produce it (across production, planned, and sales orders), then rank them by cost,
            lead time, risk, and how often each combination was actually used.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <p className="text-xs text-gray-500 -mt-1">
            Step 1 — tell the system which material, at which plant, and how much you need to produce.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">Material</label>
              <select
                className="input-field"
                value={form.material}
                onChange={(e) => {
                  const mat = materials?.find(m => m.material === e.target.value);
                  setForm({ ...form, material: e.target.value, plant: mat?.plant || form.plant });
                }}
              >
                <option value="">Select material...</option>
                {materials?.map((m) => (
                  <option key={`${m.material}-${m.plant}`} value={m.material}>
                    {m.material} ({m.plant}) — {m.bom_count} BOMs
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                The finished good you want to produce. "BOMs" = how many historical order records
                exist for it — higher counts give more interesting ranking results.
              </p>
            </div>
            <div>
              <label className="label">Plant</label>
              <input
                type="text"
                className="input-field"
                value={form.plant}
                onChange={(e) => setForm({ ...form, plant: e.target.value })}
                placeholder="e.g. 1000"
              />
              <p className="text-xs text-gray-400 mt-1">Auto-filled from the material you pick above.</p>
            </div>
            <div>
              <label className="label">Quantity (KG)</label>
              <input
                type="number"
                className="input-field"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              />
              <p className="text-xs text-gray-400 mt-1">
                Informational context for this request — Phase 0 ranks by historical combinations
                and does not yet re-scale component quantities to this exact amount.
              </p>
            </div>
            <div>
              <label className="label">Due Date (optional)</label>
              <input
                type="date"
                className="input-field"
                value={form.due_date || ''}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">Not yet used in scoring — reserved for capacity/lead-time checks in a later phase.</p>
            </div>
          </div>

          {/* Scoring Profile */}
          <details className="bg-gray-50 rounded-lg p-4">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer">
              Scoring Weights (Advanced) — change how candidates are ranked
            </summary>
            <p className="text-xs text-gray-500 mt-2">
              Each candidate gets a 0–1 score on 4 criteria; the total score is a weighted sum of
              these 4 numbers (weights should sum to ~1.0). Increasing a weight makes that criterion
              matter more in the final ranking. This is deterministic — same weights + same data
              always produce the same ranking, every time.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              {(['cost_weight', 'lead_time_weight', 'risk_weight', 'historical_success_weight'] as const).map((key) => (
                <div key={key}>
                  <label className="label">{key.replace(/_/g, ' ').replace('weight', '').trim()}</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    className="input-field"
                    value={form.scoring_profile[key]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        scoring_profile: { ...form.scoring_profile, [key]: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </details>

          <div>
            <button type="submit" disabled={analyzing || !form.material} className="btn-primary">
              {analyzing ? 'Analyzing...' : 'Run Analysis'}
            </button>
            <p className="text-xs text-gray-400 mt-2">
              Clicking this calls <code className="bg-gray-100 px-1 rounded">POST /api/analyze-bom</code>,
              which runs the full decision pipeline (explode historical BOMs → deduplicate identical
              combinations → apply hard constraints → score → rank) and saves the result as a
              permanent audit record, visible later on the Decisions page.
            </p>
          </div>
        </form>

        {/* Results */}
        {analyzing && <LoadingSpinner />}

        {result && !analyzing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Results — {result.candidates_count} candidates ranked
              </h3>
              <span className="text-xs text-gray-400">Trace: {result.trace_id.slice(0, 8)}</span>
            </div>
            <p className="text-xs text-gray-500">
              Each card below is one distinct historical component combination for this material,
              ranked #1 (best) downward. <strong>Green border</strong> = top recommendation.
              <strong> Feasible/Infeasible</strong> = whether it passes the hard constraints you
              configured (registered components, avoid-list, etc). This whole result was just saved
              as a permanent record — find it later on the <strong>Decisions</strong> page using the
              trace ID shown on the right.
            </p>

            {result.candidates.map((cand: Candidate) => (
              <div
                key={cand.id}
                className={`card border-l-4 ${
                  cand.rank === 1 ? 'border-l-green-500' : cand.feasible ? 'border-l-blue-400' : 'border-l-red-400'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">#{cand.rank}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        cand.feasible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {cand.feasible ? 'Feasible' : 'Infeasible'}
                      </span>
                      <span className="text-xs text-gray-500">{cand.source_type}</span>
                    </div>
                    {cand.source_order && (
                      <p className="text-xs text-gray-400 mt-1">
                        Source: {cand.source_order}
                        {cand.source_orders.length > 1 && ` (+${cand.source_orders.length - 1} more)`}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Used in <span className="font-semibold">{cand.occurrence_count}</span> historical run{cand.occurrence_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-700">{(cand.total_score * 100).toFixed(1)}%</p>
                    <p className="text-xs text-gray-400">Total Score</p>
                  </div>
                </div>

                {/* Scores */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {Object.entries(cand.scores).filter(([k]) => k !== 'total').map(([key, val]) => (
                    <div key={key} className="text-center bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-500">{key.replace('_', ' ')}</p>
                      <p className="text-sm font-semibold">{((val as number) * 100).toFixed(0)}%</p>
                    </div>
                  ))}
                </div>

                {/* Components */}
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Components ({cand.components.length})
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                    {cand.components.map((comp, i) => (
                      <span key={i} className="text-xs bg-gray-100 rounded px-2 py-1">
                        {comp.material}: {comp.quantity} {comp.unit}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Violations */}
                {cand.violations.length > 0 && (
                  <div className="mt-2 text-xs text-red-600">
                    {cand.violations.map((v, i) => <p key={i}>⚠ {v}</p>)}
                  </div>
                )}

                {/* Explain button — generates a written rationale for THIS specific
                    candidate: why it's ranked here, its score breakdown, and how many
                    historical runs used it. Calls POST /api/explain. Uses a rule-based
                    template by default; only calls an LLM if Azure OpenAI is configured,
                    and even then the LLM cannot change the numbers or add candidates —
                    it can only narrate the Decision Core's output. */}
                <button
                  onClick={() => handleExplain(cand.id)}
                  disabled={explaining && selectedCandidate === cand.id}
                  className="mt-3 btn-secondary text-xs"
                >
                  {explaining && selectedCandidate === cand.id ? 'Generating...' : 'Explain this recommendation'}
                </button>

                {/* Explanation */}
                {explanation && selectedCandidate === cand.id && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-blue-800 mb-2">
                      Written Rationale for Candidate #{cand.rank}
                    </p>
                    <div className="text-sm text-blue-900 whitespace-pre-wrap">{explanation}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

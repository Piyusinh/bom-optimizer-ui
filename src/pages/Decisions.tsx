import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Markdown } from '@/components/common/Markdown';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useUser } from '@/contexts/UserContext';
import { fetchDecisions, fetchDecision, explainDecision, decisionAction } from '@/services/api';
import type { DecisionSummary } from '@/types';

// Stored candidates come in two shapes: Analyze BOM (total_score / scores)
// and Production Persona (criterion_values / rank_reason / cost). All fields
// are optional here so the audit trail renders either shape.
interface StoredCandidate {
  id: string;
  rank?: number;
  total_score?: number;
  rank_reason?: string;
  feasible?: boolean;
  violations?: string[];
  occurrence_count?: number;
  source_type?: string;
  components?: unknown[];
  cost?: { total_cost?: number; currency?: string };
  criterion_values?: Record<string, number>;
  legal_approval_required?: boolean;
  [key: string]: unknown;
}

interface DecisionDetail {
  id: string;
  request_material: string;
  request_plant: string;
  request_quantity: number;
  request_due_date: string | null;
  status: string;
  recommended_candidate_id: string | null;
  candidates: StoredCandidate[];
  constraints: Record<string, unknown>;
  scoring_profile: Record<string, number>;
  trace: Record<string, unknown>;
  created_at: string;
}

function candidateScore(c: StoredCandidate): string {
  if (typeof c.total_score === 'number') return c.total_score.toFixed(3);
  if (c.cost?.total_cost != null) return `cost ${c.cost.total_cost.toFixed(2)} ${c.cost.currency ?? ''}`.trim();
  return '—';
}

export const Decisions: React.FC = () => {
  const { user } = useUser();
  const { data, loading, error, refetch } = useApiQuery<{ total: number; items: DecisionSummary[] }>(
    () => fetchDecisions(),
    []
  );
  const [selected, setSelected] = useState<DecisionDetail | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | 'override' | null>(null);
  const [reason, setReason] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Maker-checker: only admin/supply_chain can approve
  const canApprove = user?.role === 'admin' || user?.role === 'supply_chain' || user?.is_super_admin === true;

  const openDetail = async (decisionId: string) => {
    try {
      const detail = await fetchDecision(decisionId) as DecisionDetail;
      setSelected(detail);
      setExplanation(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load the decision');
    }
  };

  const handleExplain = async (candidateId?: string) => {
    if (!selected) return;
    setExplaining(true);
    try {
      const res = await explainDecision({ decision_id: selected.id, candidate_id: candidateId });
      setExplanation(res.explanation);
    } catch {
      // The axios interceptor already toasted the server message —
      // swallow here so the global unhandledrejection listener doesn't
      // show a second, generic toast on top of it.
    } finally {
      setExplaining(false);
    }
  };

  const handleDecisionAction = async () => {
    if (!selected || !action) return;
    if ((action === 'reject' || action === 'override') && !reason.trim()) {
      toast.error('Reason is required for reject/override');
      return;
    }
    if (action === 'override' && !selectedCandidate) {
      toast.error('Please select a candidate to override with');
      return;
    }

    setSubmitting(true);
    try {
      // Goes through the axios client — attaches the Bearer token and
      // surfaces server error messages via the response interceptor.
      await decisionAction(selected.id, {
        action,
        reason: reason || null,
        actor: user?.email,
        override_candidate_id: action === 'override' ? selectedCandidate : null,
      });

      toast.success(`Decision ${action}d successfully`);
      setAction(null);
      setReason('');
      setSelectedCandidate(null);
      
      // Refresh decision list and close detail
      await refetch();
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record action');
    } finally {
      setSubmitting(false);
    }
  };

  const recommended = selected?.candidates.find(
    (c) => c.id === selected.recommended_candidate_id
  );

  return (
    <PageLayout pageName="Decision History">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Decision History</h2>
          <p className="text-sm text-gray-500 mt-1">
            All computed BOM analyses with their status and recommendations. Click any row to see the full decision.
          </p>
        </div>

        {loading && <LoadingSpinner />}
        {error && <div className="card text-red-600 text-sm">{error}</div>}

        {data && data.items.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-gray-500">No decisions yet.</p>
            <p className="text-sm text-gray-400 mt-2">
              Go to <a href="/analyze" className="text-primary-600 underline">Analyze BOM</a> to create your first analysis.
            </p>
          </div>
        )}

        {data && data.items.length > 0 && (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Material</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Plant</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Qty</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Candidates</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => openDetail(d.id)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{d.material}</td>
                    <td className="px-4 py-3 text-gray-600">{d.plant}</td>
                    <td className="px-4 py-3 text-gray-600">{d.quantity}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {d.candidates_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        d.status === 'approved' ? 'bg-green-100 text-green-700' :
                        d.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {d.created_at ? new Date(d.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Decision {selected.id}
                </h3>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  selected.status === 'approved' ? 'bg-green-100 text-green-700' :
                  selected.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  selected.status === 'overridden' ? 'bg-amber-100 text-amber-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {selected.status}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p><span className="text-gray-500">Material:</span> {selected.request_material}</p>
              <p><span className="text-gray-500">Plant:</span> {selected.request_plant}</p>
              <p><span className="text-gray-500">Quantity:</span> {selected.request_quantity}</p>
              <p><span className="text-gray-500">Status:</span> {selected.status}</p>
            </div>

            {/* Action buttons — only if status is computed and user can approve */}
            {selected.status === 'computed' && canApprove && !action && (
              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={() => setAction('approve')}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium transition-colors"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => setAction('reject')}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium transition-colors"
                >
                  ✗ Reject
                </button>
                <button
                  onClick={() => setAction('override')}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm font-medium transition-colors"
                >
                  ⟳ Choose Different
                </button>
              </div>
            )}

            {/* Action form — appears when action is selected */}
            {action && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-3">
                <h4 className="font-medium text-blue-900">
                  {action === 'approve' && 'Approve this decision?'}
                  {action === 'reject' && 'Reject this decision'}
                  {action === 'override' && 'Choose a different candidate'}
                </h4>

                {/* Reason field (required for reject/override) */}
                {(action === 'reject' || action === 'override') && (
                  <textarea
                    placeholder="Reason for your decision (required)..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                )}

                {/* Candidate selector (required for override) */}
                {action === 'override' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select candidate to use instead:
                    </label>
                    <select
                      value={selectedCandidate || ''}
                      onChange={(e) => setSelectedCandidate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— Choose candidate —</option>
                      {selected.candidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          Rank {c.rank}: {c.id} ({candidateScore(c)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleDecisionAction}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    {submitting ? 'Recording...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => {
                      setAction(null);
                      setReason('');
                      setSelectedCandidate(null);
                    }}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Read-only message for non-approvers */}
            {selected.status === 'computed' && !canApprove && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                Only administrators and supply chain managers can approve decisions.
              </div>
            )}

            {recommended && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <h4 className="font-medium text-green-900">Recommended candidate</h4>
                <p className="text-sm text-green-800 mt-1">
                  {recommended.id} — {candidateScore(recommended)} from {recommended.source_type} ({recommended.occurrence_count} historical uses)
                </p>
                {recommended.rank_reason && (
                  <p className="text-xs text-green-700 mt-1">{recommended.rank_reason}</p>
                )}
                <button
                  onClick={() => handleExplain(recommended.id)}
                  disabled={explaining}
                  className="mt-2 text-xs px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50"
                >
                  {explaining ? 'Explaining…' : 'Explain recommendation'}
                </button>
              </div>
            )}

            {explanation && (
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <Markdown content={explanation} />
              </div>
            )}

            <h4 className="font-medium text-gray-900 pt-2">All candidates</h4>
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {selected.candidates.map((c) => (
                <li
                  key={c.id}
                  className="border rounded p-2 text-sm hover:bg-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      Rank {c.rank}: {c.id}
                    </span>
                    <span className="text-gray-600">{candidateScore(c)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {c.occurrence_count} historical uses · {c.components?.length ?? 0} components · {c.feasible === false ? 'infeasible' : 'feasible'}
                  </p>
                  <button
                    onClick={() => handleExplain(c.id)}
                    disabled={explaining}
                    className="mt-1 text-xs text-primary-600 hover:underline disabled:opacity-50"
                  >
                    Explain
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

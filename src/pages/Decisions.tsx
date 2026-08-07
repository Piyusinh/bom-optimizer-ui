import React, { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useApiQuery } from '@/hooks/useApiQuery';
import { fetchDecisions, fetchDecision, explainDecision } from '@/services/api';
import type { DecisionSummary, Candidate } from '@/types';

interface DecisionDetail {
  id: string;
  request_material: string;
  request_plant: string;
  request_quantity: number;
  request_due_date: string | null;
  status: string;
  recommended_candidate_id: string | null;
  candidates: Candidate[];
  constraints: Record<string, unknown>;
  scoring_profile: Record<string, number>;
  trace: Record<string, unknown>;
  created_at: string;
}

export const Decisions: React.FC = () => {
  const { data, loading, error } = useApiQuery<{ total: number; items: DecisionSummary[] }>(
    () => fetchDecisions(),
    []
  );
  const [selected, setSelected] = useState<DecisionDetail | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  const openDetail = async (decisionId: string) => {
    const detail = await fetchDecision(decisionId) as DecisionDetail;
    setSelected(detail);
    setExplanation(null);
  };

  const handleExplain = async (candidateId?: string) => {
    if (!selected) return;
    setExplaining(true);
    try {
      const res = await explainDecision({ decision_id: selected.id, candidate_id: candidateId });
      setExplanation(res.explanation);
    } finally {
      setExplaining(false);
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
              <h3 className="text-lg font-semibold text-gray-900">
                Decision {selected.id}
              </h3>
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

            {recommended && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <h4 className="font-medium text-green-900">Recommended candidate</h4>
                <p className="text-sm text-green-800 mt-1">
                  {recommended.id} — score {recommended.total_score.toFixed(3)} from {recommended.source_type} ({recommended.occurrence_count} historical uses)
                </p>
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
              <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-700">
                {explanation}
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
                    <span className="text-gray-600">Score {c.total_score.toFixed(3)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {c.occurrence_count} historical uses · {c.components.length} components · {c.feasible ? 'feasible' : 'infeasible'}
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

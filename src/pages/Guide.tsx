import React from 'react';
import { PageLayout } from '@/components/layout/PageLayout';

const Step: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
      {n}
    </div>
    <div className="flex-1 pb-6">
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <div className="text-sm text-gray-600 mt-1 space-y-2">{children}</div>
    </div>
  </div>
);

export const Guide: React.FC = () => {
  return (
    <PageLayout pageName="Demo Guide">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Phase 0 Demo Guide</h2>
          <p className="text-sm text-gray-500 mt-1">
            Step-by-step walkthrough for demoing the BOM Optimizer's Phase 0 capability:
            proving that finished materials are historically produced with multiple different
            component combinations, and that the platform can surface, rank, and explain them.
          </p>
        </div>

        <div className="card bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>What Phase 0 proves:</strong> for a given material + plant, the system
            finds every distinct historical component combination ever used to produce it,
            tells you how often each was used (<em>historical frequency</em>), scores/ranks
            them on cost, lead time, risk, and applies hard constraints — deterministically,
            with a stored audit trail (a <code>Decision</code> record) for every run.
          </p>
        </div>

        <div className="card bg-green-50 border-green-200">
          <h3 className="text-sm font-semibold text-green-900 mb-2">This is a production baseline, not a throwaway prototype</h3>
          <ul className="text-sm text-green-900 list-disc list-inside space-y-1">
            <li>The canonical BOM model, Decision Core, and REST API contracts are the same ones that will run against SAP later — only the data adapter changes.</li>
            <li>FastAPI + async SQLAlchemy + Pydantic + React/TypeScript is the production stack, not a mock stack.</li>
            <li>Every analysis is stored in an immutable <code>Decision</code> record — the foundation for audit, retraining, and compliance.</li>
            <li>Scoring is deterministic (no randomness) so the same input always produces the same ranked output.</li>
          </ul>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Walkthrough</h3>

          <Step n={1} title="Sign in">
            <p>Go to <code>/login</code>. Use one of the Phase 0 demo accounts (shown on the login page), e.g.:</p>
            <p><code>admin@bom.local</code> / <code>Admin@123</code> — full access to all pages.</p>
          </Step>

          <Step n={2} title="Data Management → Generate &amp; Ingest Demo Data">
            <p>
              Navigate to <strong>Data Management</strong>. Click <strong>"Generate &amp; Ingest Demo Data"</strong>.
              This works in every environment (local, Azure, shared URL) and creates 8 finished
              materials across 2 plants, each produced 10 times using 3 distinct component recipes.
            </p>
            <p>
              <em>Optional:</em> if you have the 4 mock SAP extracts deployed next to the API, use
              <strong>"Load Bundled Sample Files"</strong> instead. The same header+component parser
              is used in both cases.
            </p>
          </Step>

          <Step n={3} title="Dashboard → confirm data loaded">
            <p>
              Go to <strong>Dashboard</strong>. You should see non-zero counts for BOM Headers,
              BOM Items, Production/Planned/Sales Orders, and Order Chains.
            </p>
          </Step>

          <Step n={4} title="Analyze BOM → pick a material with multiple production runs">
            <p>
              Go to <strong>Analyze BOM</strong>. Pick a material from the dropdown (materials
              with a higher "BOM count" are better demo candidates — they have more historical
              variation to rank). Set a plant/quantity and click <strong>Run Analysis</strong>.
            </p>
          </Step>

          <Step n={5} title="Explain the ranked results">
            <p>Point out on screen, per candidate card:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Rank</strong> — feasible candidates first, sorted by weighted score.</li>
              <li><strong>"Used in N historical runs"</strong> — this is the core differentiator:
                identical component combinations from different historical orders are merged
                into one candidate with an occurrence count, not shown as noisy duplicates.</li>
              <li><strong>Score breakdown</strong> — cost / lead time / risk / historical success,
                each deterministic (same input always gives the same score — no randomness).</li>
              <li><strong>Feasible / Infeasible</strong> badge — hard constraints applied
                (unregistered components, avoid-list, max components, min quantity).</li>
            </ul>
            <p>Click <strong>"Explain this recommendation"</strong> on the top-ranked candidate —
            this generates a structured, rule-based rationale (or an LLM narration if Azure OpenAI
            keys are configured) that cites the historical usage frequency and score breakdown.</p>
          </Step>

          <Step n={6} title="Decisions → audit trail and detail">
            <p>
              Go to <strong>Decisions</strong>. Every analysis run is persisted here with its
              full ranked candidate list, status, and timestamp — this is the audit trail a
              compliance reviewer would want to see.
            </p>
            <p>
              Click any row to open the decision detail. It shows the recommended candidate,
              every other ranked candidate, and an <strong>Explain</strong> button that narrates
              the rationale for that specific candidate.
            </p>
          </Step>

          <Step n={7} title="(Optional) Try the advanced scoring weights">
            <p>
              Back on <strong>Analyze BOM</strong>, expand "Scoring Weights (Advanced)" and change
              the weight on cost vs. lead time vs. risk vs. historical success, then re-run. Show
              that the ranking changes deterministically based on the weights — this demonstrates
              the "versioned scoring profile" concept without needing a live SAP connection.
            </p>
          </Step>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">What's NOT in Phase 0 (be upfront about this)</h3>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>No live SAP connection — data comes from mock Excel extracts standing in for SAP CDS views.</li>
            <li>No LLM narration unless Azure OpenAI credentials are configured (falls back to rule-based explanation).</li>
            <li>No write-back to any ERP — recommendations are read-only / advisory.</li>
            <li>No forecasting, commodity price prediction, or seasonality modeling yet (Phase 2+).</li>
            <li>Legal/regulatory shipping constraints and per-customer component restrictions are
              not yet modeled as first-class constraints (roadmap item).</li>
          </ul>
        </div>

        <div className="card bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Quick reference — demo accounts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-gray-600">
            <span><strong>Admin:</strong> admin@bom.local / Admin@123</span>
            <span><strong>Planner:</strong> planner@bom.local / Planner@123</span>
            <span><strong>Procurement:</strong> procurement@bom.local / Procure@123</span>
            <span><strong>Sales:</strong> sales@bom.local / Sales@123</span>
            <span><strong>Supply Chain:</strong> supplychain@bom.local / Supply@123</span>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

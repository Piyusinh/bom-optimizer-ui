import React from 'react';
import { PageLayout } from '@/components/layout/PageLayout';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="card">
    <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
    <div className="text-sm text-gray-700 space-y-3">{children}</div>
  </div>
);

const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="text-left px-3 py-2 font-medium text-gray-600 bg-gray-50 border-b">{children}</th>
);
const Td: React.FC<{ children: React.ReactNode; mono?: boolean }> = ({ children, mono }) => (
  <td className={`px-3 py-2 border-b align-top ${mono ? 'font-mono text-xs' : ''}`}>{children}</td>
);

export const Architecture: React.FC = () => {
  return (
    <PageLayout pageName="Architecture &amp; Phase 0 Readme">
      <div className="space-y-6 max-w-5xl">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">How Phase 0 Was Built — Technical Readme</h2>
          <p className="text-sm text-gray-500 mt-1">
            What each page/API does, how it maps to the requirements, and why it's built this way.
            Written for a technical lead reviewing the implementation against the design.
          </p>
        </div>

        <div className="card bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Core problem statement</strong> (from the solution design doc): given a demand
            signal — material + plant + quantity + due date — determine which of the historically
            approved production paths is <em>feasible</em> and which is <em>optimal</em>, prove why,
            and let a human approve it. This is a <strong>constrained ranking problem over a small
            candidate set</strong>, not a search or generation problem — which is why the Decision
            Core is deterministic Python, and the LLM is only ever used to narrate the result, never
            to compute it.
          </p>
        </div>

        <Section title="1. Pages → what they do → what they call">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>Page</Th><Th>Purpose</Th><Th>Calls</Th></tr></thead>
              <tbody>
                <tr>
                  <Td mono>/login</Td>
                  <Td>Real JWT auth backed by the DB — 6 seeded users, role-based page access, token refresh/revocation, rate-limited login.</Td>
                  <Td mono>POST /api/auth/login<br/>POST /api/auth/refresh<br/>POST /api/auth/logout<br/>GET /api/auth/me</Td>
                </tr>
                <tr>
                  <Td mono>/ (Dashboard)</Td>
                  <Td>KPI counts proving data is actually loaded — headers, items, orders, decisions.</Td>
                  <Td mono>GET /api/data/stats</Td>
                </tr>
                <tr>
                  <Td mono>/data (Data Management)</Td>
                  <Td>Ingests mock SAP extracts into the canonical model. Three paths: local files, file upload, or synthetic generator (guaranteed-clean fallback).</Td>
                  <Td mono>POST /api/data/ingest-local<br/>POST /api/data/upload/{'{type}'}<br/>POST /api/data/generate-demo</Td>
                </tr>
                <tr>
                  <Td mono>/analyze (Analyze BOM)</Td>
                  <Td>The core decision loop. Explode → dedupe → constrain → score → rank → persist → explain.</Td>
                  <Td mono>GET /api/data/materials<br/>POST /api/analyze-bom<br/>POST /api/explain</Td>
                </tr>
                <tr>
                  <Td mono>/decisions</Td>
                  <Td>Audit trail — every analysis run is a persisted, append-only <code>Decision</code> row.</Td>
                  <Td mono>GET /api/decisions</Td>
                </tr>
                <tr>
                  <Td mono>/guide</Td>
                  <Td>Step-by-step demo script for stakeholder walkthroughs.</Td>
                  <Td>—</Td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="2. The Decision Core — how Analyze BOM actually works">
          <p>File: <code className="bg-gray-100 px-1 rounded">api/app/decision_core/engine.py</code></p>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong>Explosion</strong> (<code>explosion_engine.py</code>) — query every historical
              <code> CanonicalBomHeader</code> for the requested material+plant (across production,
              planned, and sales orders), then <strong>merge identical component combinations into
              one candidate</strong> with an <code>occurrence_count</code>. This is the single most
              important piece of logic in the platform — it's the mechanism that proves "this material
              has historically been made 3 different ways, here's how often each way was used."
            </li>
            <li>
              <strong>Constraints</strong> (<code>constraint_engine.py</code>) — hard rules: must use
              only registered components, avoid-list, max component count, min quantity per component.
              Infeasible candidates are kept (not discarded) with their violation reasons attached, so
              the UI can show "why this option doesn't qualify" instead of hiding it.
            </li>
            <li>
              <strong>Scoring</strong> (<code>scoring_engine.py</code>) — weighted sum of cost, lead
              time, risk, and historical-success heuristics. <strong>Fully deterministic</strong> — no
              randomness. Same input always produces the same score and the same rank, because a
              regulator or a planner needs to be able to reproduce a decision.
            </li>
            <li>
              <strong>Rank + persist</strong> — feasible candidates first, sorted by score descending;
              the full ranked list plus a trace (candidates found, feasible/infeasible counts) is saved
              as a <code>Decision</code> row. This row is what <code>/decisions</code> lists and what
              <code>/api/explain</code> reads from.
            </li>
            <li>
              <strong>Explain</strong> (<code>routes/explain.py</code>) — reads the completed
              <code> Decision</code> object and produces a structured rationale, citing the occurrence
              count and score breakdown. Rule-based by default; swaps to Azure OpenAI narration only if
              credentials are configured — the explanation can never introduce a candidate or number
              that wasn't already in the Decision object.
            </li>
          </ol>
        </Section>

        <Section title="3. Canonical data model — why it looks this way">
          <p>File: <code className="bg-gray-100 px-1 rounded">api/app/models.py</code></p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>Table</Th><Th>Why it exists</Th></tr></thead>
              <tbody>
                <tr>
                  <Td mono>canonical_bom_header / _item</Td>
                  <Td>One generic envelope for ALL BOM sources (master, sales order, planned order,
                    production order) — <code>object_type</code>/<code>object_id</code> distinguish them.
                    This is what makes the platform ERP-agnostic: the Decision Core never sees SAP field
                    names, only this canonical shape.</Td>
                </tr>
                <tr>
                  <Td mono>order_chain</Td>
                  <Td>Derived SO → PlannedOrder → ProductionOrder linkage, built from the linkage extract —
                    lets the UI trace a recommendation back to the real order chain it came from.</Td>
                </tr>
                <tr>
                  <Td mono>decision</Td>
                  <Td>Append-only audit record of every analysis run — request, ranked candidates,
                    recommended id, trace, approval state. Never updated, only superseded.</Td>
                </tr>
                <tr>
                  <Td mono>audit_log</Td>
                  <Td>Generic event log (data ingested, decision created, etc.) for compliance review.</Td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="4. Where the mock data actually comes from">
          <p>
            The ingestion connectors (<code className="bg-gray-100 px-1 rounded">api/app/connectors/excel_connector.py</code>)
            read the client-supplied mock SAP extracts, which each ship as <strong>two sheets per
            workbook</strong> — a header sheet (order metadata) and a component sheet (the actual BOM
            items). Both are read and joined on the order ID; this was the single biggest ingestion bug
            found during Phase 0 hardening — reading only the header sheet silently produced BOM
            headers with zero components, which made Analyze BOM always return 0 candidates.
          </p>
          <p>
            A second connector (<code className="bg-gray-100 px-1 rounded">demo_data_generator.py</code>)
            produces a small, deterministic synthetic dataset in the identical shape, so a live demo
            is never at the mercy of real file data-quality issues — every synthetic material is
            produced 10 times per plant using 3 distinct recipes at a skewed 60/30/10 frequency, which
            is exactly the "same product, different combinations" story the platform proves.
          </p>
        </Section>

        <Section title="5. Requirements traceability — DIC-* IDs from the solution design doc">
          <p>
            Source: <code className="bg-gray-100 px-1 rounded">docs/Meetings/Chapters/12-dic-bom-optimizer-solution-design.md</code> §3.
            Status reflects the actual Phase 0 codebase, not intent.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>ID</Th><Th>Requirement</Th><Th>Status</Th><Th>Where</Th></tr></thead>
              <tbody>
                <tr><Td mono>DIC-D01</Td><Td>Ingest master BOM header+items into canonical envelope</Td><Td>✅ Done</Td><Td mono>excel_connector.py</Td></tr>
                <tr><Td mono>DIC-D02</Td><Td>Ingest sales order BOM (parent/sub-items via HigherLevelItem)</Td><Td>✅ Done</Td><Td mono>ingest_sales_order_bom</Td></tr>
                <tr><Td mono>DIC-D03</Td><Td>Ingest production order components (withdrawn vs required qty)</Td><Td>✅ Done</Td><Td mono>ingest_production_order_bom</Td></tr>
                <tr><Td mono>DIC-D04</Td><Td>Planned order components via delta-only (no full reload)</Td><Td>❌ Not done</Td><Td>Currently full reload every run</Td></tr>
                <tr><Td mono>DIC-D05</Td><Td>SO→PlndOrd→ProdOrd linkage with ChainStage</Td><Td>✅ Done</Td><Td mono>OrderChain model + ingest_order_linkage</Td></tr>
                <tr><Td mono>DIC-D06</Td><Td>Source system + extraction timestamp + freshness on every record</Td><Td>🟡 Partial</Td><Td>Stored (<code>source_system</code>, <code>extracted_at</code>) but not surfaced in API responses yet</Td></tr>
                <tr><Td mono>DIC-D07</Td><Td>Detect component substitutions — distinct sets + frequency per material</Td><Td>✅ Done</Td><Td mono>explosion_engine.py (occurrence_count)</Td></tr>
                <tr><Td mono>DIC-D08</Td><Td>Mock-file ingestion identical in shape to SAP ingestion</Td><Td>✅ Done</Td><Td>Canonical model is source-agnostic</Td></tr>
                <tr><Td mono>DIC-C01</Td><Td>Enumerate candidate production paths for (material, plant, qty, date)</Td><Td>✅ Done</Td><Td mono>explode_bom</Td></tr>
                <tr><Td mono>DIC-C02</Td><Td>Multi-level, cycle-safe explosion with scrap/yield</Td><Td>🟡 Partial</Td><Td>Single-level only; scrap stored but not yet applied; no cycle detection needed at single level</Td></tr>
                <tr><Td mono>DIC-C03</Td><Td>Evaluate hard constraints, machine-readable reason codes</Td><Td>✅ Done</Td><Td mono>constraint_engine.py</Td></tr>
                <tr><Td mono>DIC-C04</Td><Td>Score against a versioned profile — same inputs = identical score</Td><Td>✅ Done</Td><Td mono>scoring_engine.py (deterministic, no RNG)</Td></tr>
                <tr><Td mono>DIC-C05</Td><Td>7 constraint categories (physical/logistical/policy/legal/market/cost/capacity)</Td><Td>❌ Not done</Td><Td>Only 4 generic constraints implemented; legal/regulatory flagged as roadmap</Td></tr>
                <tr><Td mono>DIC-C06</Td><Td>Call ML prediction services for demand/price/risk</Td><Td>❌ Not done</Td><Td>Phase 2+ (Azure ML)</Td></tr>
                <tr><Td mono>DIC-C07</Td><Td>Return ranked alternatives, not just a winner (top-3 min)</Td><Td>✅ Done</Td><Td>Full ranked list returned</Td></tr>
                <tr><Td mono>DIC-C08</Td><Td>What-if overrides (component unavailable, price +20%, etc)</Td><Td>❌ Not done</Td><Td>Roadmap — Scenario Engine</Td></tr>
                <tr><Td mono>DIC-C09</Td><Td>Never write to ERP without explicit human approval</Td><Td>✅ Done</Td><Td>No write path exists at all in Phase 0</Td></tr>
                <tr><Td mono>DIC-X01</Td><Td>Persona-scoped views (Planner/Sales/Procurement/etc)</Td><Td>🟡 Partial</Td><Td>RBAC page-access implemented; same page content per persona, not different panels</Td></tr>
                <tr><Td mono>DIC-X02</Td><Td>Structured explanation object per recommendation</Td><Td>✅ Done</Td><Td mono>routes/explain.py</Td></tr>
                <tr><Td mono>DIC-X03</Td><Td>Grounded NL Q&amp;A over decision + approved documents</Td><Td>❌ Not done</Td><Td>Phase 3 (RAG/Copilot)</Td></tr>
                <tr><Td mono>DIC-X04</Td><Td>Immutable, replayable audit record per decision</Td><Td>✅ Done</Td><Td mono>Decision model (append-only)</Td></tr>
                <tr><Td mono>DIC-X05</Td><Td>Capture accept/reject/override with a reason</Td><Td>❌ Not done</Td><Td>Decision has status/approval fields but no UI action yet</Td></tr>
                <tr><Td mono>DIC-X06</Td><Td>Baseline metrics: time-to-BOM, error rate, waste %</Td><Td>❌ Not done</Td><Td>Phase 4</Td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="6. Deep-dive review: how the documents correlate with the UI/API">
          <p>
            A full file-by-file review was performed against the current codebase. The results are
            captured in{' '}
            <code className="bg-gray-100 px-1 rounded">docs/Meetings/Phase0_Requirements_Traceability_Review.md</code>.
            Key takeaways that matter most for a lead:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>What the client actually asked for</strong> (from transcripts and prompts):
              the same finished good is produced many different ways historically; the tool must find
              each distinct component combination, show how often it was used, and rank the options.
              This is exactly what <code className="bg-gray-100 px-1 rounded">explode_bom()</code>
              and <code className="bg-gray-100 px-1 rounded">occurrence_count</code> prove.
            </li>
            <li>
              <strong>Data contract</strong>: the client explicitly wants two-sheet workbooks per
              order type (header + component) and a fourth linkage file (SO → PlannedOrder →
              ProductionOrder). The current ingestion follows that contract.
            </li>
            <li>
              <strong>BRD constraints</strong>: the Business Requirements Document lists 7 constraint
              categories (Physical, Logistical, Policy, Legal/Regulatory, Market, Cost, Capacity). Only
              a generic 4-rule constraint engine exists in Phase 0 — the seven categories are not yet
              represented.
            </li>
            <li>
              <strong>Business story still missing</strong>: BR-002 (MTO quotation with cost/margin)
              and BR-003 (rank by cost, quality, supplier risk, production efficiency) are not yet
              business-credible because the UI shows 0–1 scores instead of dollar/lead-time numbers.
            </li>
          </ul>
        </Section>

        <Section title="7. Critical gaps and what to fix next">
          <p>
            Ordered by demo readiness, not by architecture completeness. These are the gaps a
            non-technical stakeholder will notice in a Phase 0 walkthrough.
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong>Add cost/margin display</strong> — even with mocked component prices and a
              dummy selling price, show a dollar-cost breakdown and a margin percentage. Without this,
              the scoring weights look meaningless.
            </li>
            <li>
              <strong>Generate the master BOM mock data</strong> — the client requested 1,000 master
              BOMs with F000000–F009999 ranges. The ingestion pipeline already supports
              <code className="bg-gray-100 px-1 rounded">ObjectType = MASTER</code>; only the file
              itself is missing from the demo.
            </li>
            <li>
              <strong>Implement approve / reject / override on Decisions</strong> — the
              <code className="bg-gray-100 px-1 rounded">Decision</code> table has the fields, the UI
              does not. Every BRD process flow ends with a human approval gate.
            </li>
            <li>
              <strong>Persona-specific dashboard</strong> — show different default tiles for Planner,
              Procurement, Sales, R&D. At minimum, use the existing role to condition the Dashboard
              cards.
            </li>
            <li>
              <strong>Expose data freshness</strong> — DIC-D06 requires the source system and
              extraction timestamp to surface in API responses. Add them to Dashboard and Data
              Management stats.
            </li>
            <li>
              <strong>Map the 7 BRD constraint categories</strong> — extend the constraint engine so
              a candidate can be tagged as failing Physical/Logistical/Policy/Legal/Regulatory/Market
              /Cost/Capacity checks, not just the current generic rules.
            </li>
          </ol>
        </Section>

        <Section title="8. Why this is a production baseline, not a throwaway prototype">
          <p>
            The Phase 0 code is intentionally built as the foundation for the enterprise platform.
            The parts marked as "mock" are only the data sources and users — the architecture,
            models, engine, and API contracts are the same ones that will run in production.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>ERP-agnostic canonical model</strong> — SAP, Oracle, or Dynamics are just
              adapters; the <code className="bg-gray-100 px-1 rounded">canonical_bom_*</code> tables
              and the Decision Core never change.
            </li>
            <li>
              <strong>Production stack</strong> — FastAPI, Pydantic, async SQLAlchemy, React,
              TypeScript, and Tailwind. These are the actual enterprise tools, not convenience
              scripts.
            </li>
            <li>
              <strong>Immutable audit records</strong> — every analysis is stored as a
              <code className="bg-gray-100 px-1 rounded">Decision</code> row with request,
              constraints, scoring profile, candidates, and trace. That is the foundation for
              compliance and model retraining.
            </li>
            <li>
              <strong>Deterministic scoring</strong> — the same input always returns the same rank.
              This is required for a regulated manufacturing environment, not a demo trick.
            </li>
            <li>
              <strong>Swappable deployment concerns</strong> — SQLite can become PostgreSQL by
              changing <code className="bg-gray-100 px-1 rounded">DATABASE_URL</code>; mock JWT can
              become Entra ID using the same token interface; Excel adapters can become SAP
              adapters without touching the Decision Core.
            </li>
          </ul>
          <p className="text-sm text-gray-600 mt-3">
            Full details are in <code className="bg-gray-100 px-1 rounded">docs/Meetings/Phase0_Demo_Story_and_Baseline.md</code>.
          </p>
        </Section>

        <Section title="9. What's explicitly deferred (not cut corners — sequenced)">
          <ul className="list-disc list-inside space-y-1">
            <li>No live SAP connection — Phase 0 uses mock Excel extracts standing in for SAP CDS views (by design, per the build plan: decision logic ships before ERP integration).</li>
            <li>No forecasting / commodity price prediction / seasonality (Phase 2+ — needs Azure ML).</li>
            <li>No legal/regulatory shipping constraints or per-customer component restrictions as first-class rule types yet (Phase 1+ roadmap item, flagged in the design doc's risk register).</li>
            <li>No write-back to any ERP — every recommendation is read-only/advisory, approval-gated.</li>
            <li>Auth is a mock JWT directory, not Entra ID — same interface, swappable later.</li>
          </ul>
        </Section>
      </div>
    </PageLayout>
  );
};

import React, { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useApiQuery } from '@/hooks/useApiQuery';
import { uploadFile, generateDemoData, generateMasterData, fetchStats } from '@/services/api';
import type { IngestResponse, DashboardStats } from '@/types';

/** How many times each action has been run this session, and its last outcome. */
interface RunLog {
  count: number;
  lastAt: string;
  lastResults: Array<Record<string, unknown>>;
}

const emptyLog: RunLog = { count: 0, lastAt: '', lastResults: [] };

const inferTypeFromName = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('linkage')) return 'linkage';
  if (lower.includes('production')) return 'production_order';
  if (lower.includes('planned')) return 'planned_order';
  if (lower.includes('sales')) return 'sales_order';
  return 'production_order';
};

export const DataManagement: React.FC = () => {
  const [demoLog, setDemoLog] = useState<RunLog>(emptyLog);
  const [masterCounts, setMasterCounts] = useState<Record<string, number> | null>(null);

  // Live database counts — refetched after every ingestion action, so it's
  // always visible WHERE the data went and HOW MUCH is there right now.
  const { data: stats, loading: statsLoading, refetch: refetchStats } = useApiQuery<DashboardStats>(
    () => fetchStats(), []
  );

  const { mutate: runGenerateDemo, loading: generatingDemo, error: demoError } = useApiMutation<void, { results: Array<Record<string, unknown>> }>(
    () => generateDemoData(),
    {
      onSuccess: (res) => {
        setDemoLog((prev) => ({ count: prev.count + 1, lastAt: new Date().toLocaleTimeString(), lastResults: res.results }));
        refetchStats();
      },
    }
  );

  const { mutate: runGenerateMaster, loading: generatingMaster, error: masterError } = useApiMutation<void, { status: string; created: Record<string, number> }>(
    () => generateMasterData(),
    {
      onSuccess: (res) => {
        setMasterCounts(res.created);
        refetchStats();
      },
    }
  );

  // Multi-file upload from the user's local machine — no server-side path search.
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileTypes, setFileTypes] = useState<Record<string, string>>({});
  const [batchResults, setBatchResults] = useState<Array<IngestResponse & { file: string }>>([]);
  const [batchUploading, setBatchUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const types: Record<string, string> = {};
    files.forEach((f) => {
      types[f.name] = inferTypeFromName(f.name);
    });
    setSelectedFiles(files);
    setFileTypes(types);
    setBatchResults([]);
  };

  const handleBatchUpload = async () => {
    if (selectedFiles.length === 0) return;
    setBatchUploading(true);
    const results: Array<IngestResponse & { file: string }> = [];
    for (const file of selectedFiles) {
      try {
        const res = await uploadFile(fileTypes[file.name] || 'production_order', file);
        results.push({ ...res, file: file.name });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        results.push({
          file: file.name,
          status: 'error',
          message,
          records_ingested: 0,
          source_file: file.name,
          object_type: '',
        } as IngestResponse & { file: string });
      }
    }
    setBatchResults(results);
    refetchStats();
    setBatchUploading(false);
  };

  const updateFileType = (name: string, type: string) => {
    setFileTypes((prev) => ({ ...prev, [name]: type }));
  };

  return (
    <PageLayout pageName="Data Management">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Load mock SAP extracts into the platform's canonical BOM database. This is the
            only page that writes data — everything else (Dashboard, Analyze BOM, Decisions)
            only reads from what was loaded here.
          </p>
        </div>

        {/* What happens here + where data goes — answers "I don't know what this does" */}
        <div className="card bg-blue-50 border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">What happens when you click a button below?</h3>
          <ol className="text-sm text-blue-900 list-decimal list-inside space-y-1">
            <li>An Excel workbook (header sheet + component sheet) is read.</li>
            <li>Each order becomes one row in the <code className="bg-white/60 px-1 rounded">canonical_bom_header</code> table; each component becomes one row in <code className="bg-white/60 px-1 rounded">canonical_bom_item</code>, linked to its header.</li>
            <li>This is a local SQLite database file (<code className="bg-white/60 px-1 rounded">bom_platform.db</code>) on the API server — <strong>not</strong> a copy sent anywhere external.</li>
            <li>Running the same action again <strong>adds more rows</strong> — it does not replace what's already there. The "Current Database Contents" panel below always shows the live, up-to-date total so you can see the effect immediately.</li>
          </ol>
        </div>

        {/* Live DB state */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Current Database Contents</h3>
            <button onClick={() => refetchStats()} className="text-xs text-primary-600 hover:underline">
              Refresh
            </button>
          </div>
          {statsLoading ? (
            <LoadingSpinner size="sm" />
          ) : stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="BOM Headers" value={stats.total_bom_headers} />
              <Stat label="BOM Items (components)" value={stats.total_bom_items} />
              <Stat label="Distinct Materials" value={stats.total_materials} />
              <Stat label="Order Chains (linkage)" value={stats.total_order_chains} />
              <Stat label="Production Orders" value={stats.total_production_orders} />
              <Stat label="Planned Orders" value={stats.total_planned_orders} />
              <Stat label="Sales Orders" value={stats.total_sales_orders} />
              <Stat label="Decisions Run" value={stats.total_decisions} />
            </div>
          ) : (
            <p className="text-sm text-gray-500">No data yet — run an ingestion action below.</p>
          )}
          {stats && stats.total_bom_items === 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 mt-3">
              ⚠ BOM Items is 0 — Analyze BOM will return 0 candidates for every material until
              this is non-zero. Run "Generate & Ingest Demo Data" below.
            </p>
          )}
        </div>

        {/* Generate Demo Data — primary action for external / Azure users */}
        <div className="card border-l-4 border-l-amber-400">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate &amp; Ingest Demo Data (recommended)</h3>
          <p className="text-sm text-gray-500 mb-1">
            <strong>This works in every environment</strong> — local, Azure, or any server. It creates
            8 finished materials across 2 plants, each produced 10 times using 3 distinct component
            recipes at a deliberately skewed 60/30/10% usage frequency. Analyze BOM is guaranteed to
            return multiple ranked candidates with a clear historical-frequency story.
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Run this {demoLog.count > 0 ? `${demoLog.count} time${demoLog.count > 1 ? 's' : ''} so far this session (last: ${demoLog.lastAt})` : '— not run yet this session'}.
            Each run adds another full batch — clear the database first if you want a clean single copy.
          </p>
          <button
            onClick={() => runGenerateDemo(undefined as unknown as void)}
            disabled={generatingDemo}
            className="btn-primary"
          >
            {generatingDemo ? 'Generating...' : 'Generate & Ingest Demo Data'}
          </button>

          {generatingDemo && <LoadingSpinner size="sm" />}
          {demoError && <p className="mt-3 text-sm text-red-600">✗ {demoError}</p>}

          {demoLog.lastResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Last run result:</p>
              {demoLog.lastResults.map((r, i) => (
                <div key={i} className={`text-sm rounded-lg p-3 ${
                  r.status === 'success' ? 'bg-green-50 text-green-800' :
                  r.status === 'error' ? 'bg-red-50 text-red-800' :
                  'bg-yellow-50 text-yellow-800'
                }`}>
                  <span className="font-medium">{r.file as string}</span>
                  {' — '}
                  {r.status === 'success' ? `${r.records_ingested} component rows written` : (r.message as string)}
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-2">
                Now go to Analyze BOM and try material <code className="bg-gray-100 px-1 rounded">DEMO-F001</code> at plant <code className="bg-gray-100 px-1 rounded">1000</code> or <code className="bg-gray-100 px-1 rounded">2000</code>.
              </p>
            </div>
          )}
        </div>

        {/* Step 2 — master data. Without this the Production Persona has no
            cost, no recipe and no reprocess history to rank on. */}
        <div className="card border-l-4 border-l-indigo-400">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Generate Master Data (required for Production Persona)
          </h3>
          <p className="text-sm text-gray-500 mb-1">
            BOM data alone only tells us <em>which components</em> were used. To rank paths by
            cost and reprocess cycles we also need material master (cost, stock, lead time),
            production versions, recipes with operations, goods movements and rework links.
            This derives all of them from the BOM data already loaded above.
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Generation is seeded from the material number, so it is fully deterministic —
            re-running it produces identical master data. Run this <strong>after</strong>{' '}
            loading BOM data; each run replaces the previous master data rather than adding to it.
          </p>
          <button
            onClick={() => runGenerateMaster(undefined as unknown as void)}
            disabled={generatingMaster}
            className="btn-primary"
          >
            {generatingMaster ? 'Generating...' : 'Generate Master Data'}
          </button>

          {generatingMaster && <LoadingSpinner size="sm" />}
          {masterError && <p className="mt-3 text-sm text-red-600">✗ {masterError}</p>}

          {masterCounts && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Created:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(masterCounts).map(([key, value]) => (
                  <Stat
                    key={key}
                    label={key.replace(/_/g, ' ')}
                    value={value}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Now open <strong>Production Persona</strong>, pick plant{' '}
                <code className="bg-gray-100 px-1 rounded">1000</code> and material{' '}
                <code className="bg-gray-100 px-1 rounded">DEMO-F001</code>.
              </p>
            </div>
          )}
        </div>

        {/* Upload Multiple Excel Files from the user&apos;s machine */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Multiple Excel Files from Your Machine</h3>
          <p className="text-sm text-gray-500 mb-1">
            Select all 4 client extracts at once: Production Order, Planned Order, Sales Order BOMs,
            and the SO→PlannedOrder→ProductionOrder linkage. The type is guessed from the filename,
            but you can override it before uploading.
          </p>
          <p className="text-xs text-gray-400 mb-4">
            This is the recommended way for external or Azure demos — the user brings their own
            files instead of relying on any server-side path.
          </p>

          <input
            type="file"
            multiple
            accept=".xlsx,.xls"
            className="input-field mb-4"
            onChange={handleFileSelect}
          />

          {selectedFiles.length > 0 && (
            <div className="space-y-2 mb-4">
              {selectedFiles.map((f) => (
                <div
                  key={f.name}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center border rounded p-2 text-sm"
                >
                  <span className="font-medium truncate">{f.name}</span>
                  <select
                    className="input-field text-sm py-1"
                    value={fileTypes[f.name] || 'production_order'}
                    onChange={(e) => updateFileType(f.name, e.target.value)}
                  >
                    <option value="production_order">Production Order BOM</option>
                    <option value="planned_order">Planned Order BOM</option>
                    <option value="sales_order">Sales Order BOM</option>
                    <option value="linkage">Order Linkage (SO→PlanOrd→ProdOrd)</option>
                  </select>
                  <span className="text-xs text-gray-500">
                    {f.size} bytes
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleBatchUpload}
            disabled={batchUploading || selectedFiles.length === 0}
            className="btn-secondary"
          >
            {batchUploading ? 'Uploading...' : `Upload ${selectedFiles.length > 0 ? selectedFiles.length : ''} File${selectedFiles.length !== 1 ? 's' : ''} & Ingest`}
          </button>

          {batchUploading && <LoadingSpinner size="sm" />}

          {batchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Results:</p>
              {batchResults.map((r, i) => (
                <div key={i} className={`text-sm rounded-lg p-3 ${
                  r.status === 'success' ? 'bg-green-50 text-green-800' :
                  r.status === 'error' ? 'bg-red-50 text-red-800' :
                  'bg-yellow-50 text-yellow-800'
                }`}>
                  <span className="font-medium">{r.file}</span>
                  {' — '}
                  {r.status === 'success' ? `${r.message} (${r.object_type})` : r.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-gray-50 rounded-lg p-3 text-center">
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </div>
);

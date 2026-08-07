import React from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { KpiCard } from '@/components/common/KpiCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useApiQuery } from '@/hooks/useApiQuery';
import { fetchStats } from '@/services/api';
import type { DashboardStats } from '@/types';

export const Dashboard: React.FC = () => {
  const { data: stats, loading, error } = useApiQuery<DashboardStats>(
    () => fetchStats(),
    []
  );

  return (
    <PageLayout pageName="Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Platform Overview</h2>
          <p className="text-sm text-gray-500 mt-1">
            Enterprise AI Decision Platform for Manufacturing — Phase 0
          </p>
        </div>

        {/* KPI Grid */}
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="card">
            <p className="text-red-600 text-sm">{error}</p>
            <p className="text-gray-500 text-xs mt-2">
              Make sure the API is running on http://localhost:8000
            </p>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Materials" value={stats.total_materials} variant="blue" sub="Distinct finished goods" />
            <KpiCard label="BOM Headers" value={stats.total_bom_headers} variant="green" sub="All order types" />
            <KpiCard label="BOM Items" value={stats.total_bom_items} variant="amber" sub="Component records" />
            <KpiCard label="Decisions" value={stats.total_decisions} variant="purple" sub="Computed analyses" />
            <KpiCard label="Production Orders" value={stats.total_production_orders} variant="green" />
            <KpiCard label="Planned Orders" value={stats.total_planned_orders} variant="blue" />
            <KpiCard label="Sales Orders" value={stats.total_sales_orders} variant="amber" />
            <KpiCard label="Order Chains" value={stats.total_order_chains} variant="slate" sub="SO→PlanOrd→ProdOrd" />
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-500">No data loaded yet.</p>
            <p className="text-sm text-gray-400 mt-2">
              Go to <strong>Data Management</strong> to ingest Excel files.
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <a href="/analyze" className="btn-primary">Analyze a BOM</a>
            <a href="/data" className="btn-secondary">Upload Data</a>
            <a href="/decisions" className="btn-secondary">View Decisions</a>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

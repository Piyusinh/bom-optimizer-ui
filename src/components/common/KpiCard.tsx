import React from 'react';

interface KpiCardProps {
  label: string;
  value: number | string;
  sub?: string;
  variant?: 'slate' | 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, variant = 'slate' }) => {
  const colors = {
    slate: { value: 'text-gray-900', border: 'border-l-slate-400' },
    blue: { value: 'text-blue-700', border: 'border-l-blue-500' },
    green: { value: 'text-green-700', border: 'border-l-green-500' },
    amber: { value: 'text-amber-700', border: 'border-l-amber-500' },
    red: { value: 'text-red-700', border: 'border-l-red-500' },
    purple: { value: 'text-purple-700', border: 'border-l-purple-500' },
  };

  const { value: valueClass, border: borderClass } = colors[variant];

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-l-4 ${borderClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
};

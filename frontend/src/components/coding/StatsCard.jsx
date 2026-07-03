import React from 'react';

const StatsCard = ({ label, value, accent = 'bg-slate-50 text-slate-900' }) => (
  <div className={`rounded-3xl border border-slate-100 p-4 ${accent}`}>
    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-slate-900">{value ?? '—'}</p>
  </div>
);

export default StatsCard;

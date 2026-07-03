import React from 'react';

const PlatformSummaryCard = ({ title, value, accent = 'bg-slate-50 text-slate-900' }) => (
  <div className={`rounded-3xl border border-slate-100 p-5 ${accent}`}>
    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{title}</p>
    <p className="mt-3 text-2xl font-semibold text-slate-900">{value ?? 'N/A'}</p>
  </div>
);

export default PlatformSummaryCard;

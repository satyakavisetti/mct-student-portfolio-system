import React from 'react';

const ChartCard = ({ title, children }) => (
  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    </div>
    <div className="h-72">{children}</div>
  </div>
);

export default ChartCard;

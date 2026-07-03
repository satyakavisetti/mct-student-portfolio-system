import React from 'react';

const LoadingCard = ({ message = 'Loading…' }) => (
  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  </div>
);

export default LoadingCard;

import React from 'react';

const gradeForScore = (score) => {
  if (score >= 85) return 'A+ · Excellent';
  if (score >= 70) return 'A · Good';
  if (score >= 55) return 'B · Average';
  return 'C · Needs Improvement';
};

const AnalyticsScoreCard = ({ title, score, description }) => {
  const numericScore = Number.isFinite(score) ? score : null;
  const grade = numericScore != null ? gradeForScore(numericScore) : 'N/A';

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{title}</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">{numericScore != null ? `${numericScore}` : 'N/A'}</h2>
          <p className="mt-1 text-sm text-slate-500">{grade}</p>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-500 text-white text-xl font-bold">
          {numericScore != null ? Math.round(numericScore / 10) : '--'}
        </div>
      </div>
      {description ? (
        <p className="mt-6 text-sm leading-6 text-slate-600">{description}</p>
      ) : null}
    </div>
  );
};

export default AnalyticsScoreCard;

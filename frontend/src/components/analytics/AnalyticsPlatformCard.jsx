import React from 'react';
import { Link } from 'react-router-dom';

const platformMeta = {
  leetcode: { label: 'LeetCode', accent: 'from-orange-500 to-amber-400', icon: '🧠' },
  codechef: { label: 'CodeChef', accent: 'from-blue-600 to-cyan-500', icon: '🍽️' },
  hackerrank: { label: 'HackerRank', accent: 'from-emerald-500 to-teal-500', icon: '🏅' },
};

const SUPPORTED_ANALYTICS = new Set(['leetcode', 'codechef', 'hackerrank']);

const AnalyticsPlatformCard = ({ platform, username, status, lastSynced, saving, syncing, onSave, onSync }) => {
  const meta = platformMeta[platform] || { label: platform, accent: 'from-slate-400 to-slate-500', icon: '🔗' };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`inline-flex rounded-3xl bg-gradient-to-r ${meta.accent} px-4 py-3 text-white font-semibold`}>{meta.icon} {meta.label}</div>
      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm uppercase tracking-[0.3em] text-slate-500" htmlFor={`handle-${platform}`}>Username</label>
          <input
            id={`handle-${platform}`}
            value={username || ''}
            onChange={(event) => onUsernameChange?.(platform, event.target.value)}
            placeholder={`Enter ${meta.label} username`}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Status</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{status}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Last Synced</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{lastSynced || 'Never'}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => onSave(platform)}
            disabled={saving}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => onSync(platform)}
            disabled={syncing}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
          {SUPPORTED_ANALYTICS.has(platform) ? (
            <Link
              to={`/analytics/${platform}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              View Details
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400"
            >
              View Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPlatformCard;

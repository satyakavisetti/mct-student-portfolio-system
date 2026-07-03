import React from 'react';

const platformMeta = {
  leetcode: { label: 'LeetCode', icon: '🧠', accent: 'from-orange-500 to-amber-400', inputHint: 'e.g. john_doe' },
  codechef: { label: 'CodeChef', icon: '🍽️', accent: 'from-blue-600 to-cyan-500', inputHint: 'e.g. john_doe' },
  github: { label: 'GitHub', icon: '🐙', accent: 'from-gray-800 to-slate-600', inputHint: 'e.g. octocat' },
  hackerrank: { label: 'HackerRank', icon: '🏅', accent: 'from-green-600 to-emerald-500', inputHint: 'e.g. john_doe' },
};

const statusStyles = {
  synced: 'bg-green-100 text-green-700 border-green-200',
  estimated: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  'never synced': 'bg-gray-100 text-gray-700 border-gray-200',
};

const CodingHandleCard = ({ platform, username, status, lastSynced, onSave, onSync, onUsernameChange, saving, syncing, error }) => {
  const meta = platformMeta[platform] || { label: platform, icon: '🔗', accent: 'from-slate-500 to-slate-400', inputHint: 'username' };
  const normalizedStatus = status || 'never synced';
  const isDisabled = saving || syncing;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${meta.accent} text-xl text-white`}>
          {meta.icon}
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusStyles[normalizedStatus] || statusStyles['never synced']}`}>
          {normalizedStatus}
        </span>
      </div>

      <div className="mt-4">
        <h3 className="text-lg font-semibold text-slate-800">{meta.label}</h3>
        <p className="mt-1 text-sm text-slate-500">{meta.inputHint}</p>
      </div>

      <div className="mt-4 space-y-3">
        <input
          value={username || ''}
          onChange={(event) => onUsernameChange?.(platform, event.target.value)}
          placeholder={`Enter ${meta.label} username`}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
        />

        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>Last synced:</span>
          <span className="font-medium text-slate-700">{lastSynced || 'Not synced yet'}</span>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSave?.(platform)}
            disabled={isDisabled}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => onSync?.(platform)}
            disabled={isDisabled}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodingHandleCard;

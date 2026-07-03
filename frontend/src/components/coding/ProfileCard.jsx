import React from 'react';

const platformMeta = {
  leetcode: {
    label: 'LeetCode',
    icon: '🧠',
    accent: 'from-orange-100 to-orange-50',
    badge: 'bg-orange-100 text-orange-800',
  },
  codechef: {
    label: 'CodeChef',
    icon: '🍽️',
    accent: 'from-amber-100 to-orange-50',
    badge: 'bg-amber-100 text-amber-800',
  },
  github: {
    label: 'GitHub',
    icon: '🐙',
    accent: 'from-slate-100 to-slate-50',
    badge: 'bg-slate-100 text-slate-800',
  },
  hackerrank: {
    label: 'HackerRank',
    icon: '🏅',
    accent: 'from-emerald-100 to-green-50',
    badge: 'bg-emerald-100 text-emerald-800',
  },
};

const statusStyles = {
  active: 'bg-green-100 text-green-700 border-green-200',
  verified: 'bg-green-100 text-green-700 border-green-200',
  estimated: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  unknown: 'bg-gray-100 text-gray-700 border-gray-200',
};

const formatDate = (value) => {
  if (!value) return 'Never synced';
  try {
    return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return value;
  }
};

const ProfileCard = ({
  platform,
  profile = {},
  contestHistory = [],
  onRefresh,
  refreshing,
  error,
  children,
}) => {
  const meta = platformMeta[platform] || {
    label: platform,
    icon: '🔗',
    accent: 'from-slate-100 to-slate-50',
    badge: 'bg-slate-100 text-slate-800',
  };

  const status = String(profile.profileStatus || 'unknown').toLowerCase();
  const stats = profile.stats || {};
  const profileUrl = stats.profileUrl || profile.profileUrl || profile.raw?.profileUrl || null;
  const username = profile.username || stats.username || profile.displayName || '';
  const rating = stats.rating ?? stats.contestRating ?? stats.currentRating ?? stats.highestRating ?? null;
  const problemsSolved = stats.problemsSolved ?? stats.totalSolved ?? stats.solved ?? null;
  const verificationText = status === 'active' || status === 'verified' ? 'Verified' : status === 'estimated' ? 'Estimated' : status === 'failed' ? 'Failed' : 'Unknown';

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.accent} text-2xl`}>{meta.icon}</div>
          <div>
            <p className="text-sm font-semibold text-gray-600">{meta.label}</p>
            <p className="text-xl font-bold text-gray-900">{profile.displayName || username || 'Not connected'}</p>
            {username ? <p className="text-xs text-slate-500">@{username}</p> : null}
            <p className="mt-1 text-xs uppercase tracking-[0.25em] text-gray-500">{profile.platform || meta.label}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[status] || statusStyles.unknown}`}>
            {verificationText}
          </span>
          <button
            type="button"
            onClick={() => onRefresh?.(platform)}
            disabled={!onRefresh || refreshing}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Last Synced</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(profile.lastSynced)}</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Profile Link</p>
          {profileUrl ? (
            <a href={profileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-blue-600">
              Open profile <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <p className="mt-2 text-sm font-medium text-slate-500">Not available</p>
          )}
        </div>
      </div>

      {(rating != null || problemsSolved != null) ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {rating != null ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Rating</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{rating}</p>
            </div>
          ) : null}

          {problemsSolved != null ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Problems Solved</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{problemsSolved}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mt-5 space-y-4">{children}</div>

      {contestHistory?.length > 0 && (
        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Contest history</p>
          <div className="mt-3 grid gap-3">
            {contestHistory.slice(0, 3).map((contest, index) => (
              <div key={`${contest.contestName || 'contest'}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">{contest.contestName || 'Untitled contest'}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                  {contest.contestDate && <span>{new Date(contest.contestDate).toLocaleDateString()}</span>}
                  {contest.rank != null && <span>Rank: {contest.rank}</span>}
                  {contest.rating != null && <span>Rating: {contest.rating}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileCard;

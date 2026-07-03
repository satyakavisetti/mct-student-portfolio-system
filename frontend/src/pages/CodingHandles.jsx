import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import codingService from '../services/codingService';
import analyticsService from '../services/analyticsService';

const PLATFORMS = ['leetcode', 'codechef', 'github', 'hackerrank'];

const platformMeta = {
  leetcode: { label: 'LeetCode', accent: 'from-orange-500 to-amber-400', icon: '🧠', supportsAnalytics: true },
  codechef: { label: 'CodeChef', accent: 'from-red-600 to-orange-500', icon: '🍽️', supportsAnalytics: true },
  github: { label: 'GitHub', accent: 'from-slate-500 to-slate-600', icon: '🐙', supportsAnalytics: false },
  hackerrank: { label: 'HackerRank', accent: 'from-emerald-500 to-teal-500', icon: '🏅', supportsAnalytics: true },
};

const getInitialState = () => PLATFORMS.reduce((acc, item) => ({ ...acc, [item]: '' }), {});

const gradeForScore = (score) => {
  const numeric = Number(score);
  if (Number.isNaN(numeric)) return 'N/A';
  if (numeric >= 85) return 'A+';
  if (numeric >= 70) return 'A';
  if (numeric >= 55) return 'B';
  if (numeric >= 40) return 'C';
  return 'D';
};

const buildProgressValue = (score) => {
  if (score == null || Number.isNaN(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(Number(score))));
};

const formatPercentage = (value) => {
  if (value == null || Number.isNaN(value)) return 'N/A';
  return `${value}%`;
};

const normalizePercentValue = (score, total) => {
  if (score == null || total == null || total <= 0) return 'N/A';
  return `${Math.round((score / total) * 100)}%`;
};

const getInitialStateAnalytics = () => ({
  score: null,
  grade: 'N/A',
  progress: 0,
  lastSynced: null,
  leetcodePercent: 'N/A',
  codechefPercent: 'N/A',
  hackerrankPercent: 'N/A',
});

const getStatus = (profileStatus, lastSynced) => {
  const normalized = (profileStatus || '').toLowerCase();
  if (!lastSynced) return 'never synced';
  if (normalized === 'active' || normalized === 'synced') return 'synced';
  if (normalized === 'estimated') return 'estimated';
  if (normalized === 'failed') return 'failed';
  return 'never synced';
};

const formatLastSynced = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return value;
  }
};

const validateHandle = (platform, value) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'Username is required.';
  if (platform === 'github' && /\s/.test(trimmed)) return 'GitHub username cannot contain spaces.';
  if (platform === 'hackerrank' && /^(https?:\/\/|www\.)/i.test(trimmed)) return 'HackerRank username should be entered without a URL.';
  if (platform === 'hackerrank' && /\s/.test(trimmed)) return 'HackerRank username cannot contain spaces.';
  return '';
};

const CodingHandles = () => {
  const { user } = useAuth();
  const [handles, setHandles] = useState(getInitialState());
  const [statuses, setStatuses] = useState(getInitialState());
  const [lastSynced, setLastSynced] = useState(getInitialState());
  const [loading, setLoading] = useState(true);
  const [savingPlatform, setSavingPlatform] = useState(null);
  const [syncingPlatform, setSyncingPlatform] = useState(null);
  const [errors, setErrors] = useState(getInitialState());
  const [overallScore, setOverallScore] = useState(getInitialStateAnalytics());
  const [toast, setToast] = useState({ type: '', message: '' });
  const [mentorAssignment, setMentorAssignment] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    loadProfile();
  }, [user?.id]);

  useEffect(() => {
    if (!toast.message) return undefined;
    const timer = window.setTimeout(() => setToast({ type: '', message: '' }), 3000);
    return () => window.clearTimeout(timer);
  }, [toast.message]);

  const loadOverallScore = async () => {
    if (!user?.id) return;
    try {
      const data = await analyticsService.getOverallScore();
      const leetcodeScore = data?.platformScores?.find((item) => item.platform === 'leetcode')?.score ?? null;
      const codechefScore = data?.platformScores?.find((item) => item.platform === 'codechef')?.score ?? null;
      const hackerrankScore = data?.platformScores?.find((item) => item.platform === 'hackerrank')?.score ?? null;
      const totalScore = data?.overallCodingScore ?? data?.totalScore ?? null;
      const lastSyncedValue = data?.platformScores?.reduce((latest, item) => {
        const date = item?.profile?.lastSyncDate ? new Date(item.profile.lastSyncDate).toISOString() : null;
        return date && (!latest || new Date(date) > new Date(latest)) ? date : latest;
      }, null);

      setOverallScore({
        score: totalScore,
        grade: totalScore != null ? gradeForScore(totalScore) : 'N/A',
        progress: buildProgressValue(totalScore),
        lastSynced: lastSyncedValue,
        leetcodePercent: normalizePercentValue(leetcodeScore, totalScore),
        codechefPercent: normalizePercentValue(codechefScore, totalScore),
        hackerrankPercent: normalizePercentValue(hackerrankScore, totalScore),
      });
    } catch {
      setOverallScore(getInitialStateAnalytics());
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadOverallScore();
    }
  }, [user?.id]);

  const loadProfile = async () => {
    const studentId = user?.id;
    if (!studentId) return;

    setLoading(true);
    try {
      const [profile, mentorRes] = await Promise.all([
        codingService.getProfile(studentId),
        api.get('/mentor-assignments'),
      ]);
      const platformData = profile?.platforms || {};
      const nextHandles = {};
      const nextStatuses = {};
      const nextLastSynced = {};

      PLATFORMS.forEach((platform) => {
        const entry = platformData[platform] || {};
        nextHandles[platform] = entry.username || '';
        nextStatuses[platform] = getStatus(entry.profileStatus, entry.lastSynced);
        nextLastSynced[platform] = formatLastSynced(entry.lastSynced);
      });

      setHandles(nextHandles);
      setStatuses(nextStatuses);
      setLastSynced(nextLastSynced);
      setMentorAssignment(mentorRes.data?.data?.CODING || null);
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to load coding handles right now.';
      setToast({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (platform, value) => {
    setHandles((prev) => ({ ...prev, [platform]: value }));
    setErrors((prev) => ({ ...prev, [platform]: '' }));
  };

  const handleSave = async (platform) => {
    const studentId = user?.id;
    const value = (handles[platform] || '').trim();
    const validationError = validateHandle(platform, value);

    if (validationError) {
      setErrors((prev) => ({ ...prev, [platform]: validationError }));
      setToast({ type: 'error', message: validationError });
      return;
    }

    setSavingPlatform(platform);
    try {
      await codingService.saveHandle({ studentId, platform, handle: value });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('student-dashboard-refresh'));
      }
      setToast({ type: 'success', message: 'Handle saved successfully.' });
      setErrors((prev) => ({ ...prev, [platform]: '' }));
      await loadProfile();
      await loadOverallScore();
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to save handle right now.';
      setToast({ type: 'error', message });
      setErrors((prev) => ({ ...prev, [platform]: message }));
    } finally {
      setSavingPlatform(null);
    }
  };

  const handleSync = async (platform) => {
    const studentId = user?.id;
    if (!studentId) return;

    setSyncingPlatform(platform);
    try {
      await codingService.syncProfile(studentId);
      setToast({ type: 'success', message: `${platform.charAt(0).toUpperCase() + platform.slice(1)} sync completed.` });
    } catch (error) {
      const message = error.response?.data?.message || 'Sync failed. Please try again.';
      setToast({ type: 'error', message });
      return;
    } finally {
      setSyncingPlatform(null);
    }

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('student-dashboard-refresh'));
      }
      await Promise.all([loadProfile(), loadOverallScore()]);
    } catch (error) {
      console.error('[CodingHandles] Failed to refresh profile after sync', error);
    }
  };

  const handleOpenPlatformProfile = (platform) => {
    const raw = (handles[platform] || '');
    const username = raw.trim();
    if (!username) {
      setToast({ type: 'error', message: 'Please save your username first.' });
      return;
    }

    let url = '';
    switch (platform) {
      case 'leetcode':
        url = `https://leetcode.com/u/${encodeURIComponent(username)}/`;
        break;
      case 'codechef':
        url = `https://www.codechef.com/users/${encodeURIComponent(username)}`;
        break;
      case 'github':
        url = `https://github.com/${encodeURIComponent(username)}`;
        break;
      case 'hackerrank':
        url = `https://www.hackerrank.com/profile/${encodeURIComponent(username)}`;
        break;
      default:
        return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {toast.message ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${toast.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {toast.message}
        </div>
      ) : null}

      {mentorAssignment && (
        <div className="rounded-[20px] border border-emerald-100 bg-gradient-to-r from-emerald-50 to-cyan-50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-xl text-white">🏆</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Coding Mentor</p>
              <p className="text-sm text-slate-700">{mentorAssignment.mentor_name || 'Not assigned'}</p>
              <p className="text-xs text-slate-500">{mentorAssignment.mentor_phone || ''}{mentorAssignment.mentor_phone && mentorAssignment.mentor_email ? ' · ' : ''}{mentorAssignment.mentor_email || ''}</p>
            </div>
          </div>
          {mentorAssignment.department && <div className="mt-3 text-xs text-slate-600"><span className="rounded-full bg-white px-2.5 py-1">{mentorAssignment.department}</span></div>}
        </div>
      )}

      <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">Coding Handles</p>
            <h1 className="mt-2 text-2xl font-bold">Manage your coding platform usernames</h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100">Save your LeetCode, CodeChef, GitHub, and HackerRank handles and sync them with the latest profile data.</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm backdrop-blur-sm">
            <p className="font-semibold">Student ID</p>
            <p className="mt-1 text-blue-100">{user?.id || 'Unavailable'}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
          <div className="flex items-center gap-3 text-slate-600">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="font-medium">Loading your coding handles…</span>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {PLATFORMS.map((platform) => {
              const meta = platformMeta[platform] || {};
              return (
                <div key={platform} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className={`inline-flex rounded-3xl bg-gradient-to-r ${meta.accent || 'from-slate-400 to-slate-500'} px-4 py-3 text-white font-semibold`}>
                    <span className="mr-2">{meta.icon || '🔗'}</span>
                    <button
                      type="button"
                      onClick={() => handleOpenPlatformProfile(platform)}
                      className="text-white font-semibold focus:outline-none cursor-pointer hover:underline"
                    >
                      {meta.label || platform}
                    </button>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label htmlFor={`handle-${platform}`} className="block text-sm uppercase tracking-[0.3em] text-slate-500">Username</label>
                      <input
                        id={`handle-${platform}`}
                        value={handles[platform] || ''}
                        onChange={(event) => handleValueChange(platform, event.target.value)}
                        placeholder={`Enter ${meta.label || platform} username`}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                      />
                      {errors[platform] ? <p className="mt-2 text-sm text-red-600">{errors[platform]}</p> : null}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Status</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{statuses[platform] || 'never synced'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Last Synced</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{lastSynced[platform] || 'Never'}</p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => handleSave(platform)}
                        disabled={savingPlatform === platform}
                        className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                      >
                        {savingPlatform === platform ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSync(platform)}
                        disabled={syncingPlatform === platform}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                      >
                        {syncingPlatform === platform ? 'Syncing…' : 'Sync Now'}
                      </button>
                      {meta.supportsAnalytics ? (
                        <Link
                          to={`/analytics/${platform}`}
                          className="rounded-2xl border border-blue-600 bg-white px-4 py-3 text-center text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                        >
                          📊 View Details
                        </Link>
                      ) : (
                        // For platforms without analytics support, enable GitHub "View Details"
                        platform === 'github' ? (
                          <button
                            type="button"
                            onClick={() => {
                              const raw = handles.github || '';
                              const username = raw.trim();
                              if (!username) {
                                setToast({ type: 'error', message: 'Please save a GitHub username first.' });
                                return;
                              }
                              const githubUrl = `https://github.com/${username}`;
                              window.open(githubUrl, '_blank', 'noopener,noreferrer');
                            }}
                            disabled={!((handles.github || '').trim())}
                            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${((handles.github || '').trim()) ? 'border-blue-600 bg-white text-blue-700 hover:bg-blue-50' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
                          >
                            View Details
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400"
                          >
                            View Details
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Overall Coding Score</p>
                <div className="mt-2 flex flex-wrap items-end gap-4">
                  <h2 className="text-4xl font-semibold text-slate-900">{overallScore.score != null ? overallScore.score : 'N/A'}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{overallScore.grade}</span>
                </div>
              </div>
              <div className="min-w-[200px] rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="text-slate-500">Last Synced</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{overallScore.lastSynced ? formatLastSynced(overallScore.lastSynced) : 'Not available'}</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" style={{ width: `${overallScore.progress}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
                <span>Progress</span>
                <span>{`${overallScore.progress}%`}</span>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default CodingHandles;

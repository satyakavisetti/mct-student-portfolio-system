import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import api from '../services/api';

const PLATFORMS = ['LeetCode', 'HackerRank', 'CodeChef'];
const emptyForm = {
  platform: '',
  username: '',
  profile_url: '',
};

const emptyFetched = {
  rating: null,
  max_rating: null,
  problems_solved: null,
  global_rank: null,
  country_rank: null,
  stars_badges: null,
  reputation: null,
  avatar_url: null,
  coding_score: null,
  last_activity_date: null,
  last_sync_date: null,
  inactive_days: null,
  activity_status: null,
  current_streak: null,
  data_verification_status: 'unverified',
  estimated_skill_level: null,
  estimated_progress_score: null,
  // LeetCode enhanced fields
  easy_solved: null,
  medium_solved: null,
  hard_solved: null,
  active_days: null,
  max_streak: null,
  contest_rating: null,
  // Multi-platform fields
  badges: null,
  languages: null,
  achievements_analysis: null,
  badges_analysis: null,
  // Platform-specific fields
  country: null,
  hacker_name: null,
};

// ===== USERNAME EXTRACTION HELPERS =====
// Extract username from platform-specific URLs

const extractLeetCodeUsername = (url) => {
  if (!url) return null;
  try {
    // Matches: https://leetcode.com/u/USERNAME/ or https://leetcode.com/USERNAME/
    const match = url.match(/leetcode\.com\/(?:u\/)?([a-zA-Z0-9_-]+)\/?$/i);
    if (match && match[1]) {
      console.log(`[LeetCode] Extracted username from URL: ${match[1]}`);
      return match[1];
    }
  } catch (err) {
    console.warn(`[LeetCode] Failed to extract username: ${err.message}`);
  }
  return null;
};

const extractCodeChefUsername = (url) => {
  if (!url) return null;
  try {
    // Matches: https://www.codechef.com/users/USERNAME
    const match = url.match(/codechef\.com\/users\/([a-zA-Z0-9_-]+)\/?$/i);
    if (match && match[1]) {
      console.log(`[CodeChef] Extracted username from URL: ${match[1]}`);
      return match[1];
    }
  } catch (err) {
    console.warn(`[CodeChef] Failed to extract username: ${err.message}`);
  }
  return null;
};

const extractHackerRankUsername = (url) => {
  if (!url) return null;
  try {
    // Matches: https://www.hackerrank.com/profile/USERNAME
    const match = url.match(/hackerrank\.com\/profile\/([a-zA-Z0-9_-]+)\/?$/i);
    if (match && match[1]) {
      console.log(`[HackerRank] Extracted username from URL: ${match[1]}`);
      return match[1];
    }
  } catch (err) {
    console.warn(`[HackerRank] Failed to extract username: ${err.message}`);
  }
  return null;
};

const extractUsernameFromURL = (platform, url) => {
  if (!platform || !url) return null;
  
  const normalizedPlatform = String(platform).toLowerCase().trim();
  
  switch (normalizedPlatform) {
    case 'leetcode':
      return extractLeetCodeUsername(url);
    case 'codechef':
      return extractCodeChefUsername(url);
    case 'hackerrank':
      return extractHackerRankUsername(url);
    default:
      return null;
  }
};

const isValidHackerRankUrl = (url) => {
  if (!url) return true;
  const normalized = String(url).trim().toLowerCase();
  return normalized.startsWith('https://www.hackerrank.com/') || normalized.startsWith('https://www.hackerrank.com/profile/');
};

const parseDisplayList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [trimmed];
    } catch {
      return trimmed.startsWith('[') ? [] : [trimmed];
    }
  }
  return [];
};

const normalizeCompletionPercentage = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/%/g, '');
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
};

const normalizeLanguageProgress = (item) => {
  if (!item) return null;
  if (typeof item === 'string') {
    return { language: item, stars: null, completion_percentage: null };
  }
  if (typeof item === 'object') {
    const languageName = item.language || item.name || item.skill || item.title || item.label || item.problem_name || 'Unknown';
    const numericStars = item.stars ?? item.star ?? item.rating ?? item.level;
    const stars = numericStars !== null && numericStars !== undefined ? Number(numericStars) : null;
    const completionPercentage = normalizeCompletionPercentage(item.completion_percentage ?? item.completionPercent ?? item.progress ?? item.percentage ?? null);
    const estimatedCompletion = stars !== null ? [20, 40, 60, 80, 100][stars - 1] ?? null : null;
    return {
      language: languageName,
      stars,
      completion_percentage: completionPercentage ?? estimatedCompletion,
    };
  }
  return null;
};

const parseStructuredObject = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof value === 'object' ? value : null;
};

const renderMetricCard = (label, value, classes = '') => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-2 ${classes}`}>
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
};

const renderPlatformSpecificDetails = (profile, platform) => {
  const normalizedPlatform = String(platform || '').toLowerCase();
  const languageProgress = (Array.isArray(profile?.languages) ? profile.languages : parseDisplayList(profile?.languages))
    .map(normalizeLanguageProgress)
    .filter(Boolean);
  const totalStars = languageProgress.reduce((sum, item) => sum + (item.stars != null ? item.stars : 0), 0);
  const achievementData = parseStructuredObject(profile?.achievements_analysis || profile?.badges_analysis);
  const recentQuestions = Array.isArray(achievementData?.recent_questions) ? achievementData.recent_questions : [];
  const recentSubmissions = Array.isArray(achievementData?.recent_submissions) ? achievementData.recent_submissions : [];
  const contestHistory = Array.isArray(achievementData?.contest_history) ? achievementData.contest_history : [];
  const recentContests = Array.isArray(achievementData?.recent_contests) ? achievementData.recent_contests : [];
  const recentActivity = Array.isArray(achievementData?.recent_activity) ? achievementData.recent_activity : [];
  const lastUpdated = achievementData?.last_updated;
  const heatmap = achievementData?.heatmap;

  if (normalizedPlatform === 'hackerrank') {
    return (
      <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50 p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {renderMetricCard('Username', profile?.username || profile?.hacker_name)}
          {profile?.avatar_url && (
            <div className="rounded-lg border border-purple-200 bg-white p-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Avatar</p>
              <img src={profile.avatar_url} alt="Profile avatar" className="mt-2 h-12 w-12 rounded-full border border-purple-200 object-cover" />
            </div>
          )}
          {renderMetricCard('Overall Rating', profile?.rating)}
          {renderMetricCard('Problems Solved', profile?.problems_solved)}
          {renderMetricCard('Country', profile?.country)}
          {renderMetricCard('Hacker Name', profile?.hacker_name)}
          {totalStars > 0 && renderMetricCard('Total Stars', totalStars)}
        </div>
        {languageProgress.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-sm font-semibold text-purple-700">Language Progress</p>
            <div className="overflow-hidden rounded-lg border border-purple-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-purple-100 text-purple-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Language</th>
                    {languageProgress.some((item) => item.stars != null) && <th className="px-3 py-2 text-left">Stars</th>}
                    {languageProgress.some((item) => item.completion_percentage != null) && <th className="px-3 py-2 text-left">Completion</th>}
                  </tr>
                </thead>
                <tbody>
                  {languageProgress.map((item, idx) => (
                    <tr key={`${item.language || 'lang'}-${idx}`} className="border-t border-purple-100">
                      <td className="px-3 py-2">{item.language || 'Unknown'}</td>
                      {languageProgress.some((entry) => entry.stars != null) && (
                        <td className="px-3 py-2">{item.stars != null ? `${item.stars}★` : null}</td>
                      )}
                      {languageProgress.some((entry) => entry.completion_percentage != null) && (
                        <td className="px-3 py-2">{item.completion_percentage != null ? `${item.completion_percentage}%` : null}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (normalizedPlatform === 'leetcode') {
    return (
      <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {renderMetricCard('Username', profile?.username)}
          {profile?.avatar_url && (
            <div className="rounded-lg border border-blue-200 bg-white p-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Avatar</p>
              <img src={profile.avatar_url} alt="LeetCode avatar" className="mt-2 h-12 w-12 rounded-full border border-blue-200 object-cover" />
            </div>
          )}
          {renderMetricCard('Total Solved', profile?.problems_solved)}
          {renderMetricCard('Easy', profile?.easy_solved)}
          {renderMetricCard('Medium', profile?.medium_solved)}
          {renderMetricCard('Hard', profile?.hard_solved)}
          {renderMetricCard('Contest Rating', profile?.contest_rating)}
          {renderMetricCard('Contest Count', profile?.contest_count)}
          {renderMetricCard('Global Rank', profile?.global_rank)}
          {renderMetricCard('Reputation', profile?.reputation)}
          {renderMetricCard('Active Days', profile?.active_days)}
          {renderMetricCard('Current Streak', profile?.current_streak)}
          {renderMetricCard('Max Streak', profile?.max_streak)}
        </div>
        {(recentQuestions.length > 0 || recentSubmissions.length > 0) && (
          <div className="mt-3">
            <p className="mb-2 text-sm font-semibold text-blue-700">Recent Problems</p>
            <div className="space-y-2">
              {recentQuestions.slice(0, 5).map((item, idx) => (
                <div key={`${item.title || 'problem'}-${idx}`} className="rounded-lg border border-blue-200 bg-white p-2">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-gray-800">{item.title || 'Unknown'}</span>
                    <span className="text-xs text-gray-500">{item.difficulty || 'Unknown'}</span>
                  </div>
                  {item.question_url && (
                    <a href={item.question_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-blue-600 hover:underline">
                      Open Problem
                    </a>
                  )}
                  {item.date_solved && <p className="mt-1 text-xs text-gray-500">Solved on: {item.date_solved}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        {recentSubmissions.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-sm font-semibold text-blue-700">Recent Submissions</p>
            <div className="space-y-2">
              {recentSubmissions.slice(0, 5).map((item, idx) => (
                <div key={`${item.title || 'submission'}-${idx}`} className="rounded-lg border border-blue-200 bg-white p-2 text-sm text-gray-700">
                  {item.title || 'Submission'}
                </div>
              ))}
            </div>
          </div>
        )}
        {contestHistory.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-sm font-semibold text-blue-700">Contest History</p>
            <div className="space-y-2">
              {contestHistory.slice(0, 5).map((item, idx) => (
                <div key={`${item.name || 'contest'}-${idx}`} className="rounded-lg border border-blue-200 bg-white p-2 text-sm text-gray-700">
                  {item.name || 'Contest'}
                </div>
              ))}
            </div>
          </div>
        )}
        {Array.isArray(profile?.badges) && profile.badges.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-sm font-semibold text-blue-700">Public Badges</p>
            <div className="flex flex-wrap gap-2">
              {profile.badges.map((badge, idx) => (
                <span key={`${badge}-${idx}`} className="rounded-full border border-blue-200 bg-white px-2 py-1 text-xs text-blue-700">
                  {typeof badge === 'string' ? badge : badge?.name || badge?.title || 'Badge'}
                </span>
              ))}
            </div>
          </div>
        )}
        {heatmap && <p className="mt-3 text-xs font-medium text-blue-700">Heatmap: Available</p>}
        {lastUpdated && <p className="mt-3 text-xs font-medium text-blue-700">Last Updated: {lastUpdated}</p>}
      </div>
    );
  }

  if (normalizedPlatform === 'codechef') {
    return (
      <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {renderMetricCard('Username', profile?.username)}
          {renderMetricCard('Rating', profile?.rating)}
          {renderMetricCard('Highest Rating', profile?.max_rating)}
          {renderMetricCard('Global Rank', profile?.global_rank)}
          {renderMetricCard('Country Rank', profile?.country_rank)}
          {renderMetricCard('Problems Solved', profile?.problems_solved)}
          {renderMetricCard('Stars', profile?.stars_badges)}
          {renderMetricCard('Contest Count', profile?.contest_count)}
          {renderMetricCard('Country', profile?.country)}
        </div>
        {((Array.isArray(profile?.badges) && profile.badges.length > 0) || recentContests.length > 0 || recentActivity.length > 0) && (
          <div className="mt-3">
            <p className="mb-2 text-sm font-semibold text-orange-700">Achievements</p>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(profile?.badges) && profile.badges.length > 0 && profile.badges.map((badge, idx) => (
                <span key={`${badge}-${idx}`} className="rounded-full bg-white px-2 py-1 text-xs text-orange-700 border border-orange-200">
                  {typeof badge === 'string' ? badge : badge?.name || badge?.title || 'Achievement'}
                </span>
              ))}
            </div>
            {recentContests.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-orange-700">Recent Contests</p>
                <ul className="mt-1 list-disc pl-4 text-sm text-gray-700">
                  {recentContests.slice(0, 5).map((item, idx) => <li key={`${item.name || 'contest'}-${idx}`}>{item.name || item.title || 'Contest'}</li>)}
                </ul>
              </div>
            )}
            {recentActivity.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-orange-700">Recent Activity</p>
                <ul className="mt-1 list-disc pl-4 text-sm text-gray-700">
                  {recentActivity.slice(0, 5).map((item, idx) => <li key={`${item.title || item.activity || 'activity'}-${idx}`}>{item.title || item.activity || 'Activity'}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
};

// HackerRank Languages Editor component
const HackerRankLanguagesEditor = ({ languages, setLanguages }) => {
  const languageOptions = ['C', 'C++', 'Java', 'Python', 'JavaScript', 'SQL', 'C#', 'Go', 'Rust', 'Kotlin', 'PHP', 'Ruby', 'Swift'];
  const [newLang, setNewLang] = useState(languageOptions[0]);
  const [newStars, setNewStars] = useState(5);
  const [editingIndex, setEditingIndex] = useState(-1);

  const starsToCompletion = (s) => {
    const map = {1:20,2:40,3:60,4:80,5:100};
    return map[s] ?? null;
  };

  const addLanguage = () => {
    if (!newLang) return;
    const entry = { language: newLang, stars: Number(newStars), completion_percentage: starsToCompletion(Number(newStars)) };
    setLanguages((prev) => {
      const exists = prev.find((p) => String(p.language).toLowerCase() === String(newLang).toLowerCase());
      if (exists) return prev.map((p) => (String(p.language).toLowerCase() === String(newLang).toLowerCase() ? entry : p));
      return [...prev, entry];
    });
  };

  const removeLanguage = (idx) => setLanguages((prev) => prev.filter((_, i) => i !== idx));

  const updateLanguage = (idx, field, value) => {
    setLanguages((prev) => prev.map((p, i) => {
      if (i !== idx) return p;
      const updated = { ...p, [field]: value };
      if (field === 'stars') updated.completion_percentage = starsToCompletion(Number(value));
      return updated;
    }));
  };

  const overallScore = () => {
    if (!Array.isArray(languages) || languages.length === 0) return null;
    const comps = languages.map((l) => Number(l.completion_percentage || 0)).filter((v) => v > 0);
    if (comps.length === 0) return null;
    return Math.round(comps.reduce((a,b) => a+b, 0) / comps.length);
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <select value={newLang} onChange={(e) => setNewLang(e.target.value)} className="input-field">
          {languageOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <select value={newStars} onChange={(e) => setNewStars(Number(e.target.value))} className="input-field w-32">
          {[5,4,3,2,1].map((s) => <option key={s} value={s}>{'★'.repeat(s) + '☆'.repeat(5-s)} ({s})</option>)}
        </select>
        <button type="button" onClick={addLanguage} className="btn-primary">Add Language</button>
        <div className="ml-auto text-sm text-gray-600">Overall: <span className="font-semibold">{overallScore() ?? '-'}%</span></div>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-3 py-2 text-left">Language</th>
              <th className="px-3 py-2 text-left">Stars</th>
              <th className="px-3 py-2 text-left">Completion</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(languages || []).map((item, idx) => (
              <tr key={`${item.language}-${idx}`} className="border-t">
                <td className="px-3 py-2">
                  <input value={item.language} onChange={(e) => updateLanguage(idx, 'language', e.target.value)} className="input-field" />
                </td>
                <td className="px-3 py-2">
                  <select value={item.stars || 0} onChange={(e) => updateLanguage(idx, 'stars', Number(e.target.value))} className="input-field w-28">
                    {[1,2,3,4,5].map((s) => <option key={s} value={s}>{'★'.repeat(s) + '☆'.repeat(5-s)} ({s})</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">{item.completion_percentage != null ? `${item.completion_percentage}%` : '-'}</td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => removeLanguage(idx)} className="text-sm text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {(!languages || languages.length === 0) && (
              <tr><td colSpan={4} className="px-3 py-4 text-sm text-gray-500">No languages added yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CodingProfiles = () => {
  const [profiles, setProfiles] = useState([]);
  const [history, setHistory] = useState([]);
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [fetched, setFetched] = useState(emptyFetched);
  const [hrLanguages, setHrLanguages] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [msg, setMsg] = useState(null);
  const [urlError, setUrlError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [autoSyncing, setAutoSyncing] = useState(false);

  // Clear top-level messages when HackerRank languages change (user action)
  useEffect(() => {
    if (Array.isArray(hrLanguages) && hrLanguages.length > 0) {
      setMsg(null);
    }
  }, [hrLanguages]);

  const load = async () => {
    const cacheKey = 'codingProfilesCache';
    try {
      const cachedJson = window.localStorage.getItem(cacheKey);
      if (cachedJson) {
        const cachedData = JSON.parse(cachedJson);
        if (cachedData?.profiles) {
          setProfiles(cachedData.profiles || []);
          setHistory(cachedData.history || []);
          setRecentQuestions(cachedData.recentQuestions || []);
          setAnalytics(cachedData.analytics || null);
          setLoading(false);
        }
      }
    } catch (err) {
      console.warn('Unable to read cached coding profiles', err);
    }

    try {
      const res = await api.get('/coding');
      const data = res.data?.data || {};
      setProfiles(data.profiles || []);
      setHistory(data.history || []);
      setRecentQuestions(data.recentQuestions || []);
      setAnalytics(data.analytics || null);
      try {
        window.localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (cacheErr) {
        console.warn('Unable to cache coding profiles', cacheErr);
      }

      if (Array.isArray(data.profiles) && data.profiles.length > 0) {
        autoSyncStaleProfiles(data.profiles);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const autoSyncStaleProfiles = async (profilesList) => {
    if (!Array.isArray(profilesList) || profilesList.length === 0) return;
    const staleProfiles = profilesList.filter((profile) => {
      if (!profile.id || !profile.platform) return false;
      if (profile.platform.toLowerCase() === 'hackerrank') return false;
      const lastSync = profile.last_sync_date ? new Date(profile.last_sync_date) : null;
      const lastUpdated = profile.last_updated_date ? new Date(profile.last_updated_date) : null;
      const threshold = 24 * 60 * 60 * 1000;
      const compareDate = lastSync || lastUpdated;
      return !compareDate || Date.now() - compareDate.getTime() >= threshold;
    });
    if (!staleProfiles.length) return;

    setAutoSyncing(true);
    const syncResults = await Promise.allSettled(
      staleProfiles.map((profile) => api.post(`/coding/${profile.id}/sync`))
    );
    const successCount = syncResults.filter((r) => r.status === 'fulfilled').length;

    if (successCount > 0) {
      setMsg({ type: 'success', text: `Auto-synced ${successCount} coding profile${successCount > 1 ? 's' : ''}.` });
      await load();
    }
    setAutoSyncing(false);
  };

  const openAdd = () => {
    setForm(emptyForm);
    setFetched(emptyFetched);
    setHrLanguages([]);
    setEditId(null);
    setHasFetched(false);
    setUrlError(null);
    setShowForm(true);
    setMsg(null);
  };

  const openEdit = (p) => {
    setForm({
      platform: p.platform,
      username: p.username || '',
      profile_url: p.profile_url || '',
    });
    setUrlError(p.platform === 'HackerRank' && p.profile_url && !isValidHackerRankUrl(p.profile_url) ? 'Invalid HackerRank URL format.' : null);
    setFetched({
      rating: p.rating ?? null,
      max_rating: p.max_rating ?? null,
      problems_solved: p.problems_solved ?? null,
      global_rank: p.global_rank ?? null,
      country_rank: p.country_rank ?? null,
      stars_badges: p.stars_badges ?? null,
      reputation: p.reputation ?? null,
      avatar_url: p.avatar_url ?? null,
      coding_score: p.coding_score ?? null,
      last_activity_date: p.last_activity_date ?? null,
      last_sync_date: p.last_sync_date ?? null,
      inactive_days: p.inactive_days ?? null,
      activity_status: p.activity_status ?? null,
      current_streak: p.current_streak ?? null,
      data_verification_status: p.data_verification_status || 'unverified',
      estimated_skill_level: p.estimated_skill_level ?? null,
      estimated_progress_score: p.estimated_progress_score ?? null,
      // LeetCode enhanced fields
      easy_solved: p.easy_solved ?? null,
      medium_solved: p.medium_solved ?? null,
      hard_solved: p.hard_solved ?? null,
      active_days: p.active_days ?? null,
      max_streak: p.max_streak ?? null,
      contest_rating: p.contest_rating ?? null,
      // Multi-platform fields
      badges: p.badges ?? null,
      languages: p.languages ?? null,
      achievements_analysis: p.achievements_analysis ?? null,
      badges_analysis: p.badges_analysis ?? null,
      // Platform-specific fields
      country: p.country ?? null,
      hacker_name: p.hacker_name ?? null,
    });
    // initialize HackerRank languages editor from existing profile
    try {
      const langs = Array.isArray(p.languages) ? p.languages : parseDisplayList(p.languages);
      setHrLanguages(langs.map(normalizeLanguageProgress).filter(Boolean));
    } catch (e) {
      setHrLanguages([]);
    }
    setEditId(p.id);
    setHasFetched(true);
    setShowForm(true);
    setMsg(null);
  };

  // Handle profile URL change: auto-populate username from URL
  const handleProfileURLChange = (newUrl) => {
    setForm({ ...form, profile_url: newUrl });
    const isInvalidHackerRankUrl = form.platform === 'HackerRank' && newUrl && !isValidHackerRankUrl(newUrl);
    setUrlError(isInvalidHackerRankUrl ? 'URL must start with https://www.hackerrank.com/ or https://www.hackerrank.com/profile/' : null);

    if (newUrl && form.platform) {
      const extractedUsername = extractUsernameFromURL(form.platform, newUrl);
      if (extractedUsername) {
        console.log(`[Frontend] Auto-populated username: ${extractedUsername}`);
        setForm((prevForm) => ({ ...prevForm, username: extractedUsername }));
        // Clear fetched data when URL changes to force re-fetch
        setFetched(emptyFetched);
        setHasFetched(false);
        try { setMsg && setMsg(null); } catch (e) {}
      }
    }
  };

  const handleFetchProfile = async () => {
    if (!form.platform) {
      setMsg({ type: 'error', text: 'Platform is required.' });
      return;
    }

    // Try to extract username from URL if available
    let usernameToUse = form.username;
    if (form.profile_url) {
      const extractedUsername = extractUsernameFromURL(form.platform, form.profile_url);
      if (extractedUsername) {
        console.log(`[Frontend] Using extracted username from URL: ${extractedUsername}`);
        usernameToUse = extractedUsername;
      }
    }

    if (!usernameToUse) {
      setMsg({ type: 'error', text: form.profile_url ? 'Invalid profile URL for this platform.' : 'Username is required.' });
      return;
    }

    setFetching(true);
    try {
      console.log(`[Frontend] Fetching profile: platform=${form.platform}, username=${usernameToUse}`);
      const res = await api.post('/coding/fetch', {
        platform: form.platform,
        username: usernameToUse,
        profile_url: form.profile_url,
      });

      const profileData = res.data?.data?.profile || {};
      const recentData = Array.isArray(res.data?.data?.recent) ? res.data.data.recent : [];
      setFetched({
        rating: profileData.rating ?? null,
        max_rating: profileData.max_rating ?? null,
        problems_solved: profileData.problems_solved ?? null,
        global_rank: profileData.global_rank ?? null,
        country_rank: profileData.country_rank ?? null,
        stars_badges: profileData.stars_badges ?? null,
        reputation: profileData.reputation ?? null,
        avatar_url: profileData.avatar_url ?? null,
        coding_score: profileData.coding_score ?? null,
        last_activity_date: profileData.last_activity_date ?? null,
        last_sync_date: profileData.last_sync_date ?? null,
        inactive_days: profileData.inactive_days ?? null,
        activity_status: profileData.activity_status ?? null,
        current_streak: profileData.current_streak ?? null,
        data_verification_status: profileData.data_verification_status || 'unverified',
        estimated_skill_level: profileData.estimated_skill_level ?? null,
        estimated_progress_score: profileData.estimated_progress_score ?? null,
        // LeetCode enhanced fields
        easy_solved: profileData.easy_solved ?? null,
        medium_solved: profileData.medium_solved ?? null,
        hard_solved: profileData.hard_solved ?? null,
        active_days: profileData.active_days ?? null,
        max_streak: profileData.max_streak ?? null,
        contest_rating: profileData.contest_rating ?? null,
        // Multi-platform fields
        badges: profileData.badges ?? null,
        languages: profileData.languages ?? null,
        achievements_analysis: profileData.achievements_analysis ?? null,
        badges_analysis: profileData.badges_analysis ?? null,
        // Platform-specific fields
        country: profileData.country ?? null,
        hacker_name: profileData.hacker_name ?? null,
      });
      setHasFetched(true);
      const statusLabel = profileData.data_verification_status === 'verified'
        ? 'Verified'
        : profileData.data_verification_status === 'verified_url_only'
        ? 'URL-only Verified'
        : 'Estimated';
      setMsg({ type: 'success', text: `✓ [${statusLabel}] Profile data fetched from ${form.platform}!` });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to fetch profile.' });
      setHasFetched(false);
      setFetched(emptyFetched);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // clear any previous messages
    setMsg(null);

    if (!form.platform) {
      setMsg({ type: 'error', text: 'Platform is required.' });
      return;
    }
    
    // For non-HackerRank new profiles, require that data has been fetched
    if (form.platform === 'HackerRank' && form.profile_url && !isValidHackerRankUrl(form.profile_url)) {
      setMsg({ type: 'error', text: 'Invalid HackerRank profile URL. It should start with https://www.hackerrank.com/ or https://www.hackerrank.com/profile/.' });
      return;
    }

    if (!editId && !hasFetched && form.platform !== 'HackerRank') {
      setMsg({ type: 'error', text: 'Please fetch profile data before saving.' });
      return;
    }

    // Ensure we have a username for non-HackerRank platforms
    if (form.platform !== 'HackerRank' && !form.username) {
      setMsg({ type: 'error', text: 'Username is required.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        rating: fetched.rating,
        max_rating: fetched.max_rating,
        problems_solved: fetched.problems_solved,
        global_rank: fetched.global_rank,
        country_rank: fetched.country_rank,
        stars_badges: fetched.stars_badges,
        reputation: fetched.reputation,
        avatar_url: fetched.avatar_url,
        coding_score: fetched.coding_score,
        last_activity_date: fetched.last_activity_date,
        last_sync_date: fetched.last_sync_date,
        inactive_days: fetched.inactive_days,
        activity_status: fetched.activity_status,
        current_streak: fetched.current_streak,
        data_verification_status: fetched.data_verification_status,
        estimated_skill_level: fetched.estimated_skill_level,
        estimated_progress_score: fetched.estimated_progress_score,
        // LeetCode enhanced fields
        easy_solved: fetched.easy_solved,
        medium_solved: fetched.medium_solved,
        hard_solved: fetched.hard_solved,
        active_days: fetched.active_days,
        max_streak: fetched.max_streak,
        contest_rating: fetched.contest_rating,
        // Multi-platform fields
        badges: fetched.badges,
        languages: fetched.languages,
        achievements_analysis: fetched.achievements_analysis,
        badges_analysis: fetched.badges_analysis,
        // Platform-specific fields
        country: fetched.country,
        hacker_name: fetched.hacker_name,
      };

      // If HackerRank, attach manual languages and compute overall completion score
      if (form.platform === 'HackerRank') {
        const langs = Array.isArray(hrLanguages) ? hrLanguages : [];
        const comps = langs.map((l) => Number(l.completion_percentage || 0)).filter((v) => v > 0);
        const overall = comps.length ? Math.round(comps.reduce((a,b) => a+b, 0) / comps.length) : null;
        // send as JSON string to match backend storage expectations
        payload.languages = JSON.stringify(langs);
        payload.coding_score = overall;
        payload.data_verification_status = 'manual';
      }

      if (editId) {
        await api.put(`/coding/${editId}`, payload);
      } else {
        await api.post('/coding', payload);
      }

      window.localStorage.removeItem('codingProfilesCache');
      setShowForm(false);
      setMsg({ type: 'success', text: editId ? 'Profile updated!' : 'Profile added!' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncProfile = async (id) => {
    setSaving(true);
    try {
      await api.post(`/coding/${id}/sync`);
      window.localStorage.removeItem('codingProfilesCache');
      setMsg({ type: 'success', text: 'Profile synced successfully!' });
      await load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Sync failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this profile?')) return;
    try {
      await api.delete(`/coding/${id}`);
      window.localStorage.removeItem('codingProfilesCache');
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Coding Profiles</h1>
          {autoSyncing && (
            <p className="mt-1 text-sm text-blue-600">Background sync in progress for stale coding profiles...</p>
          )}
        </div>
        <button onClick={openAdd} className="btn-primary">
          + Add Profile
        </button>
      </div>

      {msg && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            msg.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      {showForm && (
        <div className="card">
          <h2 className="section-title">{editId ? 'Edit Profile' : 'New Coding Profile'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Platform and Username Section */}
            <div className="border-b pb-4">
              <h3 className="font-semibold text-gray-700 mb-3">Profile Information</h3>
              <select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                className="input-field w-full"
                required
                disabled={fetching}
              >
                <option value="">Select Platform *</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              {/* Platform-specific inputs */}
              {form.platform === 'HackerRank' ? (
                <div className="mt-3 space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Manually add your HackerRank language skills below.</p>
                    <HackerRankLanguagesEditor
                      languages={hrLanguages}
                      setLanguages={setHrLanguages}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">HackerRank Profile URL (optional)</label>
                    <input
                      placeholder="https://www.hackerrank.com/profile/username"
                      value={form.profile_url}
                      onChange={(e) => handleProfileURLChange(e.target.value)}
                      className="input-field mt-1 w-full"
                      disabled={fetching}
                    />
                    {urlError && <p className="mt-1 text-xs text-red-600">{urlError}</p>}
                    <p className="mt-1 text-xs text-gray-500">Optional. Save your HackerRank profile URL for coordinator verification.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <input
                    placeholder="Username (auto-filled from URL if available)"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="input-field"
                    disabled={fetching}
                  />
                  <input
                    placeholder="Profile URL (optional)"
                    value={form.profile_url}
                    onChange={(e) => handleProfileURLChange(e.target.value)}
                    className="input-field"
                    disabled={fetching}
                  />
                </div>
              )}

              {form.platform !== 'HackerRank' && (
                <button
                  type="button"
                  onClick={handleFetchProfile}
                  disabled={fetching || !form.platform || (!form.username && !form.profile_url)}
                  className={`mt-3 w-full ${
                    fetching || !form.platform || (!form.username && !form.profile_url)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  } py-2 px-4 rounded-lg font-medium transition-colors`}
                >
                  {fetching ? '⏳ Fetching Profile...' : '🔄 Fetch Profile Data'}
                </button>
              )}
            </div>

            {/* Fetched Data Display Section */}
            {hasFetched && (
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">Auto-Fetched Data</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    fetched.data_verification_status === 'verified'
                      ? 'bg-green-100 text-green-800'
                      : fetched.data_verification_status === 'verified_url_only'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {fetched.data_verification_status === 'verified'
                      ? '✓ Verified Data'
                      : fetched.data_verification_status === 'verified_url_only'
                      ? '⚠ URL-only Verified'
                      : '⚠ Estimated Data'}
                  </span>
                </div>
                <div className={`border rounded-lg p-4 ${
                  fetched.data_verification_status === 'verified'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <p className={`text-sm ${
                    fetched.data_verification_status === 'verified'
                      ? 'text-green-700'
                      : 'text-yellow-700'
                  } mb-3`}>
                    {fetched.data_verification_status === 'verified'
                      ? `✓ Data successfully fetched from ${form.platform}`
                      : fetched.data_verification_status === 'verified_url_only'
                      ? `⚠ Profile URL verified, but direct stats are blocked or protected.`
                      : `⚠ Estimated from publicly visible profile achievements`}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {form.platform !== 'LeetCode' && fetched.rating != null && (
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-500">Rating</p>
                        <p className="text-lg font-semibold text-gray-800">{fetched.rating}</p>
                      </div>
                    )}
                    {form.platform !== 'LeetCode' && fetched.max_rating != null && (
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-500">Max Rating</p>
                        <p className="text-lg font-semibold text-gray-800">{fetched.max_rating}</p>
                      </div>
                    )}
                    {fetched.problems_solved != null && (
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-500">Problems Solved</p>
                        <p className="text-lg font-semibold text-gray-800">{fetched.problems_solved}</p>
                      </div>
                    )}
                    {fetched.global_rank != null && (
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-500">Global Rank</p>
                        <p className="text-lg font-semibold text-gray-800">{fetched.global_rank}</p>
                      </div>
                    )}
                    {fetched.country_rank != null && (
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-500">Country Rank</p>
                        <p className="text-lg font-semibold text-gray-800">{fetched.country_rank}</p>
                      </div>
                    )}
                    {fetched.stars_badges != null && fetched.stars_badges !== '' && (
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-500">Badges / Stars</p>
                        <p className="text-lg font-semibold text-gray-800">{fetched.stars_badges}</p>
                      </div>
                    )}
                    {fetched.reputation != null && (
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-500">Reputation</p>
                        <p className="text-lg font-semibold text-gray-800">{fetched.reputation}</p>
                      </div>
                    )}
                    {fetched.estimated_skill_level && (
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-500">Estimated Skill Level</p>
                        <p className="text-lg font-semibold text-indigo-700">{fetched.estimated_skill_level}</p>
                      </div>
                    )}
                    {fetched.estimated_progress_score != null && (
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-500">Estimated Progress</p>
                        <p className="text-lg font-semibold text-indigo-700">{fetched.estimated_progress_score}%</p>
                      </div>
                    )}
                    {fetched.coding_score != null && (
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-500">Smart Coding Score</p>
                        <p className="text-lg font-semibold text-indigo-900">{fetched.coding_score}</p>
                      </div>
                    )}
                    {fetched.activity_status && (
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-500">Activity Status</p>
                        <p className="text-lg font-semibold text-indigo-900">{fetched.activity_status}</p>
                      </div>
                    )}
                    {fetched.current_streak != null && (
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-500">Current Streak</p>
                        <p className="text-lg font-semibold text-indigo-900">{fetched.current_streak}</p>
                      </div>
                    )}
                    {/* LeetCode Enhanced Fields */}
                    {fetched.easy_solved != null && (
                      <div className="bg-white p-2 rounded border border-green-100">
                        <p className="text-xs text-gray-500">Easy Problems Solved</p>
                        <p className="text-lg font-semibold text-green-700">{fetched.easy_solved}</p>
                      </div>
                    )}
                    {fetched.medium_solved != null && (
                      <div className="bg-white p-2 rounded border border-yellow-100">
                        <p className="text-xs text-gray-500">Medium Problems Solved</p>
                        <p className="text-lg font-semibold text-yellow-700">{fetched.medium_solved}</p>
                      </div>
                    )}
                    {fetched.hard_solved != null && (
                      <div className="bg-white p-2 rounded border border-red-100">
                        <p className="text-xs text-gray-500">Hard Problems Solved</p>
                        <p className="text-lg font-semibold text-red-700">{fetched.hard_solved}</p>
                      </div>
                    )}
                    {fetched.contest_rating != null && (
                      <div className="bg-white p-2 rounded border border-purple-100">
                        <p className="text-xs text-gray-500">Contest Rating</p>
                        <p className="text-lg font-semibold text-purple-700">{fetched.contest_rating}</p>
                      </div>
                    )}
                    {fetched.active_days != null && (
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-500">Active Days</p>
                        <p className="text-lg font-semibold text-blue-700">{fetched.active_days}</p>
                      </div>
                    )}
                    {fetched.max_streak != null && (
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-500">Max Streak</p>
                        <p className="text-lg font-semibold text-blue-700">{fetched.max_streak}</p>
                      </div>
                    )}
                    {fetched.country && (
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-500">Country</p>
                        <p className="text-lg font-semibold text-gray-800">{fetched.country}</p>
                      </div>
                    )}
                    {fetched.hacker_name && (
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-500">Hacker Name</p>
                        <p className="text-lg font-semibold text-gray-800">{fetched.hacker_name}</p>
                      </div>
                    )}
                    {parseDisplayList(fetched.badges).length > 0 && (
                      <div className="bg-white p-2 rounded border border-blue-100 md:col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Badges</p>
                        <div className="flex flex-wrap gap-1">
                          {parseDisplayList(fetched.badges).map((badge, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {parseDisplayList(fetched.languages).length > 0 && (
                      <div className="bg-white p-2 rounded border border-blue-100 md:col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Languages</p>
                        <div className="flex flex-wrap gap-1">
                          {parseDisplayList(fetched.languages).map((lang, idx) => (
                            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {renderPlatformSpecificDetails(fetched, form.platform)}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={
                  saving || (
                    !editId && !hasFetched && !(form.platform === 'HackerRank' && Array.isArray(hrLanguages) && hrLanguages.length > 0)
                  )
                }
              >
                {saving ? 'Saving...' : editId ? 'Update Profile' : 'Save Profile'}
              </button>
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>

            {!editId && !hasFetched && form.platform !== 'HackerRank' && (
              <p className="text-xs text-gray-500 text-center">
                👉 Enter Profile URL or Username, then click "Fetch Profile Data" to automatically retrieve your profile information
              </p>
            )}
          </form>
        </div>
      )}

      {analytics && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <h2 className="section-title">Coding Summary</h2>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {[
                { label: 'Total Problems', value: analytics.totalProblemsSolved },
                { label: 'Highest Rating', value: analytics.highestRating || 'N/A' },
                { label: 'Current Rating', value: analytics.currentRating || 'N/A' },
                { label: 'Avg Coding Score', value: analytics.avgCodingScore !== null ? analytics.avgCodingScore : 'N/A' },
                { label: 'Best Coding Score', value: analytics.bestCodingScore !== null ? analytics.bestCodingScore : 'N/A' },
                {
                  label: 'Consistency',
                  value: `${analytics.consistencyScore}% ${analytics.consistencyCategory || ''}`,
                },
                { label: 'Active Platforms', value: analytics.activePlatforms || 0 },
                { label: 'Best Platform', value: analytics.bestPlatform || 'N/A' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl bg-gray-50 p-4 border border-gray-100"
                >
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="section-title">Platform Comparison</h2>
            {Array.isArray(analytics?.platformComparison) && analytics.platformComparison.length === 0 ? (
              <p className="text-sm text-gray-500 mt-4">No platform data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={analytics?.platformComparison || []}
                  margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="platform" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="rating" name="Rating" fill="#2563eb" />
                  <Bar dataKey="coding_score" name="Coding Score" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {analytics && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="section-title">Rating Trend</h2>
            {Array.isArray(analytics?.ratingTrend) && analytics.ratingTrend.length === 0 ? (
              <p className="text-sm text-gray-500 mt-4">No rating history available yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={analytics?.ratingTrend || []}
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="rating"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-5">
            <h2 className="section-title">Problems Solved Trend</h2>
            {Array.isArray(analytics?.problemsTrend) && analytics.problemsTrend.length === 0 ? (
              <p className="text-sm text-gray-500 mt-4">No activity history available yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={analytics?.problemsTrend || []}
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="problems_solved"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {recentQuestions.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title">Recent Solved Questions</h2>
          <div className="space-y-3 mt-4">
            {recentQuestions.map((question, index) => (
              <div
                key={`${question.platform}-${index}`}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
                  <span>{question.platform}</span>
                  <span>{question.difficulty || 'N/A'}</span>
                </div>
                <a
                  href={question.question_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block text-blue-600 hover:underline font-medium"
                >
                  {question.question_name || 'Unnamed question'}
                </a>
                <p className="mt-1 text-xs text-gray-500">
                  Solved on: {question.date_solved ? question.date_solved.slice(0, 10) : 'Unknown'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">No coding profiles yet.</div>
      ) : (
        <div className="grid gap-4">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3 className="font-semibold text-gray-800">{p.platform}</h3>
                {p.username && <p className="text-sm text-gray-600">@{p.username}</p>}
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-500">
                  {p.platform !== 'LeetCode' && p.rating != null && (
                    <span>
                      Rating: <strong>{p.rating}</strong>
                    </span>
                  )}
                  {p.coding_score != null && (
                    <span>
                      Smart Score: <strong>{p.coding_score}</strong>
                    </span>
                  )}
                  {p.activity_status && (
                    <span>
                      Status: <strong>{p.activity_status}</strong>
                    </span>
                  )}
                  {p.current_streak != null && (
                    <span>
                      Streak: <strong>{p.current_streak}</strong>
                    </span>
                  )}
                  {p.platform !== 'LeetCode' && p.max_rating != null && (
                    <span>
                      Max Rating: <strong>{p.max_rating}</strong>
                    </span>
                  )}
                  {p.problems_solved != null && (
                    <span>
                      Solved: <strong>{p.problems_solved}</strong>
                    </span>
                  )}
                  {p.global_rank != null && (
                    <span>
                      Global Rank: <strong>{p.global_rank}</strong>
                    </span>
                  )}
                  {p.country_rank != null && (
                    <span>
                      Country Rank: <strong>{p.country_rank}</strong>
                    </span>
                  )}
                  {p.stars_badges != null && p.stars_badges !== '' && (
                    <span>
                      Badges: <strong>{p.stars_badges}</strong>
                    </span>
                  )}
                  <span className={`text-xs font-semibold ${p.data_verification_status === 'verified' ? 'text-green-700' : 'text-yellow-700'}`}>
                    {p.data_verification_status === 'verified'
                      ? 'Verified Data'
                      : p.data_verification_status === 'verified_url_only'
                      ? 'URL-only Verified'
                      : 'Estimated Data'}
                  </span>
                </div>
                {p.profile_url && (
                  <a
                    href={p.profile_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                  >
                    View Profile →
                  </a>
                )}
                {renderPlatformSpecificDetails(p, p.platform)}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 text-sm">
                  Edit
                </button>
                <button
                  onClick={() => handleSyncProfile(p.id)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  Sync
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CodingProfiles;

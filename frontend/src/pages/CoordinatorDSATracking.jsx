import React, { useEffect, useMemo, useState } from 'react';
import { FiArrowDown, FiArrowUp, FiEye, FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { normalizeCollegeValue, normalizeYearValue } from '../utils/coordinatorFilters';
import LoadingCard from '../components/coding/LoadingCard';
import ErrorCard from '../components/coding/ErrorCard';

const platforms = [
  {
    value: 'leetcode',
    label: 'LeetCode',
    description: 'Track algorithmic problem solving, rankings, and solved counts.',
    accent: 'from-orange-400 to-amber-400',
    metric: 'Problems Solved',
  },
  {
    value: 'codechef',
    label: 'CodeChef',
    description: 'Track contest ratings, practice progress, and profile health.',
    accent: 'from-blue-600 to-cyan-500',
    metric: 'Rating',
  },
  {
    value: 'hackerrank',
    label: 'HackerRank',
    description: 'Track coding score, streaks, and verified learning progress.',
    accent: 'from-emerald-500 to-teal-500',
    metric: 'Coding Score',
  },
];

const colleges = ['All', 'Vasavi', 'CBIT', 'KMIT', 'Vardhaman', 'Narayanamma', 'BVRIT', 'IIIT Hyderabad', 'Other'];
const years = ['All', '1st Year', '2nd Year', '3rd Year', '4th Year'];
const sortOptions = [
  { key: 'codingScore', label: 'Coding Score' },
  { key: 'rating', label: 'Rating' },
  { key: 'problemsSolved', label: 'Problems Solved' },
  { key: 'currentStreak', label: 'Current Streak' },
  { key: 'lastSnapshot', label: 'Last Sync' },
];

const formatDate = (value) => {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(value);
  }
};

const buildSortValue = (row, key) => {
  if (key === 'lastSnapshot') {
    return row.lastSnapshot ? new Date(row.lastSnapshot).getTime() : 0;
  }
  const value = row[key];
  if (value === null || value === undefined || value === '') return Number.NEGATIVE_INFINITY;
  return typeof value === 'string' ? Number(value.replace(/[^0-9.-]/g, '')) || 0 : Number(value);
};

const CoordinatorDSATracking = () => {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState('leetcode');
  const [college, setCollege] = useState('All');
  const [year, setYear] = useState('All');
  const [search, setSearch] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [sortKey, setSortKey] = useState('codingScore');
  const [sortDirection, setSortDirection] = useState('desc');

  const activePlatform = platforms.find((item) => item.value === platform) || platforms[0];

  const loadLeaderboard = async () => {
    if (!platform) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/coordinator/coding-tracking', {
        params: {
          platform,
          window: 'overall',
          college: college === 'All' ? 'all' : college,
          year: year === 'All' ? 'all' : year,
          search: search.trim(),
        },
      });

      const rows = (response.data.data?.leaderboard || []).map((row, index) => ({
        id: `${row.studentId}-${row.username || index}`,
        studentId: row.studentId,
        fullName: row.fullName || 'Unknown',
        mssid: row.mssid || 'N/A',
        username: row.username || 'N/A',
        college: normalizeCollegeValue(row.college || ''),
        year: normalizeYearValue(row.year || ''),
        rating: row.rating != null ? Number(row.rating) : null,
        problemsSolved: row.problemsSolved != null ? Number(row.problemsSolved) : null,
        codingScore: row.codingScore != null ? Number(row.codingScore) : null,
        currentStreak: row.current_streak != null ? Number(row.current_streak) : null,
        lastSnapshot: row.last_snapshot || null,
        platform: row.platform || platform,
        rank: index + 1,
      }));

      setLeaderboard(rows);
      setSelectedStudent(null);
    } catch (err) {
      console.error('DSA Tracking load failed:', err);
      setError('Unable to load DSA tracking students. Please refresh the page.');
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  const sortedRows = useMemo(() => {
    if (!leaderboard.length) return [];
    const rows = [...leaderboard];
    rows.sort((a, b) => {
      const valueA = buildSortValue(a, sortKey);
      const valueB = buildSortValue(b, sortKey);
      if (valueA === valueB) {
        return a.fullName.localeCompare(b.fullName);
      }
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    });
    return rows;
  }, [leaderboard, sortKey, sortDirection]);

  const summary = useMemo(() => {
    if (!leaderboard.length) return { total: 0, avgRating: 0, avgSolved: 0, avgScore: 0 };
    const total = leaderboard.length;
    const avgRating = leaderboard.reduce((sum, row) => sum + (row.rating || 0), 0) / total;
    const avgSolved = leaderboard.reduce((sum, row) => sum + (row.problemsSolved || 0), 0) / total;
    const avgScore = leaderboard.reduce((sum, row) => sum + (row.codingScore || 0), 0) / total;
    return { total, avgRating, avgSolved, avgScore };
  }, [leaderboard]);

  const handleSortChange = (key) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'));
      return;
    }
    setSortKey(key);
    setSortDirection('desc');
  };

  const handleLoadDetails = (row) => {
    setSelectedStudent(row);
    setDetailError(null);
    navigate(`/coordinator/analytics/student/${row.studentId}/${platform}`);
  };

  const sortedSortLabel = sortOptions.find((option) => option.key === sortKey)?.label || 'Sort';

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Coordinator DSA Tracking</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Track DSA progress across LeetCode, CodeChef and HackerRank.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">View the latest coding leaderboard, filter by college and year, and open individual student coding profiles for full DSA insight.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/coordinator/dashboard')}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          ← Back to dashboard
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {platforms.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPlatform(item.value)}
                className={`rounded-[28px] border p-5 text-left transition ${platform === item.value ? 'border-slate-300 bg-slate-100 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'} ${item.accent}`}
                style={{ backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0))` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{item.label}</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">{item.metric}</h2>
                  </div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-white/80 text-xl shadow-sm">{item.label[0]}</span>
                </div>
                <p className="mt-4 text-sm text-slate-600">{item.description}</p>
              </button>
            ))}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Filters</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Refine student list</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">College</label>
                  <select value={college} onChange={(e) => setCollege(e.target.value)} className="input-field w-full">
                    {colleges.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
                  <select value={year} onChange={(e) => setYear(e.target.value)} className="input-field w-full">
                    {years.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                  <div className="relative">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Student name, MSS ID, username"
                      className="input-field w-full pr-10"
                    />
                    <FiSearch className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">Select a platform and apply filters to pull the latest DSA standings from the existing coordinator tracking API.</p>
              <button
                type="button"
                onClick={loadLeaderboard}
                className="btn-primary rounded-2xl px-6 py-3"
              >
                Refresh list
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Students</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.total}</p>
              <p className="mt-2 text-sm text-slate-500">Total students with latest {activePlatform.label} data</p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Average rating</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.avgRating ? summary.avgRating.toFixed(0) : 'N/A'}</p>
              <p className="mt-2 text-sm text-slate-500">Based on platform rating values</p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Average problems</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.avgSolved ? summary.avgSolved.toFixed(0) : 'N/A'}</p>
              <p className="mt-2 text-sm text-slate-500">Average solved count for selected platform</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Selected Platform</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{activePlatform.label}</h2>
            <p className="mt-4 text-sm text-slate-600">Use the platform cards and filters to focus on LeetCode, CodeChef, or HackerRank student progress.</p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Sorting</p>
            <div className="mt-4 space-y-3">
              {sortOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleSortChange(option.key)}
                  className={`flex w-full items-center justify-between rounded-3xl border px-4 py-4 text-left text-sm transition ${sortKey === option.key ? 'border-blue-300 bg-blue-50 text-slate-900' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'}`}
                >
                  <span>{option.label}</span>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-800 shadow-sm">
                    {sortKey === option.key ? (sortDirection === 'desc' ? <FiArrowDown className="h-4 w-4" /> : <FiArrowUp className="h-4 w-4" />) : '+'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Details</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Student profile view</h2>
            <p className="mt-4 text-sm text-slate-600">Select a row to open platform-specific coding profile details from the existing coding profile API.</p>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Student leaderboard</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">{activePlatform.label} student list</h2>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">Sorted by {sortedSortLabel} · {sortDirection === 'desc' ? 'Descending' : 'Ascending'}</div>
        </div>

        {error ? (
          <div className="mt-6 rounded-3xl bg-rose-50 p-5 text-sm text-rose-700">{error}</div>
        ) : null}

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">MSS ID</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">College</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Problems Solved</th>
                <th className="px-4 py-3">Last Sync</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">Loading student data…</td>
                </tr>
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">No students match your filters. Try adjusting the college, year, or search query.</td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-4 font-semibold text-slate-900">{row.rank}</td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{row.fullName}</div>
                      <div className="text-xs text-slate-500">{row.platform}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{row.mssid}</td>
                    <td className="px-4 py-4 text-slate-600">{row.username}</td>
                    <td className="px-4 py-4 text-slate-600">{row.college || 'N/A'}</td>
                    <td className="px-4 py-4 text-slate-600">{row.year || 'N/A'}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900">{row.rating ?? 'N/A'}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900">{row.problemsSolved ?? 'N/A'}</td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(row.lastSnapshot)}</td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => handleLoadDetails(row)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <FiEye className="h-3.5 w-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Profile preview</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Student detail panel</h2>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">Platform: {activePlatform.label}</div>
          </div>

          {detailError ? (
            <div className="mt-6 rounded-3xl bg-rose-50 p-5 text-sm text-rose-700">{detailError}</div>
          ) : null}

          {selectedStudent ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Selected student</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{selectedStudent.fullName}</p>
                <p className="text-sm text-slate-600">{selectedStudent.mssid} • {selectedStudent.college || 'Unknown college'} • {selectedStudent.year || 'Unknown year'}</p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Full platform analytics</p>
                <p className="mt-2">View the same rich student analytics experience used in the student dashboard, now available for coordinator review.</p>
                <button
                  type="button"
                  onClick={() => navigate(`/coordinator/analytics/student/${selectedStudent.studentId}/${platform}`)}
                  className="mt-4 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  View full {activePlatform.label} profile
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Select a student from the leaderboard to load full platform analytics.
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Why DSA Tracking</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Coordinator intelligence</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>• Reuses the existing coordinator coding tracking API for live DSA insights.</p>
            <p>• Filters by college and year so you can compare progress across batches.</p>
            <p>• Student details are loaded from the existing coding profile endpoint for platform-specific insights.</p>
            <p>• No schema or backend changes are required to access the latest data.</p>
          </div>
          <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Active platform:</p>
            <p className="mt-2 text-sm">{activePlatform.label}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinatorDSATracking;

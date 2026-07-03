import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { normalizeCollegeValue, normalizeYearValue } from '../utils/coordinatorFilters';

const platforms = [
  { value: 'leetcode', label: 'LeetCode' },
  { value: 'codechef', label: 'CodeChef' },
];
const colleges = ['All', 'Vasavi', 'CBIT', 'KMIT', 'Vardhaman', 'Narayanamma', 'BVRIT', 'IIIT Hyderabad', 'Other'];
const years = ['All', '1st Year', '2nd Year', '3rd Year', '4th Year'];

const metricLabel = (platform) => (platform === 'leetcode' ? 'Problems Solved' : 'Rating');

const CoordinatorCodingTracking = () => {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState('leetcode');
  const [college, setCollege] = useState('All');
  const [year, setYear] = useState('All');
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [studentMap, setStudentMap] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [topSet, setTopSet] = useState('');
  const [activeScope, setActiveScope] = useState('custom');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const res = await api.get('/coordinator/students');
        const studentList = res.data.data || [];
        setStudents(studentList);
        const map = {};
        studentList.forEach((s) => {
          if (s.id) {
            map[s.id] = s;
          }
          if (s.mssid) {
            map[s.mssid] = s;
          }
        });
        setStudentMap(map);
      } catch (err) {
        console.error('Failed to load coordinator students:', err);
      }
    };
    loadStudents();
  }, []);

  const loadLeaderboard = async ({ selectedPlatform = platform, windowKey = 'overall', showTopSet = false } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const scope = showTopSet ? windowKey : 'custom';
      setActiveScope(scope);
      setTopSet(showTopSet ? windowKey : '');

      const res = await api.get('/coordinator/coding-tracking', {
        params: {
          platform: selectedPlatform,
          window: showTopSet ? windowKey : 'overall',
          college: college === 'All' ? 'all' : college,
          year: year === 'All' ? 'all' : year,
          search,
        },
      });

      const rows = (res.data.data?.leaderboard || []).map((row, index) => ({
        ...row,
        rank: index + 1,
        college: normalizeCollegeValue(row.college || studentMap[row.studentId]?.college_name || studentMap[row.mssid]?.college_name || 'Unknown'),
        year: normalizeYearValue(row.year || studentMap[row.studentId]?.year_of_study || studentMap[row.mssid]?.year_of_study || 'Unknown'),
      }));

      setLeaderboard(rows);
    } catch (err) {
      console.error('Failed to load coding leaderboard:', err);
      setLeaderboard([]);
      setError('Unable to load leaderboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeaderboard = useMemo(() => {
    if (!leaderboard.length) return [];

    return leaderboard.filter((row) => {
      const normalizedCollege = normalizeCollegeValue(row.college || '');
      const normalizedYear = normalizeYearValue(row.year || '');
      const collegeMatch = college === 'All' || !college || normalizedCollege === normalizeCollegeValue(college);
      const yearMatch = year === 'All' || !year || normalizedYear === normalizeYearValue(year);
      const searchTerm = search.trim().toLowerCase();
      const searchMatch = searchTerm
        ? [row.fullName, row.mssid, row.username, normalizedCollege].some((value) => String(value || '').toLowerCase().includes(searchTerm))
        : true;
      return collegeMatch && yearMatch && searchMatch;
    });
  }, [leaderboard, college, year, search]);

  const sortedLeaderboard = useMemo(() => {
    if (!filteredLeaderboard.length) return [];

    return [...filteredLeaderboard].sort((a, b) => {
      const ratingA = Number(a.rating || 0);
      const ratingB = Number(b.rating || 0);
      if (ratingB !== ratingA) return ratingB - ratingA;
      if (platform === 'leetcode') {
        const solvedA = Number(a.problemsSolved || 0);
        const solvedB = Number(b.problemsSolved || 0);
        if (solvedB !== solvedA) return solvedB - solvedA;
      }
      return String(a.fullName || a.mssid || '').localeCompare(String(b.fullName || b.mssid || ''));
    });
  }, [filteredLeaderboard, platform]);

  const handleTopCardClick = async (windowKey) => {
    if (!platform) {
      setError('Select a platform first to view top performers.');
      return;
    }
    await loadLeaderboard({ selectedPlatform: platform, windowKey, showTopSet: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Coding Tracking</h1>
          <p className="text-sm text-slate-500 max-w-2xl">Review coding performance, leaderboard standings, and top performer trends across platforms.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/coordinator/dashboard')}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          ← Back to dashboard
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Filters</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Refine leaderboard results</h2>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">Pro</div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Coding Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">Select Platform</option>
                  {platforms.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">College</label>
                <select
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="input-field w-full"
                >
                  {colleges.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="input-field w-full"
                >
                  {years.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Leaderboard ready?</p>
                <p>Choose platform, college and year then click View Leaderboard.</p>
              </div>
              <button
                type="button"
                disabled={!platform}
                onClick={() => loadLeaderboard({ selectedPlatform: platform, windowKey: 'overall', showTopSet: false })}
                className="btn-primary rounded-2xl px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                View Leaderboard
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Top Performers</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Today's & Weekly</h2>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase text-blue-700">Real data</span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleTopCardClick('today')}
                className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-blue-300 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">🏆 Today's Top Performers</p>
                    <p className="mt-2 text-sm text-slate-500">Sorted by the latest coding snapshot.</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500 text-white">▶</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTopCardClick('7d')}
                className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-blue-300 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">📈 Weekly Top Performers</p>
                    <p className="mt-2 text-sm text-slate-500">Sorted by weekly coding advancement.</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500 text-white">▶</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white shadow-lg">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Quick Snapshot</p>
            <h2 className="mt-3 text-2xl font-semibold">Performance Insights</h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">Use the tracker to compare platform-specific coding standings and discover the strongest coders within each college and year.</p>

            <div className="mt-6 grid gap-3">
              <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-sm text-slate-300">Selected Platform</p>
                <p className="mt-1 text-lg font-semibold text-white">{platform ? platforms.find((item) => item.value === platform)?.label : 'None selected'}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-sm text-slate-300">Selected College</p>
                <p className="mt-1 text-lg font-semibold text-white">{college === 'All' ? 'All colleges' : college}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-sm text-slate-300">Selected Year</p>
                <p className="mt-1 text-lg font-semibold text-white">{year === 'All' ? 'All years' : year}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Data quality</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Leaderboard sources</h2>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>• Coding snapshots are pulled from the existing coordinator tracking analytics.</p>
              <p>• College and year filters are applied using the coordinator student dataset.</p>
              <p>• No backend logic changes were made to support this page.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Leaderboard</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {activeScope === 'today' ? "Today's Top Performers" : activeScope === '7d' ? 'Weekly Top Performers' : 'Filtered Leaderboard'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, MSS ID, username..."
              className="input-field rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={() => setSearch('')}
              className="btn-secondary rounded-2xl px-4 py-3 text-sm"
            >
              Clear
            </button>
          </div>
        </div>

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
                {platform === 'leetcode' && <th className="px-4 py-3">Problems Solved</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={platform === 'leetcode' ? 8 : 7} className="px-4 py-8 text-center text-slate-500">Loading leaderboard…</td>
                </tr>
              ) : sortedLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={platform === 'leetcode' ? 8 : 7} className="px-4 py-8 text-center text-slate-500">No leaderboard rows found. Select a platform, college and year, then click View Leaderboard.</td>
                </tr>
              ) : (
                sortedLeaderboard.map((row) => (
                  <tr key={`${row.studentId}-${row.username || row.rank}`} className="border-b border-slate-100 transition hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">{row.rank}</td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{row.fullName || 'Unknown Student'}</div>
                      <div className="text-xs text-slate-500">{row.platform}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{row.mssid}</td>
                    <td className="px-4 py-4 text-slate-600">{row.username || 'N/A'}</td>
                    <td className="px-4 py-4 text-slate-600">{row.college}</td>
                    <td className="px-4 py-4 text-slate-600">{row.year}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900">{row.rating ?? 'N/A'}</td>
                    {platform === 'leetcode' && (
                      <td className="px-4 py-4 font-semibold text-slate-900">{row.problemsSolved != null ? row.problemsSolved : 'N/A'}</td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CoordinatorCodingTracking;

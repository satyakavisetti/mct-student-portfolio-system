import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ARIA_DESCRIPTIONS = {
  completed: 'Completed 20 or more volunteering hours',
  below: 'Below required volunteering hours',
  participated: 'Total students with volunteering participation',
  hours: 'Total volunteering hours recorded',
};

const formatStudentName = (student) => student.full_name || student.student_name || student.mssid || 'Unknown Student';
const formatMssid = (student) => student.mssid || student.student_id || '—';
const formatCollege = (student) => student.college_name || student.college || 'Unknown College';
const formatYear = (student) => student.year_of_study ? `Year ${student.year_of_study}` : student.year || 'Unknown';
const formatBatch = (student) => student.mss_batch || student.batch || '—';
const formatHours = (hours) => (hours != null ? Number(hours).toFixed(1) : '0.0');
const getCompletionLabel = (hours) => {
  const value = Number(hours || 0);
  if (value >= 20) return { label: 'Completed', tone: 'green' };
  if (value > 0) return { label: 'Pending', tone: 'orange' };
  return { label: 'Pending', tone: 'slate' };
};

const SummaryCard = ({ icon, label, value, description, color }) => (
  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
    <div className="flex items-start justify-between gap-4">
      <div className="rounded-3xl px-4 py-3 text-2xl" style={{ backgroundColor: color?.bg, color: color?.fg }}>
        {icon}
      </div>
      <div className="text-right">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      </div>
    </div>
    {description && <p className="mt-4 text-sm text-slate-500">{description}</p>}
  </div>
);

const SectionHeading = ({ title, subtitle }) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  </div>
);

const TableLabel = ({ children }) => <span className="text-sm font-semibold text-slate-900">{children}</span>;

const CoordinatorVolunteeringTracking = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ college: '', year: '', batch: '', status: 'all' });
  const [leaderSearch, setLeaderSearch] = useState('');
  const [selectedPage, setSelectedPage] = useState(1);
  const [searchMssid, setSearchMssid] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchStatus, setSearchStatus] = useState('');
  const [detailsStudent, setDetailsStudent] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/coordinator/students');
        setStudents(res.data.data || []);
      } catch (err) {
        console.error('Failed to load coordinator students:', err);
        setError('Unable to load students. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, []);

  const studentOptions = useMemo(() => {
    const colleges = new Set();
    const years = new Set();
    const batches = new Set();
    students.forEach((student) => {
      if (student.college_name) colleges.add(student.college_name);
      if (student.college) colleges.add(student.college);
      const yearValue = student.year_of_study || student.year;
      if (yearValue) years.add(`Year ${yearValue}`);
      if (student.mss_batch) batches.add(student.mss_batch);
      if (student.batch) batches.add(student.batch);
    });
    return {
      colleges: Array.from(colleges).sort(),
      years: Array.from(years).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      batches: Array.from(batches).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    };
  }, [students]);

  const volunteeredStudents = useMemo(() => students.filter((student) => Number(student.total_volunteering_hours || 0) > 0), [students]);
  const completedStudents = useMemo(() => students.filter((student) => Number(student.total_volunteering_hours || 0) >= 20), [students]);
  const belowStudents = useMemo(() => students.filter((student) => Number(student.total_volunteering_hours || 0) < 20), [students]);

  const totalHours = useMemo(() => students.reduce((sum, student) => sum + Number(student.total_volunteering_hours || 0), 0), [students]);

  const filteredEligible = useMemo(() => {
    return completedStudents
      .filter((student) => {
        const searchTerm = leaderSearch.trim().toLowerCase();
        const matchesSearch = searchTerm
          ? [formatStudentName(student), formatMssid(student), formatCollege(student)].some((value) => String(value || '').toLowerCase().includes(searchTerm))
          : true;
        const matchesCollege = filters.college ? formatCollege(student) === filters.college : true;
        const matchesYear = filters.year ? formatYear(student) === filters.year : true;
        const matchesBatch = filters.batch ? formatBatch(student) === filters.batch : true;
        const matchesStatus = filters.status === 'all' ? true : filters.status === 'completed';
        return matchesSearch && matchesCollege && matchesYear && matchesBatch && matchesStatus;
      })
      .sort((a, b) => Number(b.total_volunteering_hours || 0) - Number(a.total_volunteering_hours || 0));
  }, [completedStudents, filters, leaderSearch]);

  const filteredBelow = useMemo(() => {
    return belowStudents
      .filter((student) => {
        const searchTerm = leaderSearch.trim().toLowerCase();
        const matchesSearch = searchTerm
          ? [formatStudentName(student), formatMssid(student), formatCollege(student)].some((value) => String(value || '').toLowerCase().includes(searchTerm))
          : true;
        const matchesCollege = filters.college ? formatCollege(student) === filters.college : true;
        const matchesYear = filters.year ? formatYear(student) === filters.year : true;
        const matchesBatch = filters.batch ? formatBatch(student) === filters.batch : true;
        const matchesStatus = filters.status === 'all' ? true : filters.status === 'below';
        return matchesSearch && matchesCollege && matchesYear && matchesBatch && matchesStatus;
      })
      .sort((a, b) => Number(a.total_volunteering_hours || 0) - Number(b.total_volunteering_hours || 0));
  }, [belowStudents, filters, leaderSearch]);

  const visibleEligible = useMemo(() => {
    const start = (selectedPage - 1) * 10;
    return filteredEligible.slice(start, start + 10);
  }, [filteredEligible, selectedPage]);

  const pageCount = Math.max(1, Math.ceil(filteredEligible.length / 10));

  const loadStudentDetails = async (studentId) => {
    if (!studentId) return;
    setDetailsLoading(true);
    try {
      const res = await api.get(`/coordinator/students/${studentId}`);
      setDetailsStudent(res.data.data);
    } catch (err) {
      console.error('Failed to load student details:', err);
      setDetailsStudent(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewDetails = (student) => {
    const id = student.id || student.student_id;
    if (!id) return;
    navigate(`/coordinator/volunteering-tracking/${id}`);
  };

  const handleSearchMssid = async () => {
    if (!searchMssid.trim()) {
      setSearchResult(null);
      setSearchStatus('Please enter a valid MSS ID.');
      return;
    }
    const normalized = searchMssid.trim().toLowerCase();
    const exact = students.find((student) => String(student.mssid || '').toLowerCase() === normalized);
    if (exact) {
      setSearchResult(exact);
      setSearchStatus('Student found in current results.');
      return;
    }

    try {
      const res = await api.get('/coordinator/students', { params: { search: normalized } });
      const nextStudent = (res.data.data || []).find((student) => String(student.mssid || '').toLowerCase() === normalized) ?? (res.data.data || [])[0];
      if (nextStudent) {
        setSearchResult(nextStudent);
        setSearchStatus('Student found.');
      } else {
        setSearchResult(null);
        setSearchStatus('No student found for that MSS ID.');
      }
    } catch (err) {
      console.error('Student search failed:', err);
      setSearchResult(null);
      setSearchStatus('Search failed. Please try again.');
    }
  };

  const detailActivities = useMemo(() => detailsStudent?.volunteering || [], [detailsStudent]);
  const detailTotalHours = useMemo(() => detailActivities.reduce((sum, activity) => sum + Number(activity.hours || 0), 0), [detailActivities]);
  const detailCompletedCount = useMemo(() => detailActivities.filter((activity) => String(activity.status || '').toLowerCase() === 'completed').length, [detailActivities]);
  const detailPendingCount = useMemo(() => detailActivities.filter((activity) => String(activity.status || '').toLowerCase() === 'pending').length, [detailActivities]);
  const detailRejectedCount = useMemo(() => detailActivities.filter((activity) => ['rejected', 'declined'].includes(String(activity.status || '').toLowerCase())).length, [detailActivities]);
  const detailLatestActivity = useMemo(() => {
    if (!detailActivities.length) return null;
    return [...detailActivities].sort((a, b) => new Date(b.start_date || b.updated_at || b.created_at || 0) - new Date(a.start_date || a.updated_at || a.created_at || 0))[0];
  }, [detailActivities]);
  const detailCompletionPercent = Math.min(100, Math.round((detailTotalHours / 20) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Volunteering Tracking</h1>
          <p className="text-sm text-slate-500 max-w-2xl">Track volunteering hours, eligibility, and complete activity history from the coordinator dashboard.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/coordinator/dashboard')}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          ← Back to dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon="🟢"
          label="Completed 20+ Hours"
          value={completedStudents.length}
          description="Students who are eligible and completed the volunteering threshold."
          color={{ bg: '#d1fae5', fg: '#065f46' }}
        />
        <SummaryCard
          icon="🟠"
          label="Below 20 Hours"
          value={belowStudents.length}
          description="Students who still need more hours to reach the minimum requirement."
          color={{ bg: '#ffedd5', fg: '#9a3412' }}
        />
        <SummaryCard
          icon="🔵"
          label="Total Participated"
          value={volunteeredStudents.length}
          description="Students with at least one volunteering activity recorded."
          color={{ bg: '#dbeafe', fg: '#1e3a8a' }}
        />
        <SummaryCard
          icon="🟣"
          label="Total Volunteering Hours"
          value={formatHours(totalHours)}
          description="Overall accumulated hours across all student volunteering records."
          color={{ bg: '#ede9fe', fg: '#5b21b6' }}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeading title="Students Eligible (20+ Hours)" subtitle="Highest volunteering hours displayed first." />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-slate-700">College</label>
              <select
                value={filters.college}
                onChange={(e) => { setFilters((prev) => ({ ...prev, college: e.target.value })); setSelectedPage(1); }}
                className="input-field mt-2 w-full"
              >
                <option value="">All colleges</option>
                {studentOptions.colleges.map((college) => (
                  <option key={college} value={college}>{college}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Year</label>
              <select
                value={filters.year}
                onChange={(e) => { setFilters((prev) => ({ ...prev, year: e.target.value })); setSelectedPage(1); }}
                className="input-field mt-2 w-full"
              >
                <option value="">All years</option>
                {studentOptions.years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Batch</label>
              <select
                value={filters.batch}
                onChange={(e) => { setFilters((prev) => ({ ...prev, batch: e.target.value })); setSelectedPage(1); }}
                className="input-field mt-2 w-full"
              >
                <option value="">All batches</option>
                {studentOptions.batches.map((batch) => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Search</label>
              <input
                value={leaderSearch}
                onChange={(e) => { setLeaderSearch(e.target.value); setSelectedPage(1); }}
                placeholder="Name, MSS ID, college"
                className="input-field mt-2 w-full"
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-3 py-3">Rank</th>
                  <th className="px-3 py-3">Student Name</th>
                  <th className="px-3 py-3">MSS ID</th>
                  <th className="px-3 py-3">College</th>
                  <th className="px-3 py-3">Year</th>
                  <th className="px-3 py-3">Batch</th>
                  <th className="px-3 py-3">Total Hours</th>
                  <th className="px-3 py-3">View Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleEligible.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-3 py-6 text-center text-slate-500">No eligible students match the current filters.</td>
                  </tr>
                ) : visibleEligible.map((student, index) => (
                  <tr key={student.id || student.student_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 font-semibold text-slate-900">{(selectedPage - 1) * 10 + index + 1}</td>
                    <td className="px-3 py-3 text-slate-700">{formatStudentName(student)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatMssid(student)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatCollege(student)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatYear(student)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatBatch(student)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatHours(student.total_volunteering_hours)}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(student)}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-500">
            <p>{filteredEligible.length} student{filteredEligible.length !== 1 ? 's' : ''} found</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedPage((prev) => Math.max(prev - 1, 1))}
                disabled={selectedPage === 1}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span>Page {selectedPage} of {pageCount}</span>
              <button
                type="button"
                onClick={() => setSelectedPage((prev) => Math.min(prev + 1, pageCount))}
                disabled={selectedPage === pageCount}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <SectionHeading title="Filters" subtitle="Narrow the volunteer roster instantly." />
          <div className="mt-6 space-y-4">
            <div>
              <TableLabel>Completion Status</TableLabel>
              <select
                value={filters.status}
                onChange={(e) => { setFilters((prev) => ({ ...prev, status: e.target.value })); setSelectedPage(1); }}
                className="input-field mt-2 w-full"
              >
                <option value="all">All</option>
                <option value="completed">Completed 20+</option>
                <option value="below">Below 20</option>
              </select>
            </div>
            <div>
              <TableLabel>Live Search</TableLabel>
              <input
                value={leaderSearch}
                onChange={(e) => { setLeaderSearch(e.target.value); setSelectedPage(1); }}
                placeholder="Search by name or MSS ID"
                className="input-field mt-2 w-full"
              />
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Eligible Snapshot</p>
              <p className="mt-3 text-sm text-slate-600">{completedStudents.length} students have already crossed the 20 hour threshold.</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">Top student: {completedStudents[0] ? formatStudentName(completedStudents[0]) : 'N/A'}</div>
                <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">Average hours: {completedStudents.length ? formatHours(completedStudents.reduce((sum, s) => sum + Number(s.total_volunteering_hours || 0), 0) / completedStudents.length) : '0.0'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <SectionHeading title="Students Below Required Hours" subtitle="Review students who need additional volunteering support." />
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-[0.2em]">
              <tr>
                <th className="px-3 py-3">Student Name</th>
                <th className="px-3 py-3">MSS ID</th>
                <th className="px-3 py-3">College</th>
                <th className="px-3 py-3">Year</th>
                <th className="px-3 py-3">Batch</th>
                <th className="px-3 py-3">Current Hours</th>
                <th className="px-3 py-3">Remaining Hours</th>
                <th className="px-3 py-3">View Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBelow.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-3 py-6 text-center text-slate-500">No students currently below 20 hours.</td>
                </tr>
              ) : filteredBelow.map((student) => {
                const currentHours = Number(student.total_volunteering_hours || 0);
                const remaining = Math.max(0, 20 - currentHours);
                return (
                  <tr key={student.id || student.student_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-slate-700">{formatStudentName(student)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatMssid(student)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatCollege(student)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatYear(student)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatBatch(student)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatHours(currentHours)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatHours(remaining)}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(student)}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <SectionHeading title="Search Student" subtitle="Enter MSS ID to quickly locate a student profile." />
        <div className="mt-6 grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
          <input
            value={searchMssid}
            onChange={(e) => setSearchMssid(e.target.value)}
            placeholder="MSS2022096"
            className="input-field w-full"
          />
          <button
            type="button"
            onClick={handleSearchMssid}
            className="btn-primary w-full"
          >
            Search
          </button>
        </div>
        {searchStatus && <p className="mt-3 text-sm text-slate-500">{searchStatus}</p>}

        {searchResult && (
          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold text-slate-500">{formatStudentName(searchResult)}</p>
                <p className="mt-1 text-sm text-slate-500">{formatMssid(searchResult)} • {formatCollege(searchResult)}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">College</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{formatCollege(searchResult)}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Year</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{formatYear(searchResult)}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Batch</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{formatBatch(searchResult)}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Total Hours</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{formatHours(searchResult.total_volunteering_hours)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Progress</p>
                <div className="mx-auto mt-6 flex h-36 w-36 items-center justify-center rounded-full border-8 border-slate-200 bg-white">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-violet-600 text-white text-2xl font-semibold">
                    {Math.min(100, Math.round((Number(searchResult.total_volunteering_hours || 0) / 20) * 100))}%
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-600">{formatHours(searchResult.total_volunteering_hours)} / 20 Hours</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{getCompletionLabel(searchResult.total_volunteering_hours).label}</p>
                <button
                  type="button"
                  onClick={() => handleViewDetails(searchResult)}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {detailsStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 px-4 py-10">
          <div className="mx-auto w-full max-w-6xl rounded-[32px] bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Volunteering Details</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{formatStudentName(detailsStudent)}</h2>
                <p className="text-sm text-slate-500">{formatMssid(detailsStudent)} • {formatCollege(detailsStudent)}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsStudent(null)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {detailsLoading ? (
              <div className="mt-10 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Total Hours</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{formatHours(detailTotalHours)}</p>
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Completed Activities</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{detailCompletedCount}</p>
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Pending Activities</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{detailPendingCount}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Rejected Activities</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{detailRejectedCount}</p>
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Latest Activity</p>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{detailLatestActivity ? detailLatestActivity.title : 'No activity available'}</p>
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Completion %</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{Number.isNaN(detailCompletionPercent) ? '0%' : `${detailCompletionPercent}%`}</p>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {detailActivities.length === 0 ? (
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 text-slate-500">No volunteering records available.</div>
                  ) : detailActivities.map((activity) => (
                    <div key={activity.id || `${activity.title}-${activity.start_date}`} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-900">{activity.title}</p>
                          <p className="text-sm text-slate-500">{activity.organization}</p>
                        </div>
                        <span className="rounded-2xl bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-700">{activity.category || 'General'}</span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Date</p>
                          <p className="mt-1 text-sm text-slate-700">{activity.start_date ? new Date(activity.start_date).toLocaleDateString() : 'N/A'}{activity.end_date ? ` – ${new Date(activity.end_date).toLocaleDateString()}` : ''}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Duration</p>
                          <p className="mt-1 text-sm text-slate-700">{activity.start_date && activity.end_date ? 'Multi-day' : 'Single day'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Hours Earned</p>
                          <p className="mt-1 text-sm text-slate-700">{formatHours(activity.hours)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Certificate</p>
                          <p className="mt-1 text-sm text-slate-700">{activity.certificate_url ? 'Available' : 'Not available'}</p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2 text-sm text-slate-700">
                        <div>
                          <span className="font-semibold text-slate-900">Status:</span> {activity.status || 'N/A'}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900">Faculty Approval:</span> {activity.faculty_approval ?? 'N/A'}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900">Coordinator Approval:</span> {activity.coordinator_approval ?? 'N/A'}
                        </div>
                        {activity.remarks && (
                          <div>
                            <span className="font-semibold text-slate-900">Remarks:</span> {activity.remarks}
                          </div>
                        )}
                        {activity.description && <p className="text-sm text-slate-600">{activity.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                {detailActivities.length > 0 && (
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                    <h3 className="text-lg font-semibold text-slate-900">Volunteering Timeline</h3>
                    <div className="mt-6 space-y-6">
                      {detailActivities
                        .slice()
                        .sort((a, b) => new Date(b.start_date || b.updated_at || b.created_at || 0) - new Date(a.start_date || a.updated_at || a.created_at || 0))
                        .map((activity) => (
                          <div key={`timeline-${activity.id || activity.title + activity.start_date}`} className="relative pl-6">
                            <div className="absolute left-0 top-2 h-3 w-3 rounded-full bg-slate-900" />
                            <div className="border-l border-slate-200 pl-6">
                              <p className="text-sm font-semibold text-slate-900">{activity.title}</p>
                              <p className="text-xs text-slate-500">{activity.start_date ? new Date(activity.start_date).toLocaleDateString() : 'Date unavailable'}</p>
                              <p className="mt-2 text-sm text-slate-700">{activity.hours != null ? `${formatHours(activity.hours)} Hours` : 'Hours unavailable'}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/80">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
        </div>
      )}

      {error && (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
};

export default CoordinatorVolunteeringTracking;

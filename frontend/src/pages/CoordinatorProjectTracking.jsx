import React, { useEffect, useMemo, useState } from 'react';
import { FiGithub, FiFolder, FiExternalLink, FiEye, FiStar, FiCircle, FiCheckCircle, FiTrendingUp } from 'react-icons/fi';
import api from '../services/api';

import { normalizeCollegeValue, normalizeYearValue } from '../utils/coordinatorFilters';

const colleges = ['All', 'Vasavi', 'CBIT', 'KMIT', 'Vardhaman', 'Narayanamma', 'BVRIT', 'IIIT Hyderabad', 'Other'];
const years = ['All', '1st Year', '2nd Year', '3rd Year', '4th Year'];
const projectStatuses = ['All', 'Completed', 'Ongoing', 'In Progress'];
const scoreRanges = [
  { label: 'All', value: 'all' },
  { label: '0 - 40', value: '0-40' },
  { label: '41 - 70', value: '41-70' },
  { label: '71 - 100', value: '71-100' },
];

const formatStudentName = (student) => {
  if (!student) return 'Unknown Student';
  return student.full_name || student.student_name || student.mssid || 'Unknown Student';
};
const formatMssid = (student) => {
  if (!student) return '—';
  return student.mssid || student.student_id || '—';
};
const formatCollege = (student) => {
  if (!student) return 'Unknown College';
  return student.college_name || student.college || 'Unknown College';
};
const formatYear = (student) => {
  if (!student) return 'Unknown';
  const rawValue = student.year_of_study || student.year || '';
  return normalizeYearValue(rawValue) || 'Unknown';
};
const formatBatch = (student) => {
  if (!student) return '—';
  return student.mss_batch || student.batch || '—';
};
const formatHours = (value) => (value != null ? Number(value).toFixed(1) : 'N/A');

const getCodingScore = (student) => {
  if (!student) return 'N/A';
  return student.coding_score ?? student.avg_smart_score ?? student.best_smart_score ?? student.overall_coding_score ?? 'N/A';
};

const getPlacementReadiness = (student) => {
  if (!student) return 'N/A';
  return student.placement_readiness_score ?? student.placementReadinessScore ?? student.placement_readiness ?? student.readiness_score ?? 'N/A';
};

const getGithubUsername = (student) => {
  if (!student) return '';

  const candidates = [student, student.student].filter(Boolean);

  const readField = (fieldNames) => {
    for (const candidate of candidates) {
      for (const field of fieldNames) {
        const value = candidate[field];
        if (value) return String(value).trim();
      }
    }
    return '';
  };

  const directUsername = readField(['github_username', 'githubUsername', 'github', 'github_handle', 'githubHandle']);
  if (directUsername) return directUsername;

  const directProfileUrl = readField(['github_profile_url', 'githubProfileUrl', 'github_url', 'githubUrl']);
  if (directProfileUrl) {
    const match = directProfileUrl.match(/github\.com\/([^\/?#\s]+)/i);
    if (match) return match[1];
  }

  const searchFields = [
    student.codingAnalytics?.githubUsername,
    student.codingAnalytics?.githubHandle,
    student.codingAnalytics?.github_username,
    student.codingAnalytics?.github_handle,
    student.student?.codingAnalytics?.githubUsername,
    student.student?.codingAnalytics?.githubHandle,
    student.student?.codingAnalytics?.github_username,
    student.student?.codingAnalytics?.github_handle,
  ];
  const found = searchFields.find((item) => item && String(item).trim());
  if (found) return String(found).trim();

  const arraysToSearch = [
    student.codingAnalytics?.handles,
    student.student?.codingAnalytics?.handles,
    student.coding_handles,
    student.codingHandles,
    student.coding_profiles,
    student.codingProfiles,
    student.student?.coding_handles,
    student.student?.codingHandles,
    student.student?.coding_profiles,
    student.student?.codingProfiles,
  ];
  for (const list of arraysToSearch) {
    if (Array.isArray(list)) {
      const githubEntry = list.find((item) => String(item?.platform || item?.platform_name || '').toLowerCase().includes('github'));
      if (githubEntry) {
        return String(githubEntry.username || githubEntry.handle || githubEntry.profile || githubEntry.profile_url || githubEntry.profileUrl || githubEntry.github || '').trim();
      }
    }
  }

  return '';
};

const getProjectCount = (student) => {
  if (!student) return 'N/A';
  if (student.project_count != null) return student.project_count;
  if (student.total_projects != null) return student.total_projects;
  if (Array.isArray(student.projects)) return student.projects.length;
  return 'N/A';
};

const getStudentStatus = (score) => {
  const value = Number(score ?? 0);
  if (Number.isNaN(value)) return 'No Data';
  if (value >= 85) return 'Excellent';
  if (value >= 70) return 'Good';
  if (value >= 50) return 'Average';
  return 'Needs Improvement';
};

const buildProjectSummary = (projects = []) => {
  const summary = { total: 0, completed: 0, ongoing: 0, major: 0, minor: 0, technologies: {} };
  if (!Array.isArray(projects)) return summary;

  projects.forEach((project) => {
    summary.total += 1;
    const status = String(project.status || project.project_status || '').toLowerCase();
    if (status.includes('complete')) summary.completed += 1;
    else if (status.includes('ongoing') || status.includes('in progress')) summary.ongoing += 1;
    const category = String(project.category || project.project_type || '').toLowerCase();
    if (category.includes('major') || category.includes('large')) summary.major += 1;
    if (category.includes('minor') || category.includes('small')) summary.minor += 1;
    const techStack = String(project.tech_stack || project.techStack || '');
    techStack.split(/[,;/]/).forEach((item) => {
      const tech = item.trim();
      if (tech) summary.technologies[tech] = (summary.technologies[tech] || 0) + 1;
    });
  });

  return summary;
};

const badgeColor = (status) => {
  switch (status) {
    case 'Excellent': return 'bg-emerald-100 text-emerald-800';
    case 'Good': return 'bg-sky-100 text-sky-800';
    case 'Average': return 'bg-amber-100 text-amber-800';
    case 'Needs Improvement': return 'bg-rose-100 text-rose-800';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const formatProjectDate = (value) => {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
};

const buildTechTags = (project) => {
  const stack = project.tech_stack || project.techStack || project.techStack || project.technology_stack || project.technologyStack || '';
  return String(stack)
    .split(/[,;/|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const ProjectCard = ({ project }) => {
  const techTags = buildTechTags(project);
  const status = project.status || project.project_status || project.current_status || 'Unknown';
  const normalizedStatus = String(status).toLowerCase();
  const statusClasses = normalizedStatus.includes('complete')
    ? 'bg-emerald-100 text-emerald-700'
    : normalizedStatus.includes('ongoing') || normalizedStatus.includes('in progress')
      ? 'bg-sky-100 text-sky-700'
      : normalizedStatus.includes('pending')
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-700';
  const githubUrl = project.github_url || project.githubUrl || project.repo_url || project.repository_url || project.repositoryUrl;
  const liveUrl = project.live_url || project.liveUrl || project.demo_url || project.demoUrl;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xl font-semibold text-slate-900">{project.title || project.name || 'Untitled Project'}</p>
          <p className="mt-2 text-sm text-slate-500">{project.description || 'No description available.'}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${statusClasses}`}>{status}</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Technology Stack</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {techTags.length > 0 ? techTags.map((tech) => (
              <span key={tech} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{tech}</span>
            )) : (
              <span className="text-sm text-slate-500">N/A</span>
            )}
          </div>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Meta</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p><span className="font-semibold text-slate-900">Created:</span> {formatProjectDate(project.created_at || project.createdAt || project.created_date)}</p>
            <p><span className="font-semibold text-slate-900">Updated:</span> {formatProjectDate(project.updated_at || project.updatedAt || project.updated_date)}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">GitHub Repository</p>
          {githubUrl ? (
            <a href={githubUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline">
              <FiGithub /> {project.github_url ? 'View repository' : 'Open repo'}
            </a>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Not linked</p>
          )}
        </div>
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Live Demo</p>
          {liveUrl ? (
            <a href={liveUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline">
              <FiExternalLink /> Open demo
            </a>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Not available</p>
          )}
        </div>
      </div>
    </div>
  );
};
const CoordinatorProjectTracking = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ college: 'All', year: 'All', projectStatus: 'All', codingScore: 'all', placementScore: 'all' });
  const [search, setSearch] = useState('');
  const [showStudents, setShowStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true);
      try {
        const res = await api.get('/coordinator/students');
        setStudents(res.data.data || []);
      } catch (err) {
        console.error('Failed to load coordinator students:', err);
        setError('Unable to load students.');
      } finally {
        setLoading(false);
      }
    };
    loadStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesCollege = filters.college === 'All' || !filters.college || normalizeCollegeValue(formatCollege(student)) === normalizeCollegeValue(filters.college);
      const matchesYear = filters.year === 'All' || !filters.year || normalizeYearValue(formatYear(student)) === normalizeYearValue(filters.year);
      const codingScore = Number(getCodingScore(student));
      const placementScore = Number(getPlacementReadiness(student));
      const scoreMatch = filters.codingScore === 'all'
        ? true
        : filters.codingScore === '0-40' ? codingScore <= 40
        : filters.codingScore === '41-70' ? codingScore >= 41 && codingScore <= 70
        : filters.codingScore === '71-100' ? codingScore >= 71 : true;
      const placementMatch = filters.placementScore === 'all'
        ? true
        : filters.placementScore === '0-40' ? placementScore <= 40
        : filters.placementScore === '41-70' ? placementScore >= 41 && placementScore <= 70
        : filters.placementScore === '71-100' ? placementScore >= 71 : true;
      const status = filters.projectStatus;
      const projectCount = Array.isArray(student.projects) ? student.projects.length : null;
      const projectStatusMatch = status === 'All' ? true : (Array.isArray(student.projects) && student.projects.some((project) => String(project.status || project.project_status || '').toLowerCase().includes(status.toLowerCase()))) || false;
      const searchTerm = search.trim().toLowerCase();
      const searchMatch = !searchTerm || [formatStudentName(student), formatMssid(student)].some((value) => String(value || '').toLowerCase().includes(searchTerm));
      return matchesCollege && matchesYear && scoreMatch && placementMatch && (status === 'All' || projectStatusMatch) && searchMatch;
    });
  }, [students, filters, search]);

  const projectStudents = useMemo(() => showStudents ? filteredStudents : [], [filteredStudents, showStudents]);

  const handleViewStudents = () => setShowStudents(true);

  const handleOpenDetails = async (student) => {
    setDetailError(null);
    setDetailLoading(true);
    try {
      if (!student?.id) {
        throw new Error('Student identifier not available');
      }
      const res = await api.get(`/coordinator/students/${student.id}/projects`);
      const projects = Array.isArray(res.data.data) ? res.data.data : [];
      setSelectedStudent({ ...student, projects });
    } catch (err) {
      console.error('Failed to load student details:', err);
      setDetailError('Failed to load project details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedStudent(null);
    setDetailError(null);
  };

  const selectedStudentRecord = selectedStudent?.student || selectedStudent;

  const studentGithubUrl = (student) => {
    if (!student) return null;
    const record = student?.student || student;
    const url = record.github_profile_url || record.githubProfileUrl || record.github_url || record.githubUrl;
    if (url) return String(url).trim();
    const username = getGithubUsername(record);
    return username ? `https://github.com/${username}` : null;
  };

  const detailCoding = selectedStudentRecord?.codingAnalytics || selectedStudent?.codingAnalytics || {};
  const detailProjects = Array.isArray(selectedStudent?.projects) ? selectedStudent.projects : Array.isArray(selectedStudentRecord?.projects) ? selectedStudentRecord.projects : [];
  const projectSummary = buildProjectSummary(detailProjects);
  const githubUsername = getGithubUsername(selectedStudent || {});
  const githubRepos = detailCoding.githubRepoCount ?? detailCoding.publicRepos ?? detailCoding.githubRepos ?? 'N/A';
  const githubFollowers = detailCoding.githubFollowers ?? detailCoding.followers ?? 'N/A';
  const githubFollowing = detailCoding.githubFollowing ?? 'N/A';
  const githubContributions = detailCoding.publicContributions ?? detailCoding.contributions ?? 'N/A';
  const githubLanguages = Array.isArray(detailCoding.githubLanguages) ? detailCoding.githubLanguages : (detailCoding.languages ? detailCoding.languages.split(/[,;/]/).map((lang) => lang.trim()).filter(Boolean) : []);
  const overallPlacement = Number(detailCoding.placementReadinessScore ?? detailCoding.placementReadiness ?? getPlacementReadiness(selectedStudent));
  const overallStatus = getStudentStatus(overallPlacement);
  const progressValue = Number(detailCoding.avgCodingScore ?? detailCoding.bestCodingScore ?? getCodingScore(selectedStudent));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Project Tracking</h1>
        <p className="text-sm text-slate-500 max-w-2xl">Filter project-ready students, review GitHub readiness and view detailed student project dashboards.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Filters</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Refine project student search</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">College</label>
              <select
                value={filters.college}
                onChange={(e) => setFilters((prev) => ({ ...prev, college: e.target.value }))}
                className="input-field w-full"
              >
                {colleges.map((college) => <option key={college} value={college}>{college}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
              <select
                value={filters.year}
                onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))}
                className="input-field w-full"
              >
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Project Status</label>
              <select
                value={filters.projectStatus}
                onChange={(e) => setFilters((prev) => ({ ...prev, projectStatus: e.target.value }))}
                className="input-field w-full"
              >
                {projectStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Coding Score Range</label>
              <select
                value={filters.codingScore}
                onChange={(e) => setFilters((prev) => ({ ...prev, codingScore: e.target.value }))}
                className="input-field w-full"
              >
                {scoreRanges.map((range) => <option key={range.value} value={range.value}>{range.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Placement Readiness</label>
              <select
                value={filters.placementScore}
                onChange={(e) => setFilters((prev) => ({ ...prev, placementScore: e.target.value }))}
                className="input-field w-full"
              >
                {scoreRanges.map((range) => <option key={range.value} value={range.value}>{range.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <button type="button" onClick={handleViewStudents} className="btn-primary w-full">👁 View Students</button>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Live Search</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Search by Student Name or MSS ID</h2>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Enter student name or MSS ID"
            className="input-field mt-4 w-full"
          />
          <p className="mt-3 text-sm text-slate-500">Search updates student results live for fast review.</p>
        </div>
      </div>

      {showStudents && (
        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Students Matching Filters</h2>
                <p className="text-sm text-slate-500">{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1">Coding score range: {filters.codingScore}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Placement range: {filters.placementScore}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Project status: {filters.projectStatus}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredStudents.length === 0 ? (
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">No matching students available.</div>
            ) : filteredStudents.map((student) => {
              const githubUsername = getGithubUsername(student);
              const githubUrl = githubUsername ? `https://github.com/${githubUsername}` : null;
              return (
                <div key={student.id || student.mssid} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{formatStudentName(student)}</p>
                      <p className="text-sm text-slate-500">{formatMssid(student)} • {formatCollege(student)}</p>
                      <p className="mt-3 text-sm text-slate-500">{formatYear(student)} • Batch {formatBatch(student)}</p>
                    </div>
                    <div className="space-y-2 text-right">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Placement Readiness</p>
                      <p className="text-2xl font-semibold text-slate-900">{getPlacementReadiness(student)}%</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Coding Score</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{getCodingScore(student)}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Projects</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{getProjectCount(student)}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">GitHub</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{githubUsername || 'Not Linked'}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Project Count</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{getProjectCount(student)}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(student)}
                      className="btn-primary rounded-2xl px-4 py-3 text-sm font-semibold"
                    >
                      <FiEye className="mr-2 inline-block" /> View Details
                    </button>
                    {githubUrl ? (
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        <FiGithub /> Open GitHub Profile
                      </a>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">GitHub Profile Not Linked</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 px-4 py-10">
          <div className="mx-auto w-full max-w-6xl rounded-[32px] bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Project Tracking Detail</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{formatStudentName(selectedStudent)}</h2>
                <p className="text-sm text-slate-500">{formatMssid(selectedStudent)} • {formatCollege(selectedStudent)}</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={() => selectedStudent && window.open(studentGithubUrl(selectedStudent), '_blank')}
                  disabled={!githubUsername}
                  className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiExternalLink className="inline-block" /> Open GitHub Profile
                </button>
                <button
                  type="button"
                  onClick={handleCloseDetails}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >Close</button>
              </div>
            </div>

            {detailLoading ? (
              <div className="mt-10 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
              </div>
            ) : detailError ? (
              <div className="mt-6 rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{detailError}</div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Student</p>
                    <p className="mt-3 text-xl font-semibold text-slate-900">{formatStudentName(selectedStudentRecord)}</p>
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Coding Score</p>
                    <p className="mt-3 text-xl font-semibold text-slate-900">{getCodingScore(selectedStudentRecord)}</p>
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Placement Readiness</p>
                    <p className="mt-3 text-xl font-semibold text-slate-900">{overallPlacement || 'N/A'}%</p>
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Projects</p>
                    <p className="mt-3 text-xl font-semibold text-slate-900">{projectSummary.total}</p>
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">GitHub Repos</p>
                    <p className="mt-3 text-xl font-semibold text-slate-900">{githubRepos ?? 'N/A'}</p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">Coding Performance</p>
                    <div className="mt-4 space-y-4 text-sm text-slate-700">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">LeetCode Rating</p>
                        <p className="mt-2 font-semibold text-slate-900">{detailCoding.leetcodeRating ?? detailCoding.leetCodeRating ?? 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Problems Solved</p>
                        <p className="mt-2 font-semibold text-slate-900">{detailCoding.totalProblemsSolved ?? detailCoding.problemsSolved ?? 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">CodeChef Rating</p>
                        <p className="mt-2 font-semibold text-slate-900">{detailCoding.codechefRating ?? 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contest Performance</p>
                        <p className="mt-2 font-semibold text-slate-900">{detailCoding.contestRating ?? detailCoding.contestPerformance ?? 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Overall Coding Grade</p>
                        <p className="mt-2 font-semibold text-slate-900">{detailCoding.overallGrade ?? detailCoding.codingGrade ?? 'N/A'}</p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <span>Progress</span>
                        <span>{Number.isNaN(progressValue) ? 'N/A' : `${progressValue}%`}</span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-gradient-to-r from-slate-900 to-slate-500" style={{ width: Number.isNaN(progressValue) ? '0%' : `${Math.min(100, Math.max(0, progressValue))}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">Placement Readiness</p>
                    <div className="mt-4 space-y-4 text-sm text-slate-700">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Overall Readiness</p>
                        <p className="mt-2 font-semibold text-slate-900">{overallPlacement || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Technical Skills</p>
                        <p className="mt-2 font-semibold text-slate-900">{detailCoding.technicalSkills || detailCoding.skills || 'No Data Available'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">DSA Progress</p>
                        <p className="mt-2 font-semibold text-slate-900">{detailCoding.dsaProgress ?? detailCoding.dsaProgressPercent ?? 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Projects Contribution</p>
                        <p className="mt-2 font-semibold text-slate-900">{detailCoding.projectContribution ?? 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Resume Uploaded</p>
                        <p className="mt-2 font-semibold text-slate-900">{selectedStudent?.resume ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mock Interview</p>
                        <p className="mt-2 font-semibold text-slate-900">{detailCoding.mockInterviewStatus ?? detailCoding.mockInterview ?? 'No Data Available'}</p>
                      </div>
                      <div className={`mt-4 inline-flex rounded-full px-3 py-2 text-xs font-semibold ${badgeColor(overallStatus)}`}>
                        {overallStatus}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">GitHub Profile</p>
                    <div className="mt-4 space-y-4 text-sm text-slate-700">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Username</p>
                        <p className="mt-2 font-semibold text-slate-900">{githubUsername || 'No Data Available'}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Repositories</p>
                          <p className="mt-2 font-semibold text-slate-900">{githubRepos}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Followers</p>
                          <p className="mt-2 font-semibold text-slate-900">{githubFollowers}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Following</p>
                          <p className="mt-2 font-semibold text-slate-900">{githubFollowing}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contributions</p>
                          <p className="mt-2 font-semibold text-slate-900">{githubContributions}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Projects</p>
                      <p className="text-sm text-slate-500">All student projects from the current record.</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-700">{projectSummary.total} Projects</span>
                  </div>
                  <div className="mt-6 space-y-4">
                    {detailProjects.length === 0 ? (
                      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 text-slate-500">No projects available.</div>
                    ) : detailProjects.map((project) => <ProjectCard key={project.id || `${project.title}-${project.start_date}-${project.github_url || project.live_url || project.status}`} project={project} />)}
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Projects</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">{projectSummary.total}</p>
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Completed</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">{projectSummary.completed}</p>
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Ongoing</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">{projectSummary.ongoing}</p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                  <p className="text-sm font-semibold text-slate-900">Technology Stack</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {Object.keys(projectSummary.technologies).length === 0 ? (
                      <span className="text-sm text-slate-500">No Data Available</span>
                    ) : Object.entries(projectSummary.technologies).map(([tech, count]) => (
                      <span key={tech} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{tech} ({count})</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
      )}
    </div>
  );
};

export default CoordinatorProjectTracking;

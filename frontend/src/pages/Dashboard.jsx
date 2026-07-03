import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowUpRight, FiAward, FiBookOpen, FiBriefcase, FiCheckCircle, FiClock, FiCode, FiCpu, FiFileText, FiGitBranch, FiTarget, FiTrendingUp, FiZap } from 'react-icons/fi';
import api from '../services/api';
import analyticsService from '../services/analyticsService';
import codingService from '../services/codingService';
import { useAuth } from '../contexts/AuthContext';

const StatCard = ({ label, value, icon, to, accent }) => (
  <Link to={to} className="group relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_45px_-24px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_-24px_rgba(59,130,246,0.4)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-xl text-white shadow-lg`}>
        {icon}
      </div>
    </div>
    <div className="mt-4 flex items-center text-sm font-medium text-blue-600">
      Open section <FiArrowUpRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
    </div>
  </Link>
);

const MetricCard = ({ title, score, description, icon, accent, badge }) => {
  const numericScore = score != null && score !== '' ? Number(score) : null;
  const safePercent = numericScore != null && !Number.isNaN(numericScore) ? Math.min(100, Math.max(0, Math.round(numericScore))) : 0;

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_45px_-24px_rgba(15,23,42,0.5)] transition duration-300 hover:-translate-y-0.5">
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-xl text-white shadow-lg`}>
        {icon}
      </div>
      <div className="mt-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
          <p className="mt-2 text-4xl font-semibold text-slate-900">{score ?? 'N/A'}</p>
        </div>
        {badge ? <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{badge}</span> : null}
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full bg-gradient-to-r ${accent}`} style={{ width: `${safePercent}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-500">
        <span>Progress</span>
        <span>{score != null ? `${safePercent}%` : 'N/A'}</span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [personal, setPersonal]   = useState(null);
  const [counts, setCounts]       = useState({});
  const [codingAnalytics, setCodingAnalytics] = useState(null);
  const [codingHandles, setCodingHandles] = useState([]);
  const [mentorAssignments, setMentorAssignments] = useState([]);
  const [overallMetrics, setOverallMetrics] = useState(null);
  const [loading, setLoading]     = useState(true);
  const navigate = useNavigate();

  const loadDashboardData = async () => {
    try {
      const [p, g, proj, cert, ach, plac, coding, handlesRes, mentorRes] = await Promise.allSettled([
        api.get('/personal'),
        api.get('/goals'),
        api.get('/projects'),
        api.get('/certifications'),
        api.get('/achievements'),
        api.get('/placements'),
        api.get('/coding'),
        user?.id ? codingService.getHandles(user.id) : Promise.resolve({ data: { success: true, data: [] } }),
        api.get('/mentor-assignments'),
      ]);

      if (p.status === 'fulfilled') setPersonal(p.value.data.data);

      const codingData = coding.status === 'fulfilled' ? coding.value.data.data : null;
      const handlesData = handlesRes.status === 'fulfilled' ? (handlesRes.value?.data || []) : [];
      const mentorData = mentorRes.status === 'fulfilled' ? (mentorRes.value?.data?.data || {}) : {};
      const mentorEntries = Object.values(mentorData || {}).filter((entry) => entry && typeof entry === 'object');

      setCounts({
        goals:          g.status     === 'fulfilled' ? g.value.data.data.length     : 0,
        projects:       proj.status  === 'fulfilled' ? proj.value.data.data.length  : 0,
        certifications: cert.status  === 'fulfilled' ? cert.value.data.data.length  : 0,
        achievements:   ach.status   === 'fulfilled' ? ach.value.data.data.length   : 0,
        placements:     plac.status  === 'fulfilled' ? plac.value.data.data.length  : 0,
        coding:         codingData ? codingData.profiles.length : 0,
      });

      if (codingData?.analytics) {
        setCodingAnalytics(codingData.analytics);
      }

      setCodingHandles(Array.isArray(handlesData) ? handlesData : []);
      setMentorAssignments(mentorEntries);

      try {
        const overall = await analyticsService.getOverallScore();
        setOverallMetrics(overall || null);
      } catch {
        setOverallMetrics(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user?.id]);

  useEffect(() => {
    const handleRefresh = () => {
      loadDashboardData();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('student-dashboard-refresh', handleRefresh);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('student-dashboard-refresh', handleRefresh);
      }
    };
  }, [user?.id]);

  useEffect(() => {
    if (user?.role === 'coordinator') {
      navigate('/coordinator/dashboard', { replace: true });
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const codingScoreValue = overallMetrics?.overallCodingScore ?? null;
  const placementScoreValue = overallMetrics?.placementReadinessScore ?? null;
  const recentActivityItems = (codingAnalytics?.recentProblems || codingAnalytics?.recentActivity || []).slice(0, 3);
  const mentorAssignmentCount = mentorAssignments.filter((entry) => [entry?.mentor_name, entry?.mentor_phone, entry?.mentor_email, entry?.department].some((value) => String(value || '').trim())).length;
  const hasMentorAssignments = mentorAssignmentCount > 0;

  const profileCards = [
    {
      key: 'leetcode',
      label: 'LeetCode',
      icon: <FiCode />,
      accent: 'from-orange-500 to-amber-400',
      soft: 'border-orange-100 bg-orange-50 text-orange-700',
      getUrl: (profile) => profile?.profileUrl || profile?.profile_url || (profile?.username ? `https://leetcode.com/${profile.username}` : null),
    },
    {
      key: 'codechef',
      label: 'CodeChef',
      icon: <FiCpu />,
      accent: 'from-red-500 to-orange-400',
      soft: 'border-red-100 bg-red-50 text-red-700',
      getUrl: (profile) => profile?.profileUrl || profile?.profile_url || (profile?.username ? `https://www.codechef.com/users/${profile.username}` : null),
    },
    {
      key: 'github',
      label: 'GitHub',
      icon: <FiGitBranch />,
      accent: 'from-slate-700 to-slate-500',
      soft: 'border-slate-200 bg-slate-50 text-slate-700',
      getUrl: (profile) => profile?.profileUrl || profile?.profile_url || (profile?.username ? `https://github.com/${profile.username}` : null),
    },
    {
      key: 'hackerrank',
      label: 'HackerRank',
      icon: <FiAward />,
      accent: 'from-emerald-500 to-teal-500',
      soft: 'border-emerald-100 bg-emerald-50 text-emerald-700',
      getUrl: (profile) => profile?.profileUrl || profile?.profile_url || (profile?.username ? `https://www.hackerrank.com/profile/${profile.username}` : null),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-8 text-white shadow-[0_30px_70px_-30px_rgba(15,23,42,0.8)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">Student portal</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Welcome back, {personal?.full_name || user?.mssid}! 👋
            </h1>
            <p className="mt-4 text-sm leading-7 text-blue-100 sm:text-base">
              {personal?.full_name
                ? `${personal.email ? personal.email + ' · ' : ''}${user?.mssid}`
                : 'Complete your profile to get started.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Goals" value={counts.goals} icon={<FiTarget />} to="/goals" accent="from-blue-600 to-cyan-500" />
        <StatCard label="Projects" value={counts.projects} icon={<FiBriefcase />} to="/projects" accent="from-violet-600 to-indigo-500" />
        <StatCard label="Certifications" value={counts.certifications} icon={<FiAward />} to="/certifications" accent="from-amber-500 to-orange-500" />
        <StatCard label="Achievements" value={counts.achievements} icon={<FiZap />} to="/achievements" accent="from-emerald-500 to-teal-500" />
        <StatCard label="Placements" value={counts.placements} icon={<FiBookOpen />} to="/placements" accent="from-slate-700 to-slate-500" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <MetricCard
          title="Coding Score"
          score={codingScoreValue ?? null}
          description="A weighted coding performance score across your connected coding platforms."
          icon={<FiTrendingUp />}
          accent="from-blue-600 to-indigo-500"
          badge="Live"
        />
        <MetricCard
          title="Placement Readiness"
          score={placementScoreValue ?? null}
          description="A readiness score based on your academics, projects, goals, and coding profile."
          icon={<FiCheckCircle />}
          accent="from-emerald-500 to-teal-500"
          badge="Ready"
        />
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_45px_-24px_rgba(15,23,42,0.5)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Coding Profiles</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">Connected platforms</p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <FiCode className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {profileCards.map((profileCard) => {
              const profile = codingHandles.find((item) => String(item?.platform || '').toLowerCase() === profileCard.key) || codingHandles.find((item) => String(item?.platform || '').toLowerCase().includes(profileCard.key)) || null;
              const username = profile?.handle || profile?.username || profile?.profile_username || '';
              const profileUrl = profileCard.getUrl(profile);
              const isConnected = Boolean(username);
              const handleClick = () => {
                if (isConnected) {
                  navigate(`/analytics/${profileCard.key}`);
                }
              };

              return (
                <button
                  key={profileCard.key}
                  type="button"
                  onClick={handleClick}
                  disabled={!isConnected}
                  className={`flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition ${isConnected ? 'hover:border-blue-200 hover:bg-blue-50' : 'cursor-not-allowed opacity-70'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${profileCard.accent} text-white`}>
                      {profileCard.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{profileCard.label}</p>
                      <p className="text-xs font-medium text-slate-700">{isConnected ? 'Connected' : 'Not Connected'}</p>
                      <p className="text-xs text-slate-500">{isConnected ? username : 'Please connect your profile first.'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${isConnected ? profileCard.soft : 'border-slate-200 bg-white text-slate-500'}`}>
                      {isConnected ? 'Connected' : 'Not Connected'}
                    </span>
                    {isConnected ? <FiArrowUpRight className="h-4 w-4 text-slate-500" /> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_45px_-24px_rgba(15,23,42,0.5)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Quick Actions</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Stay on top of your progress</h2>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <FiFileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { to: '/personal', label: 'Update Profile', icon: <FiBookOpen /> },
              { to: '/academic', label: 'Academic Info', icon: <FiTarget /> },
              { to: '/resume', label: 'Upload Resume', icon: <FiFileText /> },
              { to: '/projects', label: 'Add Project', icon: <FiBriefcase /> },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 p-4 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm transition group-hover:text-blue-600">
                  {item.icon}
                </div>
                <span className="text-sm font-semibold text-slate-700">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_45px_-24px_rgba(15,23,42,0.5)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Recent Activity</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Latest signals</h2>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <FiClock className="h-5 w-5" />
            </div>
          </div>
          {recentActivityItems.length > 0 ? (
            <div className="mt-5 space-y-4">
              {recentActivityItems.map((item, index) => (
                <div key={`${item?.title || item?.problemName || 'activity'}-${index}`} className="flex gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <FiCheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item?.title || item?.problemName || item?.name || 'Recent activity'}</p>
                    <p className="mt-1 text-sm text-slate-500">{item?.description || item?.summary || 'Updated from your latest coding activity.'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No recent activity available yet.
            </div>
          )}
        </div>
      </div>

      {codingAnalytics && (
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_45px_-24px_rgba(15,23,42,0.5)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Performance insights</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Coding analytics overview</h2>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <FiTrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[{
              label: 'Total Solved',
              value: codingAnalytics.totalProblemsSolved,
            }, {
              label: 'Highest Rating',
              value: codingAnalytics.highestRating || 'N/A',
            }, {
              label: 'Avg Smart Score',
              value: codingAnalytics.avgCodingScore !== null ? codingAnalytics.avgCodingScore : 'N/A',
            }, {
              label: 'Best Smart Score',
              value: codingAnalytics.bestCodingScore !== null ? codingAnalytics.bestCodingScore : 'N/A',
            }, {
              label: 'Global Rank',
              value: codingAnalytics.globalRank || 'N/A',
            }, {
              label: 'Consistency',
              value: `${codingAnalytics.consistencyScore}% ${codingAnalytics.consistencyCategory || ''}`,
            }, {
              label: 'Active Platforms',
              value: codingAnalytics.activePlatforms || 0,
            }, {
              label: 'Best Platform',
              value: codingAnalytics.bestPlatform || 'N/A',
            }].map((item) => (
              <div key={item.label} className="rounded-[18px] border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

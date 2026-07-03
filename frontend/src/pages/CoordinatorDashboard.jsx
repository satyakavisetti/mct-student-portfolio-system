import React from 'react';
import { Link } from 'react-router-dom';

const modules = [
  {
    title: 'Goal Tracking',
    description: 'Track student goals, topic completion and progress.',
    icon: '🎯',
    url: '/coordinator/goal-tracking',
    color: 'from-blue-500 to-sky-500',
  },
  {
    title: 'Coding Tracking',
    description: 'Track LeetCode, CodeChef, coding score and leaderboards.',
    icon: '💻',
    url: '/coordinator/coding-tracking',
    color: 'from-purple-500 to-violet-500',
  },
  {
    title: '🧠 DSA Tracking',
    description: 'Monitor DSA progress across platforms with college/year filters and detail views.',
    icon: '🧠',
    url: '/coordinator/dsa-tracking',
    color: 'from-fuchsia-500 to-pink-500',
  },
  {
    title: 'Project Tracking',
    description: 'Track projects, GitHub profiles and placement readiness.',
    icon: '📂',
    url: '/coordinator/project-tracking',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    title: 'Volunteering Tracking',
    description: 'Track volunteering hours, eligible students and activity history.',
    icon: '🤝',
    url: '/coordinator/volunteering-tracking',
    color: 'from-orange-400 to-orange-500',
  },
  {
    title: 'MCT Report Cards',
    description: 'Generate complete student reports and downloadable PDFs.',
    icon: '📄',
    url: '/coordinator/report-cards',
    color: 'from-indigo-500 to-indigo-600',
  },
];

const DashboardCard = ({ title, description, icon, url, color }) => (
  <Link
    to={url}
    className={
      `group block rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-300`
    }
  >
    <div className={`inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br ${color} text-3xl shadow-lg shadow-black/10`}>
      {icon}
    </div>
    <div className="mt-6">
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
    <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-medium text-slate-700">
      <span>Open Module</span>
      <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
    </div>
  </Link>
);

const CoordinatorDashboard = () => (
  <div className="space-y-8 pb-8">
    <section className="dashboard-hero">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Coordinator Dashboard</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Manage student progress with confidence.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">Centralize reporting, compare performance across modules, and deliver polished coordinator insights using MCT’s enterprise-grade dashboard.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[24px] bg-white/10 p-5 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Access level</p>
            <p className="mt-3 text-lg font-semibold">Coordinator</p>
          </div>
          <div className="rounded-[24px] bg-white/10 p-5 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Report type</p>
            <p className="mt-3 text-lg font-semibold">Student analytics</p>
          </div>
        </div>
      </div>
    </section>

    <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {modules.map((module) => (
        <DashboardCard key={module.title} {...module} />
      ))}
    </section>
  </div>
);

export default CoordinatorDashboard;

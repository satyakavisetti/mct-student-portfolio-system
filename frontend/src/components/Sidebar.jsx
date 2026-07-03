import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/personal', label: 'Profile & Family', icon: '👤' },
  { to: '/academic', label: 'Academic Details', icon: '📊' },
  { to: '/mentor', label: 'Mentor Details', icon: '👨‍🏫' },
  { to: '/goals', label: 'Goals', icon: '🎯' },
  { to: '/student/coding-handles', label: 'Coding Handles', icon: '🔗' },
  { to: '/projects', label: 'Projects', icon: '🛠️' },
  { to: '/volunteering', label: 'Volunteering', icon: '🤝' },
  { to: '/resume', label: 'Resume', icon: '📄' },
  { to: '/certifications', label: 'Certifications', icon: '🏆' },
  { to: '/achievements', label: 'Achievements', icon: '⭐' },
  { to: '/placements', label: 'Placements', icon: '💼' },
];

const coordinatorItems = [
  { to: '/coordinator/dashboard', label: 'Coordinator Dashboard', icon: '📊' },
];

const Sidebar = ({ onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const items = user?.role === 'coordinator' ? coordinatorItems : navItems;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-200 bg-slate-50">
        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary-600 text-lg font-semibold text-white shadow-card">M</div>
        <div>
          <p className="font-semibold text-slate-900 text-sm leading-tight">MCT Portal</p>
          <p className="text-xs text-slate-500">Enterprise coordinator hub</p>
        </div>
      </div>

      {/* User badge */}
      <div className="mx-4 my-5 rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div className="rounded-3xl bg-primary-600 px-3 py-2 text-white text-sm font-semibold">{user?.mssid?.slice(-3) ?? 'STU'}</div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-500">{user?.role ?? 'User'}</span>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-900 truncate">{user?.mssid}</p>
        <p className="mt-1 text-xs text-slate-500">Coordinator workspace access</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              isActive
                ? 'sidebar-link sidebar-link-active'
                : 'sidebar-link'
            }
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <button
          onClick={handleLogout}
          className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
        >
          <span className="mr-2">🚪</span> Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

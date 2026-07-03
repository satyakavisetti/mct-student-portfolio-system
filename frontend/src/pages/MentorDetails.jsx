import React, { useEffect, useState } from 'react';
import api from '../services/api';

const mentorCards = [
  { key: 'ACADEMIC', title: 'Academic Mentor', icon: '🎓', description: 'Guidance for academics and learning progress.' },
  { key: 'PROJECT', title: 'Project Mentor', icon: '💻', description: 'Support for projects, development and industry readiness.' },
  { key: 'RESUME', title: 'Resume Mentor', icon: '📄', description: 'Feedback for resume building and career preparation.' },
  { key: 'CODING', title: 'Coding Mentor', icon: '🏆', description: 'Support for coding practice and platform growth.' },
];

const emptyForm = {
  mentor_name: '',
  mentor_phone: '',
  mentor_email: '',
  department: '',
};

const MentorDetails = () => {
  const [formState, setFormState] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadMentorInfo();
  }, []);

  const loadMentorInfo = async () => {
    try {
      const res = await api.get('/mentor-assignments');
      const data = res.data?.data || {};
      const next = {};
      mentorCards.forEach((card) => {
        const existing = data[card.key] || {};
        next[card.key] = {
          mentor_name: existing.mentor_name || '',
          mentor_phone: existing.mentor_phone || '',
          mentor_email: existing.mentor_email || '',
          department: existing.department || '',
        };
      });
      setFormState(next);
    } catch (err) {
      console.error('Failed to load mentor assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (mentorType, field, value) => {
    setFormState((prev) => ({ ...prev, [mentorType]: { ...(prev[mentorType] || emptyForm), [field]: value } }));
  };

  const handleSave = async (mentorType) => {
    const payload = formState[mentorType] || emptyForm;
    setSaving(mentorType);
    setMessage(null);
    try {
      await api.post(`/mentor-assignments/${mentorType}`, {
        mentor_type: mentorType,
        ...payload,
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('student-dashboard-refresh'));
      }
      setMessage({ type: 'success', text: 'Mentor details saved successfully.' });
      await loadMentorInfo();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save mentor details.' });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-4xl">
        <h1 className="text-3xl font-semibold text-slate-900">Mentor Assignments</h1>
        <p className="mt-2 text-sm text-slate-600">View and manage mentors assigned for each learning area.</p>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {mentorCards.map((card) => {
          const value = formState[card.key] || emptyForm;
          return (
            <div key={card.key} className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_45px_-24px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(59,130,246,0.35)]">
              <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-700 px-5 py-4 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200">Mentor Assignment</p>
                    <h2 className="mt-2 text-xl font-semibold">{card.title}</h2>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur-sm">
                    {card.icon}
                  </div>
                </div>
                <p className="mt-3 text-sm text-blue-100">{card.description}</p>
              </div>

              <div className="space-y-3 p-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Mentor Name</label>
                  <input value={value.mentor_name} onChange={(e) => handleChange(card.key, 'mentor_name', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Phone Number</label>
                  <input value={value.mentor_phone} onChange={(e) => handleChange(card.key, 'mentor_phone', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                  <input type="email" value={value.mentor_email} onChange={(e) => handleChange(card.key, 'mentor_email', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
                  <input value={value.department} onChange={(e) => handleChange(card.key, 'department', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white" />
                </div>
                <button type="button" onClick={() => handleSave(card.key)} disabled={saving === card.key} className="w-full rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70">
                  {saving === card.key ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MentorDetails;

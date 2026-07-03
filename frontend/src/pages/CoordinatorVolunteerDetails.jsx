import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiExternalLink, FiDownload, FiFileText, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import api from '../services/api';

const formatStudentName = (student) => student?.full_name || student?.student_name || student?.mssid || 'Unknown Student';
const formatMssid = (student) => student?.mssid || student?.student_id || '—';
const formatCollege = (student) => student?.college_name || student?.college || 'Unknown College';
const formatYear = (student) => student?.year_of_study ? `Year ${student.year_of_study}` : student?.year || 'Unknown';
const formatBatch = (student) => student?.mss_batch || student?.batch || '—';
const formatHours = (hours) => (hours != null ? Number(hours).toFixed(1) : '0.0');

const Badge = ({ children, tone = 'slate' }) => {
  const toneClasses = {
    green: 'bg-emerald-100 text-emerald-800',
    orange: 'bg-amber-100 text-amber-800',
    red: 'bg-rose-100 text-rose-800',
    slate: 'bg-slate-100 text-slate-700',
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone] || toneClasses.slate}`}>{children}</span>;
};

const VolunteerActivityCard = ({ activity }) => {
  const certificateHref = activity.certificate_url || activity.certificate_path || '';
  const verification = String(activity.status || '').toLowerCase();
  const coordinator = String(activity.coordinator_approval || '').toLowerCase();

  const verificationTone = verification === 'verified' || verification === 'completed' ? 'green' : verification === 'pending' ? 'orange' : 'red';
  const coordinatorTone = coordinator === 'approved' ? 'green' : coordinator === 'pending' ? 'orange' : 'red';

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-slate-900">{activity.title || 'Untitled Activity'}</p>
          <p className="mt-1 text-sm text-slate-500">{activity.organization || 'Organization not provided'}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={verificationTone}>{activity.status || 'N/A'}</Badge>
          <Badge tone={coordinatorTone}>{activity.coordinator_approval || 'N/A'}</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Date</p>
          <p className="mt-1 text-sm text-slate-700">{activity.start_date ? new Date(activity.start_date).toLocaleDateString() : 'N/A'}{activity.end_date ? ` – ${new Date(activity.end_date).toLocaleDateString()}` : ''}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Hours Earned</p>
          <p className="mt-1 text-sm text-slate-700">{formatHours(activity.hours)}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Description</p>
          <p className="mt-1 text-sm text-slate-700">{activity.description || 'No description provided.'}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {certificateHref ? (
          <>
            <a href={certificateHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
              <FiFileText /> View Certificate
            </a>
            <a href={certificateHref} download className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <FiDownload /> Download
            </a>
          </>
        ) : (
          <div className="rounded-full bg-slate-50 px-3 py-2 text-sm text-slate-500">No Certificate Uploaded</div>
        )}
      </div>
    </div>
  );
};

const CoordinatorVolunteerDetails = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/coordinator/students/${studentId}/volunteering`);
      setData(res.data.data || null);
    } catch (err) {
      console.error('Failed to load volunteering details:', err);
      const message = err?.response?.data?.message || 'Unable to load volunteering details.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [studentId]);

  const activities = useMemo(() => (Array.isArray(data?.volunteering) ? data.volunteering : []), [data]);
  const totalHours = useMemo(() => activities.reduce((sum, a) => sum + Number(a.hours || 0), 0), [activities]);
  const remaining = Math.max(0, 20 - totalHours);
  const eligibility = totalHours >= 20 ? 'Eligible' : 'Not Eligible';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
          <div className="mt-4">
            <button onClick={load} className="btn-primary">Retry</button>
            <button onClick={() => navigate('/coordinator/volunteering-tracking')} className="ml-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">Back</button>
          </div>
        </div>
      </div>
    );
  }

  const student = data?.student || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Volunteering Details</h1>
          <p className="text-sm text-slate-500">Viewing volunteering history for the selected student.</p>
        </div>
        <button onClick={() => navigate('/coordinator/volunteering-tracking')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">← Back</button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Student Information</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">{formatStudentName(student)}</p>
          <p className="mt-1 text-sm text-slate-500">{formatMssid(student)} • {formatCollege(student)}</p>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <div><span className="font-semibold">Year:</span> {formatYear(student)}</div>
            <div><span className="font-semibold">Batch:</span> {formatBatch(student)}</div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Total Hours</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatHours(totalHours)}</p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Remaining Hours</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatHours(remaining)}</p>
          <p className="mt-2 text-sm text-slate-600">(20 hours required)</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Eligibility</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{eligibility}</p>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Activities</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{activities.length}</p>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Completion %</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{Math.min(100, Math.round((totalHours / 20) * 100))}%</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Volunteer Activities</h2>
        <p className="text-sm text-slate-500">All volunteering activities for this student (sourced from the database).</p>

        <div className="mt-6 grid gap-4">
          {activities.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">No volunteering activities found.</div>
          ) : activities.map((activity) => (
            <VolunteerActivityCard key={activity.id || `${activity.title}-${activity.start_date}`} activity={activity} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CoordinatorVolunteerDetails;

import React, { useState } from 'react';
import api from '../services/api';

const batches = ['9','10','11','12','13','14','Other'];
const colleges = ['Vasavi','CBIT','KMIT','Vardhaman','Narayanamma','BVRIT','IIIT Hyderabad','Other'];
const years = ['1st Year','2nd Year','3rd Year','4th Year'];

const StudentCard = ({ student, onViewGoals }) => {
  const name = student.full_name || student.mssid || 'Student';
  const batch = student.mss_batch || student.batch || '—';
  const college = student.college_name || '—';
  const year = student.year || student.year_of_study || '—';
  const overall = student.goal_completion_percent != null ? `${student.goal_completion_percent}%` : (student.overallGoalPercent != null ? `${student.overallGoalPercent}%` : '—');

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-lg">👤 {name}</p>
          <p className="text-xs text-gray-500">{student.mssid}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded-full bg-blue-50 text-xs text-blue-700">Batch {batch}</span>
            <span className="px-2 py-1 rounded-full bg-gray-50 text-xs text-gray-700">{college}</span>
            <span className="px-2 py-1 rounded-full bg-green-50 text-xs text-green-700">{year}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Overall</p>
          <p className="text-2xl font-bold">{overall}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500" style={{ width: typeof student.goal_completion_percent === 'number' ? `${student.goal_completion_percent}%` : (student.overallGoalPercent ? `${student.overallGoalPercent}%` : '0%') }} />
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={() => onViewGoals(student)} className="btn-primary text-sm">View Goals</button>
        </div>
      </div>
    </div>
  );
};

const GoalsModal = ({ student, onClose }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/goals', { params: { studentId: student.id } });
        if (!mounted) return;
        setGoals(res.data.data || []);
      } catch (err) {
        console.error('Failed to load goals', err);
        setGoals([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [student.id]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Goals — {student.full_name || student.mssid}</h3>
          <button onClick={onClose} className="text-sm text-gray-500">Close</button>
        </div>

        {loading ? (
          <div className="py-8 text-center">Loading goals…</div>
        ) : goals.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No goals found for this student.</div>
        ) : (
          <div className="mt-4 space-y-4">
            {goals.map((g) => (
              <div key={g.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{g.title}</h4>
                  <div className="text-sm text-gray-600">{g.progressStats?.average ?? 0}%</div>
                </div>
                <div className="mt-3 grid gap-2">
                  {g.topics.map((t) => (
                    <div key={t.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm">{t.topic_name}</span>
                      </div>
                      <div className="w-1/2">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-green-400 to-green-600" style={{ width: `${t.progress_percentage}%` }} />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{t.progress_percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CoordinatorGoalTracking = () => {
  const [batch, setBatch] = useState('');
  const [college, setCollege] = useState('');
  const [year, setYear] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/coordinator/students');
      let list = res.data.data || [];
      if (batch) list = list.filter(s => (s.mss_batch || '').toString() === batch);
      if (college) list = list.filter(s => (s.college_name || '') === college);
      if (year) list = list.filter(s => ((s.year || s.year_of_study || '').toString()) === year);
      setStudents(list);
    } catch (err) {
      console.error('Failed to load students', err);
      setStudents([]);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Goal Tracking</h1>
        <p className="text-sm text-gray-500">Filter and review student goal progress.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-sm text-gray-600">Select MSS Batch</label>
          <select className="input-field mt-2" value={batch} onChange={e => setBatch(e.target.value)}>
            <option value="">All</option>
            {batches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-600">Select College</label>
          <select className="input-field mt-2" value={college} onChange={e => setCollege(e.target.value)}>
            <option value="">All</option>
            {colleges.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-600">Select Year</label>
          <select className="input-field mt-2" value={year} onChange={e => setYear(e.target.value)}>
            <option value="">All</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" onClick={loadStudents} disabled={loading}>{loading ? 'Loading…' : 'Load Students'}</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {students.length === 0 ? (
          <div className="text-sm text-gray-500">No students to display. Adjust filters and click Load Students.</div>
        ) : students.map(s => (
          <StudentCard key={s.id} student={s} onViewGoals={(stu) => setSelected(stu)} />
        ))}
      </div>

      {selected && <GoalsModal student={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default CoordinatorGoalTracking;

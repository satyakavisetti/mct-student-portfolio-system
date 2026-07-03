import React, { useEffect, useState } from 'react';
import api from '../services/api';

const SemesterDetails = () => {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSemester, setExpandedSemester] = useState(null);
  const [subjects, setSubjects] = useState({});
  const [savingSubject, setSavingSubject] = useState({});
  const [editingSubject, setEditingSubject] = useState({});
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    loadSemesters();
  }, []);

  const loadSemesters = async () => {
    try {
      setLoading(true);
      const res = await api.get('/semesters');
      setSemesters(res.data.semesters || []);
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to load semesters.' });
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async (semesterId) => {
    if (subjects[semesterId]) return;
    try {
      const res = await api.get(`/semesters/${semesterId}/subjects`);
      setSubjects(prev => ({ ...prev, [semesterId]: res.data.subjects || [] }));
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to load subjects.' });
    }
  };

  const toggleSemester = async (semesterId) => {
    if (expandedSemester === semesterId) {
      setExpandedSemester(null);
    } else {
      await loadSubjects(semesterId);
      setExpandedSemester(semesterId);
    }
  };

  const handleSubjectChange = (semesterId, index, field, value) => {
    setEditingSubject(prev => ({
      ...prev,
      [`${semesterId}-${index}`]: {
        ...prev[`${semesterId}-${index}`],
        [field]: value
      }
    }));
  };

  const saveSubject = async (semesterId, subject) => {
    setSavingSubject(prev => ({ ...prev, [subject.id]: true }));
    setMsg(null);
    try {
      const key = `${semesterId}-${subjects[semesterId].findIndex(s => s.id === subject.id)}`;
      const updates = editingSubject[key] || {};
      const updatedSubject = { ...subject, ...updates };

      await api.put(`/semesters/subjects/${subject.id}`, updatedSubject);
      
      setMsg({ type: 'success', text: 'Subject updated successfully!' });
      await loadSemesters();
      setExpandedSemester(null);
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to save subject.' });
    } finally {
      setSavingSubject(prev => ({ ...prev, [subject.id]: false }));
    }
  };

  const deleteSubject = async (subjectId, semesterId) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      await api.delete(`/semesters/subjects/${subjectId}`);
      setMsg({ type: 'success', text: 'Subject deleted successfully!' });
      await loadSemesters();
      setSubjects(prev => {
        const updated = { ...prev };
        delete updated[semesterId];
        return updated;
      });
      setExpandedSemester(null);
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to delete subject.' });
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Semester & Subjects</h1>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
          msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200'
                                 : 'bg-red-50 text-red-700 border border-red-200'
        }`}>{msg.text}</div>
      )}

      <div className="space-y-3">
        {semesters.length === 0 ? (
          <div className="card text-center text-gray-500 py-8">No semesters added yet.</div>
        ) : (
          semesters.map(sem => (
            <div key={sem.id} className="card">
              <button
                onClick={() => toggleSemester(sem.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-800">Semester {sem.semester_number}</h3>
                  <p className="text-sm text-gray-600">SGPA: {sem.sgpa ? sem.sgpa.toFixed(2) : 'N/A'}</p>
                </div>
                <span className="text-gray-400">{expandedSemester === sem.id ? '▼' : '▶'}</span>
              </button>

              {expandedSemester === sem.id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  {subjects[sem.id]?.length === 0 ? (
                    <p className="text-gray-500 text-sm">No subjects added yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {subjects[sem.id]?.map((subject, idx) => (
                        <div key={subject.id} className="bg-white p-3 rounded border border-gray-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-gray-700">Subject Name</label>
                              <input
                                type="text"
                                value={editingSubject[`${sem.id}-${idx}`]?.subject_name ?? subject.subject_name}
                                onChange={e => handleSubjectChange(sem.id, idx, 'subject_name', e.target.value)}
                                className="input-field text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700">Credits</label>
                              <input
                                type="number"
                                step="0.5"
                                value={editingSubject[`${sem.id}-${idx}`]?.credits ?? subject.credits}
                                onChange={e => handleSubjectChange(sem.id, idx, 'credits', e.target.value)}
                                className="input-field text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700">Mid1 Marks</label>
                              <input
                                type="number"
                                step="0.5"
                                value={editingSubject[`${sem.id}-${idx}`]?.mid1_marks ?? subject.mid1_marks}
                                onChange={e => handleSubjectChange(sem.id, idx, 'mid1_marks', e.target.value)}
                                className="input-field text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700">Mid2 Marks</label>
                              <input
                                type="number"
                                step="0.5"
                                value={editingSubject[`${sem.id}-${idx}`]?.mid2_marks ?? subject.mid2_marks}
                                onChange={e => handleSubjectChange(sem.id, idx, 'mid2_marks', e.target.value)}
                                className="input-field text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700">Semester Marks</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={editingSubject[`${sem.id}-${idx}`]?.semester_marks ?? subject.semester_marks}
                                onChange={e => handleSubjectChange(sem.id, idx, 'semester_marks', e.target.value)}
                                className="input-field text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700">Grade</label>
                              <input
                                type="text"
                                value={editingSubject[`${sem.id}-${idx}`]?.grade ?? subject.grade}
                                onChange={e => handleSubjectChange(sem.id, idx, 'grade', e.target.value)}
                                className="input-field text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => saveSubject(sem.id, subject)}
                              disabled={savingSubject[subject.id]}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              {savingSubject[subject.id] ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => deleteSubject(subject.id, sem.id)}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SemesterDetails;

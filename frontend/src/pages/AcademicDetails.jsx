import React, { useEffect, useState } from 'react';
import api from '../services/api';
import CollapsibleCard from '../components/CollapsibleCard';
import SemesterTable from '../components/SemesterTable';

const initialAcademicForm = {
  college_name: '', department: '', degree: '', year_of_study: '',
  cgpa: '', backlogs: '0', admission_year: '', passout_year: '',
  section: '', rollno: '',
};

const initialSchoolForm = {
  school_name: '', board: '', pass_year: '', gpa: '',
};

const initialInterForm = {
  college_name: '', board: '', ipe_marks: '', ipe_percentage: '',
  eamcet_rank: '', jee_mains_percentile: '', jee_advanced_percentile: '',
};

const initialBtechForm = {
  college_name: '', branch: '', admission_year: '', passout_year: '', current_cgpa: '',
};

const initialSubjectForm = {
  subject_name: '', mid1_marks: '', mid2_marks: '', semester_marks: '', grade: '', credits: '',
};

const AcademicDetails = () => {
  const [academicForm, setAcademicForm] = useState(initialAcademicForm);
  const [schoolForm, setSchoolForm] = useState(initialSchoolForm);
  const [interForm, setInterForm] = useState(initialInterForm);
  const [btechForm, setBtechForm] = useState(initialBtechForm);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [semesterSubjects, setSemesterSubjects] = useState({});
  const [newSemesterNumber, setNewSemesterNumber] = useState('');
  const [newSubjectForm, setNewSubjectForm] = useState(initialSubjectForm);
  const [subjectEdits, setSubjectEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [mentorAssignment, setMentorAssignment] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [academicRes, schoolRes, interRes, btechRes, semestersRes, mentorRes] = await Promise.all([
          api.get('/academic'),
          api.get('/education/school'),
          api.get('/education/intermediate'),
          api.get('/education/btech'),
          api.get('/semesters'),
          api.get('/mentor-assignments'),
        ]);

        const academic = academicRes.data.data || {};
        setAcademicForm({
          college_name: academic.college_name || '',
          department: academic.department || '',
          degree: academic.degree || '',
          year_of_study: academic.year_of_study || '',
          cgpa: academic.cgpa || '',
          backlogs: academic.backlogs ?? '0',
          admission_year: academic.admission_year || '',
          passout_year: academic.passout_year || '',
          section: academic.section || '',
          rollno: academic.rollno || '',
        });

        setSchoolForm(schoolRes.data.schoolDetails || initialSchoolForm);
        setInterForm(interRes.data.intermediateDetails || initialInterForm);
        setBtechForm(btechRes.data.btechDetails || initialBtechForm);
        setMentorAssignment(mentorRes.data?.data?.ACADEMIC || null);
        const semesterList = semestersRes.data.semesters || [];
        setSemesters(semesterList);

        if (semesterList.length > 0) {
          const firstSemesterId = semesterList[0].id;
          setSelectedSemester(firstSemesterId);
          const subjectsRes = await api.get(`/semesters/${firstSemesterId}/subjects`);
          setSemesterSubjects({ [firstSemesterId]: subjectsRes.data.subjects || [] });
        }
      } catch (error) {
        console.error('Load academic details error:', error);
        setMsg({ type: 'error', text: 'Unable to load academic information. Please refresh.' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const loadSemesters = async () => {
    try {
      const res = await api.get('/semesters');
      setSemesters(res.data.semesters || []);
    } catch (error) {
      console.error('Load semesters error:', error);
      setMsg({ type: 'error', text: 'Unable to refresh semesters.' });
    }
  };

  const loadSemesterSubjects = async (semesterId) => {
    if (!semesterId) return;
    try {
      const res = await api.get(`/semesters/${semesterId}/subjects`);
      setSemesterSubjects((prev) => ({ ...prev, [semesterId]: res.data.subjects || [] }));
    } catch (error) {
      console.error('Load subjects error:', error);
      setMsg({ type: 'error', text: 'Unable to load semester subjects.' });
    }
  };

  const handleAcademicChange = (e) => setAcademicForm({ ...academicForm, [e.target.name]: e.target.value });
  const handleSchoolChange = (e) => setSchoolForm({ ...schoolForm, [e.target.name]: e.target.value });
  const handleInterChange = (e) => setInterForm({ ...interForm, [e.target.name]: e.target.value });
  const handleBtechChange = (e) => setBtechForm({ ...btechForm, [e.target.name]: e.target.value });
  const handleNewSubjectChange = (e) => setNewSubjectForm({ ...newSubjectForm, [e.target.name]: e.target.value });

  const validateTenPointScale = (value) => {
    if (value === '' || value === null || value === undefined) return true;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 10;
  };

  const handleAcademicSubmit = async (e) => {
    e.preventDefault();
    if (!validateTenPointScale(academicForm.cgpa)) {
      setMsg({ type: 'error', text: 'CGPA must be a number between 0 and 10.' });
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      await api.post('/academic', academicForm);
      setMsg({ type: 'success', text: 'Academic details saved successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save academic details.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSchoolSubmit = async (e) => {
    e.preventDefault();
    if (!validateTenPointScale(schoolForm.gpa)) {
      setMsg({ type: 'error', text: 'School GPA must be a number between 0 and 10.' });
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      await api.put('/education/school', schoolForm);
      setMsg({ type: 'success', text: 'School details saved successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save school details.' });
    } finally {
      setSaving(false);
    }
  };

  const handleInterSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      await api.put('/education/intermediate', interForm);
      setMsg({ type: 'success', text: 'Intermediate details saved successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save intermediate details.' });
    } finally {
      setSaving(false);
    }
  };

  const handleBtechSubmit = async (e) => {
    e.preventDefault();
    if (!validateTenPointScale(btechForm.current_cgpa)) {
      setMsg({ type: 'error', text: 'Current CGPA must be a number between 0 and 10.' });
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      await api.put('/education/btech', btechForm);
      setMsg({ type: 'success', text: 'BTech details saved successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save BTech details.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSemester = async (e) => {
    e.preventDefault();
    const semesterNumber = Number(newSemesterNumber);
    if (!semesterNumber || semesterNumber <= 0) {
      setMsg({ type: 'error', text: 'Enter a valid semester number.' });
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const res = await api.put('/semesters', { semester_number: semesterNumber });
      setMsg({ type: 'success', text: 'Semester created successfully!' });
      setNewSemesterNumber('');
      await loadSemesters();
      if (res.data.semester?.id) {
        setSelectedSemester(res.data.semester.id);
        await loadSemesterSubjects(res.data.semester.id);
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create semester.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSelectSemester = async (semesterId) => {
    setSelectedSemester(semesterId);
    await loadSemesterSubjects(semesterId);
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!selectedSemester) {
      setMsg({ type: 'error', text: 'Select a semester first.' });
      return;
    }
    if (!newSubjectForm.subject_name.trim()) {
      setMsg({ type: 'error', text: 'Subject name is required.' });
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      await api.post(`/semesters/${selectedSemester}/subjects`, newSubjectForm);
      setMsg({ type: 'success', text: 'Subject added successfully!' });
      setNewSubjectForm(initialSubjectForm);
      await loadSemesterSubjects(selectedSemester);
      await loadSemesters();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to add subject.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubjectChange = (semesterId, subjectId, field, value) => {
    setSubjectEdits((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]: value,
      },
    }));
  };

  const overallCGPA = React.useMemo(() => {
    if (!semesters || semesters.length === 0) return null;
    let weightedSum = 0;
    let totalCredits = 0;
    semesters.forEach((sem) => {
      const sgpa = Number(sem.sgpa);
      const credits = Number(sem.total_credits) || 0;
      if (!Number.isNaN(sgpa) && credits > 0) {
        weightedSum += sgpa * credits;
        totalCredits += credits;
      }
    });
    if (totalCredits === 0) return null;
    return Number((weightedSum / totalCredits).toFixed(2));
  }, [semesters]);

  const handleUpdateSubject = async (subject) => {
    const updated = {
      subject_name: subjectEdits[subject.id]?.subject_name ?? subject.subject_name,
      mid1_marks: subjectEdits[subject.id]?.mid1_marks ?? subject.mid1_marks,
      mid2_marks: subjectEdits[subject.id]?.mid2_marks ?? subject.mid2_marks,
      semester_marks: subjectEdits[subject.id]?.semester_marks ?? subject.semester_marks,
      grade: subjectEdits[subject.id]?.grade ?? subject.grade,
      credits: subjectEdits[subject.id]?.credits ?? subject.credits,
    };

    if (!updated.subject_name.trim()) {
      setMsg({ type: 'error', text: 'Subject name is required.' });
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      await api.put(`/semesters/subjects/${subject.id}`, updated);
      setMsg({ type: 'success', text: 'Subject updated successfully!' });
      await loadSemesterSubjects(selectedSemester);
      await loadSemesters();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update subject.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('Delete this subject?')) return;
    setSaving(true);
    setMsg(null);

    try {
      await api.delete(`/semesters/subjects/${subjectId}`);
      setMsg({ type: 'success', text: 'Subject deleted successfully!' });
      await loadSemesterSubjects(selectedSemester);
      await loadSemesters();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to delete subject.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Academic Details</h1>
          <p className="text-sm text-gray-500">Manage your education profile, academic history, and semester records.</p>
        </div>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200'
                                 : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="card p-6">
          <h2 className="section-title">Current Academic Profile</h2>
          <form onSubmit={handleAcademicSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">College Name</label>
              <input name="college_name" value={academicForm.college_name} onChange={handleAcademicChange} className="input-field" placeholder="XYZ College of Engineering" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input name="department" value={academicForm.department} onChange={handleAcademicChange} className="input-field" placeholder="Computer Science" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
                <input name="degree" value={academicForm.degree} onChange={handleAcademicChange} className="input-field" placeholder="B.Tech" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year of Study</label>
                <select name="year_of_study" value={academicForm.year_of_study} onChange={handleAcademicChange} className="input-field">
                  <option value="">Select year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CGPA</label>
                <input name="cgpa" type="number" step="0.01" min="0" max="10" value={academicForm.cgpa} onChange={handleAcademicChange} className="input-field" placeholder="8.5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Backlogs</label>
                <input name="backlogs" type="number" min="0" value={academicForm.backlogs} onChange={handleAcademicChange} className="input-field" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <input name="section" value={academicForm.section} onChange={handleAcademicChange} className="input-field" placeholder="A" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                <input name="rollno" value={academicForm.rollno} onChange={handleAcademicChange} className="input-field" placeholder="22CS001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admission Year</label>
                <input name="admission_year" type="number" value={academicForm.admission_year} onChange={handleAcademicChange} className="input-field" placeholder="2022" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passout Year</label>
                <input name="passout_year" type="number" value={academicForm.passout_year} onChange={handleAcademicChange} className="input-field" placeholder="2026" />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Academic Profile'}
              </button>
            </div>
          </form>
        </section>

        <section className="card p-6">
          <h2 className="section-title">School & Pre-University</h2>
          <div className="space-y-6 mt-4">
            <form onSubmit={handleSchoolSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                <input name="school_name" value={schoolForm.school_name} onChange={handleSchoolChange} className="input-field" placeholder="School name" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Board</label>
                  <input name="board" value={schoolForm.board} onChange={handleSchoolChange} className="input-field" placeholder="CBSE, ICSE, SSC" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pass Year</label>
                  <input name="pass_year" type="number" value={schoolForm.pass_year} onChange={handleSchoolChange} className="input-field" placeholder="2020" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GPA</label>
                  <input name="gpa" type="number" step="0.01" min="0" max="10" value={schoolForm.gpa} onChange={handleSchoolChange} className="input-field" placeholder="8.5" />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save School Details'}
                </button>
              </div>
            </form>

            <form onSubmit={handleInterSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Intermediate College</label>
                <input name="college_name" value={interForm.college_name} onChange={handleInterChange} className="input-field" placeholder="College name" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Board</label>
                  <input name="board" value={interForm.board} onChange={handleInterChange} className="input-field" placeholder="AP, TS, CBSE" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IPE Marks</label>
                  <input name="ipe_marks" type="number" value={interForm.ipe_marks} onChange={handleInterChange} className="input-field" placeholder="500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IPE Percentage</label>
                  <input name="ipe_percentage" type="number" step="0.01" min="0" max="100" value={interForm.ipe_percentage} onChange={handleInterChange} className="input-field" placeholder="95.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">EAMCET Rank</label>
                  <input name="eamcet_rank" type="number" value={interForm.eamcet_rank} onChange={handleInterChange} className="input-field" placeholder="5000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">JEE Mains Percentile</label>
                  <input name="jee_mains_percentile" type="number" step="0.01" min="0" max="100" value={interForm.jee_mains_percentile} onChange={handleInterChange} className="input-field" placeholder="95.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">JEE Advanced Percentile</label>
                  <input name="jee_advanced_percentile" type="number" step="0.01" min="0" max="100" value={interForm.jee_advanced_percentile} onChange={handleInterChange} className="input-field" placeholder="85.5" />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Intermediate Details'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      <section className="card p-6">
        <h2 className="section-title">BTech & Semester Tracker</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">BTech Details</h3>
              <form onSubmit={handleBtechSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">College Name</label>
                    <input name="college_name" value={btechForm.college_name} onChange={handleBtechChange} className="input-field" placeholder="College name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                    <input name="branch" value={btechForm.branch} onChange={handleBtechChange} className="input-field" placeholder="CSE, ECE, EEE" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admission Year</label>
                    <input name="admission_year" type="number" value={btechForm.admission_year} onChange={handleBtechChange} className="input-field" placeholder="2020" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Passout Year</label>
                    <input name="passout_year" type="number" value={btechForm.passout_year} onChange={handleBtechChange} className="input-field" placeholder="2024" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current CGPA</label>
                    <input name="current_cgpa" type="number" step="0.01" min="0" max="10" value={btechForm.current_cgpa} onChange={handleBtechChange} className="input-field" placeholder="8.5" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save BTech Details'}
                  </button>
                </div>
              </form>
            </div>

            {overallCGPA !== null && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                <p className="font-semibold">Calculated CGPA</p>
                <p className="mt-1">{overallCGPA.toFixed(2)} / 10 based on semester SGPA and credit weight.</p>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">Semester History</h3>
                  <p className="text-sm text-gray-500">Add semesters and manage subjects in the selected semester.</p>
                </div>
                <form onSubmit={handleCreateSemester} className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="1"
                    value={newSemesterNumber}
                    onChange={(e) => setNewSemesterNumber(e.target.value)}
                    className="input-field w-28"
                    placeholder="Sem #"
                  />
                  <button type="submit" className="btn-primary" disabled={saving}>
                    Add
                  </button>
                </form>
              </div>

              <div className="mt-5 space-y-3">
                {semesters.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 p-4 text-gray-500">No semesters created yet.</div>
                ) : (
                  semesters.map((sem) => (
                    <button
                      key={sem.id}
                      type="button"
                      onClick={() => handleSelectSemester(sem.id)}
                      className={`w-full text-left rounded-xl border p-4 transition ${selectedSemester === sem.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-gray-800">Semester {sem.semester_number}</span>
                        <span className="text-sm text-gray-600">SGPA: {sem.sgpa ? `${Number(sem.sgpa).toFixed(2)} / 10` : 'N/A'}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Subjects</h3>

            {!selectedSemester ? (
              <p className="text-sm text-gray-500">Select a semester to manage subjects.</p>
            ) : (
              <>
                <SemesterTable
                  subjects={semesterSubjects[selectedSemester] || []}
                  onChange={(subjectId, field, value) => handleSubjectChange(selectedSemester, subjectId, field, value)}
                  onSave={(s) => handleUpdateSubject(s)}
                  onDelete={(id) => handleDeleteSubject(id)}
                />

                <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                  <h4 className="font-semibold mb-3">Add New Subject</h4>
                  <form onSubmit={handleAddSubject} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input name="subject_name" value={newSubjectForm.subject_name} onChange={handleNewSubjectChange} className="input-field" placeholder="Subject" />
                    <input name="credits" value={newSubjectForm.credits} onChange={handleNewSubjectChange} className="input-field" placeholder="Credits" />
                    <input name="mid1_marks" value={newSubjectForm.mid1_marks} onChange={handleNewSubjectChange} className="input-field" placeholder="Mid1" />
                    <input name="mid2_marks" value={newSubjectForm.mid2_marks} onChange={handleNewSubjectChange} className="input-field" placeholder="Mid2" />
                    <input name="semester_marks" value={newSubjectForm.semester_marks} onChange={handleNewSubjectChange} className="input-field" placeholder="Sem Marks" />
                    <input name="grade" value={newSubjectForm.grade} onChange={handleNewSubjectChange} className="input-field" placeholder="Grade" />
                    <div className="sm:col-span-3 flex justify-end mt-2"><button className="btn-primary">Add Subject</button></div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AcademicDetails;

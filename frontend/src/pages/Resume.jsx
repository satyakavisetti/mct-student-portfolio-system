import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';

const Resume = () => {
  const [resume, setResume]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg]         = useState(null);
  const [mentorAssignment, setMentorAssignment] = useState(null);
  const fileRef               = useRef();

  const load = async () => {
    try {
      const [resumeRes, mentorRes] = await Promise.all([
        api.get('/resume'),
        api.get('/mentor-assignments'),
      ]);
      setResume(resumeRes.data.data);
      setMentorAssignment(mentorRes.data?.data?.RESUME || null);
    }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('resume', file);
    setUploading(true);
    setMsg(null);
    try {
      await api.post('/resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg({ type: 'success', text: 'Resume uploaded successfully!' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed.' });
    } finally { setUploading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete your resume?')) return;
    try {
      await api.delete('/resume');
      setResume(null);
      setMsg({ type: 'success', text: 'Resume deleted.' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Delete failed.' });
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="max-w-xl space-y-4">
      {mentorAssignment && (
        <div className="rounded-[20px] border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-600 text-xl text-white">📄</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Resume Mentor</p>
              <p className="text-sm text-slate-700">{mentorAssignment.mentor_name || 'Not assigned'}</p>
              <p className="text-xs text-slate-500">{mentorAssignment.mentor_phone || ''}{mentorAssignment.mentor_phone && mentorAssignment.mentor_email ? ' · ' : ''}{mentorAssignment.mentor_email || ''}</p>
            </div>
          </div>
          {mentorAssignment.department && <div className="mt-3 text-xs text-slate-600"><span className="rounded-full bg-white px-2.5 py-1">{mentorAssignment.department}</span></div>}
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-800">Resume</h1>

      {msg && <div className={`px-4 py-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}

      {resume ? (
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-2xl">📄</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{resume.file_name}</p>
              <p className="text-xs text-gray-500">{formatSize(resume.file_size)} · Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <a
              href={`/${resume.file_path}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-sm"
            >
              View Resume
            </a>
            <button onClick={() => fileRef.current.click()} className="btn-primary text-sm" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Replace Resume'}
            </button>
            <button onClick={handleDelete} className="btn-danger text-sm">Delete</button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div
            onClick={() => fileRef.current.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="text-4xl mb-3">📤</div>
            <p className="font-medium text-gray-700">Click to upload your resume</p>
            <p className="text-sm text-gray-400 mt-1">PDF or Word · Max 5MB</p>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleUpload}
      />

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          Uploading...
        </div>
      )}
    </div>
  );
};

export default Resume;

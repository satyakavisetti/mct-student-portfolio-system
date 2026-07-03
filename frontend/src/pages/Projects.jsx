import React, { useEffect, useState } from 'react';
import api from '../services/api';

const emptyForm = { title: '', description: '', tech_stack: '', github_url: '', live_url: '', start_date: '', end_date: '' };

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [form, setForm]         = useState(emptyForm);
  const [editId, setEditId]     = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);
  const [mentorAssignment, setMentorAssignment] = useState(null);

  const load = async () => {
    try {
      const [projectsRes, mentorRes] = await Promise.all([
        api.get('/projects'),
        api.get('/mentor-assignments'),
      ]);
      setProjects(projectsRes.data.data);
      setMentorAssignment(mentorRes.data?.data?.PROJECT || null);
    }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setForm(emptyForm); setEditId(null); setShowForm(true); setMsg(null); };
  const openEdit = (p) => {
    setForm({ title: p.title, description: p.description || '', tech_stack: p.tech_stack || '',
      github_url: p.github_url || '', live_url: p.live_url || '',
      start_date: p.start_date ? p.start_date.substring(0,10) : '',
      end_date:   p.end_date   ? p.end_date.substring(0,10)   : '' });
    setEditId(p.id); setShowForm(true); setMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      editId ? await api.put(`/projects/${editId}`, form) : await api.post('/projects', form);
      setShowForm(false);
      setMsg({ type: 'success', text: editId ? 'Project updated!' : 'Project added!' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Save failed.' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try { await api.delete(`/projects/${id}`); load(); }
    catch (err) { alert('Delete failed.'); }
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="max-w-3xl space-y-4">
      {mentorAssignment && (
        <div className="rounded-[20px] border border-indigo-100 bg-gradient-to-r from-indigo-50 to-slate-50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-xl text-white">💻</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Project Mentor</p>
              <p className="text-sm text-slate-700">{mentorAssignment.mentor_name || 'Not assigned'}</p>
              <p className="text-xs text-slate-500">{mentorAssignment.mentor_phone || ''}{mentorAssignment.mentor_phone && mentorAssignment.mentor_email ? ' · ' : ''}{mentorAssignment.mentor_email || ''}</p>
            </div>
          </div>
          {mentorAssignment.department && <div className="mt-3 text-xs text-slate-600"><span className="rounded-full bg-white px-2.5 py-1">{mentorAssignment.department}</span></div>}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Projects</h1>
        <button onClick={openAdd} className="btn-primary">+ Add Project</button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}

      {showForm && (
        <div className="card">
          <h2 className="section-title">{editId ? 'Edit Project' : 'New Project'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input placeholder="Project Title *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-field" required />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field" rows={3} />
            <input placeholder="Tech Stack (e.g. React, Node.js, PostgreSQL)" value={form.tech_stack} onChange={e => setForm({...form, tech_stack: e.target.value})} className="input-field" />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="GitHub URL" value={form.github_url} onChange={e => setForm({...form, github_url: e.target.value})} className="input-field" />
              <input placeholder="Live URL" value={form.live_url} onChange={e => setForm({...form, live_url: e.target.value})} className="input-field" />
              <div>
                <label className="text-xs text-gray-500">Start Date</label>
                <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-500">End Date</label>
                <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="input-field" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">No projects yet.</div>
      ) : (
        projects.map(p => (
          <div key={p.id} className="card">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 text-lg">{p.title}</h3>
                {p.tech_stack && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.tech_stack.split(',').map((t, i) => (
                      <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{t.trim()}</span>
                    ))}
                  </div>
                )}
                {p.description && <p className="text-sm text-gray-600 mt-2">{p.description}</p>}
                <div className="flex gap-3 mt-2">
                  {p.github_url && <a href={p.github_url} target="_blank" rel="noreferrer" className="text-xs text-gray-600 hover:text-blue-600">GitHub →</a>}
                  {p.live_url   && <a href={p.live_url}   target="_blank" rel="noreferrer" className="text-xs text-gray-600 hover:text-blue-600">Live →</a>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Projects;

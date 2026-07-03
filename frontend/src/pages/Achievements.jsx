import React, { useEffect, useState } from 'react';
import api from '../services/api';

const CATEGORIES = ['Academic', 'Sports', 'Cultural', 'Technical', 'Leadership', 'Community', 'Other'];
const emptyForm  = { title: '', description: '', date_achieved: '', category: '' };

const Achievements = () => {
  const [items, setItems]       = useState([]);
  const [form, setForm]         = useState(emptyForm);
  const [editId, setEditId]     = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);

  const load = async () => {
    try { const res = await api.get('/achievements'); setItems(res.data.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setForm(emptyForm); setEditId(null); setShowForm(true); setMsg(null); };
  const openEdit = (a) => {
    setForm({ title: a.title, description: a.description || '',
      date_achieved: a.date_achieved ? a.date_achieved.substring(0,10) : '',
      category: a.category || '' });
    setEditId(a.id); setShowForm(true); setMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      editId ? await api.put(`/achievements/${editId}`, form) : await api.post('/achievements', form);
      setShowForm(false);
      setMsg({ type: 'success', text: editId ? 'Updated!' : 'Achievement added!' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Save failed.' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this achievement?')) return;
    try { await api.delete(`/achievements/${id}`); load(); }
    catch { alert('Delete failed.'); }
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Achievements</h1>
        <button onClick={openAdd} className="btn-primary">+ Add Achievement</button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}

      {showForm && (
        <div className="card">
          <h2 className="section-title">{editId ? 'Edit' : 'New'} Achievement</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input placeholder="Achievement Title *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-field" required />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input-field">
                <option value="">Category</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <input type="date" value={form.date_achieved} onChange={e => setForm({...form, date_achieved: e.target.value})} className="input-field" />
            </div>
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field" rows={2} />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">No achievements yet.</div>
      ) : items.map(a => (
        <div key={a.id} className="card flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-800">{a.title}</h3>
              {a.category && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{a.category}</span>}
            </div>
            {a.description && <p className="text-sm text-gray-600 mt-1">{a.description}</p>}
            {a.date_achieved && <p className="text-xs text-gray-400 mt-1">{new Date(a.date_achieved).toLocaleDateString()}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => openEdit(a)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
            <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Achievements;

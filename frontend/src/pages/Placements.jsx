import React, { useEffect, useState } from 'react';
import api from '../services/api';

const emptyForm = { company_name: '', role: '', package_lpa: '', placement_type: '', offer_date: '', joining_date: '', status: 'pending' };

const Placements = () => {
  const [items, setItems]       = useState([]);
  const [form, setForm]         = useState(emptyForm);
  const [editId, setEditId]     = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);

  const load = async () => {
    try { const res = await api.get('/placements'); setItems(res.data.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setForm(emptyForm); setEditId(null); setShowForm(true); setMsg(null); };
  const openEdit = (p) => {
    setForm({ company_name: p.company_name, role: p.role || '', package_lpa: p.package_lpa || '',
      placement_type: p.placement_type || '', status: p.status || 'pending',
      offer_date:   p.offer_date   ? p.offer_date.substring(0,10)   : '',
      joining_date: p.joining_date ? p.joining_date.substring(0,10) : '' });
    setEditId(p.id); setShowForm(true); setMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      editId ? await api.put(`/placements/${editId}`, form) : await api.post('/placements', form);
      setShowForm(false);
      setMsg({ type: 'success', text: editId ? 'Updated!' : 'Placement added!' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Save failed.' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this placement?')) return;
    try { await api.delete(`/placements/${id}`); load(); }
    catch { alert('Delete failed.'); }
  };

  const statusColor = (s) => {
    if (s === 'accepted') return 'bg-green-100 text-green-700';
    if (s === 'rejected') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Placements</h1>
        <button onClick={openAdd} className="btn-primary">+ Add Placement</button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}

      {showForm && (
        <div className="card">
          <h2 className="section-title">{editId ? 'Edit' : 'New'} Placement</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Company Name *" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} className="input-field col-span-2" required />
              <input placeholder="Role / Position" value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="input-field" />
              <input placeholder="Package (LPA)" type="number" step="0.01" value={form.package_lpa} onChange={e => setForm({...form, package_lpa: e.target.value})} className="input-field" />
              <select value={form.placement_type} onChange={e => setForm({...form, placement_type: e.target.value})} className="input-field">
                <option value="">Type</option>
                <option value="internship">Internship</option>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
              </select>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input-field">
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
              <div><label className="text-xs text-gray-500">Offer Date</label>
                <input type="date" value={form.offer_date} onChange={e => setForm({...form, offer_date: e.target.value})} className="input-field" /></div>
              <div><label className="text-xs text-gray-500">Joining Date</label>
                <input type="date" value={form.joining_date} onChange={e => setForm({...form, joining_date: e.target.value})} className="input-field" /></div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">No placement records yet.</div>
      ) : items.map(p => (
        <div key={p.id} className="card flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-800 text-lg">{p.company_name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(p.status)}`}>{p.status}</span>
            </div>
            {p.role && <p className="text-sm text-gray-600">{p.role}</p>}
            <div className="flex gap-3 text-xs text-gray-500 mt-1">
              {p.package_lpa && <span>💰 {p.package_lpa} LPA</span>}
              {p.placement_type && <span className="capitalize">📋 {p.placement_type.replace('_', ' ')}</span>}
              {p.offer_date && <span>📅 {new Date(p.offer_date).toLocaleDateString()}</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
            <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Placements;

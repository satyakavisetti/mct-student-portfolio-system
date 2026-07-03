import React, { useEffect, useState } from 'react';
import api from '../services/api';

const emptyForm = { title: '', issuing_organization: '', issue_date: '', expiry_date: '', credential_id: '', credential_url: '' };

const Certifications = () => {
  const [items, setItems]       = useState([]);
  const [form, setForm]         = useState(emptyForm);
  const [editId, setEditId]     = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);

  const load = async () => {
    try { const res = await api.get('/certifications'); setItems(res.data.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setForm(emptyForm); setEditId(null); setShowForm(true); setMsg(null); };
  const openEdit = (c) => {
    setForm({ title: c.title, issuing_organization: c.issuing_organization || '',
      issue_date: c.issue_date ? c.issue_date.substring(0,10) : '',
      expiry_date: c.expiry_date ? c.expiry_date.substring(0,10) : '',
      credential_id: c.credential_id || '', credential_url: c.credential_url || '' });
    setEditId(c.id); setShowForm(true); setMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      editId ? await api.put(`/certifications/${editId}`, form) : await api.post('/certifications', form);
      setShowForm(false);
      setMsg({ type: 'success', text: editId ? 'Updated!' : 'Added!' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Save failed.' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this certification?')) return;
    try { await api.delete(`/certifications/${id}`); load(); }
    catch { alert('Delete failed.'); }
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Certifications</h1>
        <button onClick={openAdd} className="btn-primary">+ Add Certification</button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}

      {showForm && (
        <div className="card">
          <h2 className="section-title">{editId ? 'Edit' : 'New'} Certification</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input placeholder="Certification Title *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-field" required />
            <input placeholder="Issuing Organization" value={form.issuing_organization} onChange={e => setForm({...form, issuing_organization: e.target.value})} className="input-field" />
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500">Issue Date</label>
                <input type="date" value={form.issue_date} onChange={e => setForm({...form, issue_date: e.target.value})} className="input-field" /></div>
              <div><label className="text-xs text-gray-500">Expiry Date</label>
                <input type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} className="input-field" /></div>
            </div>
            <input placeholder="Credential ID" value={form.credential_id} onChange={e => setForm({...form, credential_id: e.target.value})} className="input-field" />
            <input placeholder="Credential URL" value={form.credential_url} onChange={e => setForm({...form, credential_url: e.target.value})} className="input-field" />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">No certifications yet.</div>
      ) : items.map(c => (
        <div key={c.id} className="card flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-800">{c.title}</h3>
            {c.issuing_organization && <p className="text-sm text-gray-600">{c.issuing_organization}</p>}
            <div className="flex gap-3 text-xs text-gray-500 mt-1">
              {c.issue_date && <span>Issued: {new Date(c.issue_date).toLocaleDateString()}</span>}
              {c.expiry_date && <span>Expires: {new Date(c.expiry_date).toLocaleDateString()}</span>}
            </div>
            {c.credential_url && <a href={c.credential_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">View Credential →</a>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
            <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Certifications;

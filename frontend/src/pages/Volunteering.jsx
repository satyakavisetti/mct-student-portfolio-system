import React, { useEffect, useState } from 'react';
import api from '../services/api';

const CATEGORIES = ['Community', 'Education', 'Environment', 'Healthcare', 'Events', 'Leadership', 'Other'];
const emptyForm = {
  title: '',
  organization: '',
  role: '',
  description: '',
  start_date: '',
  end_date: '',
  hours: '',
  category: '',
  certificate_url: '',
};

const Volunteering = () => {
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/volunteering');
      setActivities(res.data.data);
    } catch (err) {
      console.error('Load volunteering failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
    setMsg(null);
  };

  const openEdit = (item) => {
    setForm({
      title: item.title,
      organization: item.organization,
      role: item.role || '',
      description: item.description || '',
      start_date: item.start_date ? item.start_date.substring(0, 10) : '',
      end_date: item.end_date ? item.end_date.substring(0, 10) : '',
      hours: item.hours != null ? String(item.hours) : '',
      category: item.category || '',
      certificate_url: item.certificate_url || '',
    });
    setEditId(item.id);
    setShowForm(true);
    setMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!form.title || !form.organization || !form.start_date) {
        setMsg({ type: 'error', text: 'Title, organization, and start date are required.' });
        setSaving(false);
        return;
      }

      if (editId) {
        await api.put(`/volunteering/${editId}`, form);
        setMsg({ type: 'success', text: 'Volunteering activity updated.' });
      } else {
        await api.post('/volunteering', form);
        setMsg({ type: 'success', text: 'Volunteering activity added.' });
      }
      setShowForm(false);
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this volunteering activity?')) return;
    try {
      await api.delete(`/volunteering/${id}`);
      load();
    } catch (err) {
      console.error('Delete volunteering failed:', err);
      alert('Delete failed.');
    }
  };

  const handleCertificateChange = (event, id) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    setUploadingId(file ? id : null);
  };

  const handleUploadCertificate = async (id) => {
    if (!selectedFile || uploadingId !== id) {
      alert('Please choose a certificate file first.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('certificate', selectedFile);

    try {
      await api.post(`/volunteering/${id}/certificate`, formData);
      setMsg({ type: 'success', text: 'Certificate uploaded successfully.' });
      setSelectedFile(null);
      setUploadingId(null);
      load();
    } catch (err) {
      console.error('Upload certificate failed:', err);
      setMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed.' });
    } finally {
      setUploading(false);
    }
  };

  const renderActivity = (activity) => (
    <div key={activity.id} className="card p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{activity.title}</h3>
          <p className="text-sm text-gray-600">{activity.organization} • {activity.category || 'Other'}</p>
          {activity.role && <p className="text-sm text-gray-600 mt-1">Role: {activity.role}</p>}
          {activity.hours != null && <p className="text-sm text-gray-600 mt-1">Hours: {activity.hours}</p>}
          <p className="text-xs text-gray-500 mt-1">{activity.start_date ? new Date(activity.start_date).toLocaleDateString() : 'N/A'}{activity.end_date ? ` — ${new Date(activity.end_date).toLocaleDateString()}` : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => openEdit(activity)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
          <button onClick={() => handleDelete(activity.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
          {activity.certificate_url && (
            <a href={activity.certificate_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">Certificate</a>
          )}
        </div>
      </div>
      {activity.description && <p className="text-sm text-gray-700 mt-3">{activity.description}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Volunteering</h1>
          <p className="text-sm text-gray-500">Track volunteering activities, hours and certificates.</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Add Activity</button>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      {showForm && (
        <div className="card p-4">
          <h2 className="section-title">{editId ? 'Edit Volunteering Activity' : 'New Volunteering Activity'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3 mt-3">
            <input
              placeholder="Activity Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field"
              required
            />
            <input
              placeholder="Organization *"
              value={form.organization}
              onChange={(e) => setForm({ ...form, organization: e.target.value })}
              className="input-field"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                placeholder="Role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="input-field"
              />
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input-field"
              >
                <option value="">Category</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <textarea
              rows={3}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="input-field"
                required
              />
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="input-field"
              />
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="Hours"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                className="input-field"
              />
            </div>
            <input
              placeholder="Certificate URL"
              value={form.certificate_url}
              onChange={(e) => setForm({ ...form, certificate_url: e.target.value })}
              className="input-field"
            />
            <div className="flex gap-2 flex-wrap">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {activities.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">No volunteering activities recorded yet.</div>
      ) : (
        <div className="space-y-4">
          {activities.map(renderActivity)}
        </div>
      )}
    </div>
  );
};

export default Volunteering;

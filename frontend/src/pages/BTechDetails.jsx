import React, { useEffect, useState } from 'react';
import api from '../services/api';

const initialForm = {
  college_name: '',
  branch: '',
  admission_year: '',
  passout_year: '',
  current_cgpa: '',
};

const BTechDetails = () => {
  const [form, setForm]       = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState(null);

  useEffect(() => {
    api.get('/education/btech').then(res => {
      if (res.data.btechDetails) {
        setForm(res.data.btechDetails);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.put('/education/btech', form);
      setMsg({ type: 'success', text: 'BTech details saved successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">BTech Details</h1>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
          msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200'
                                 : 'bg-red-50 text-red-700 border border-red-200'
        }`}>{msg.text}</div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">College Name</label>
            <input name="college_name" value={form.college_name} onChange={handleChange} className="input-field" placeholder="College name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <input name="branch" value={form.branch} onChange={handleChange} className="input-field" placeholder="CSE, ECE, EEE, etc." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admission Year</label>
            <input name="admission_year" type="number" value={form.admission_year} onChange={handleChange} className="input-field" placeholder="2020" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passout Year</label>
            <input name="passout_year" type="number" value={form.passout_year} onChange={handleChange} className="input-field" placeholder="2024" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current CGPA</label>
            <input name="current_cgpa" type="number" step="0.01" min="0" max="10" value={form.current_cgpa} onChange={handleChange} className="input-field" placeholder="8.5" />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BTechDetails;

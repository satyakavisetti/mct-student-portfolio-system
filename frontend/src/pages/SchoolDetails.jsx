import React, { useEffect, useState } from 'react';
import api from '../services/api';

const initialForm = {
  school_name: '',
  board: '',
  pass_year: '',
  gpa: '',
};

const SchoolDetails = () => {
  const [form, setForm]       = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState(null);

  useEffect(() => {
    api.get('/education/school').then(res => {
      if (res.data.schoolDetails) {
        setForm(res.data.schoolDetails);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.put('/education/school', form);
      setMsg({ type: 'success', text: 'School details saved successfully!' });
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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">School Details</h1>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
          msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200'
                                 : 'bg-red-50 text-red-700 border border-red-200'
        }`}>{msg.text}</div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
            <input name="school_name" value={form.school_name} onChange={handleChange} className="input-field" placeholder="School name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Board</label>
            <input name="board" value={form.board} onChange={handleChange} className="input-field" placeholder="CBSE, ICSE, SSC, etc." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pass Year</label>
            <input name="pass_year" type="number" value={form.pass_year} onChange={handleChange} className="input-field" placeholder="2020" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GPA</label>
            <input name="gpa" type="number" step="0.01" min="0" max="10" value={form.gpa} onChange={handleChange} className="input-field" placeholder="8.5" />
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

export default SchoolDetails;

import React, { useEffect, useState } from 'react';
import api from '../services/api';

const initialForm = {
  college_name: '',
  board: '',
  ipe_marks: '',
  ipe_percentage: '',
  eamcet_rank: '',
  jee_mains_percentile: '',
  jee_advanced_percentile: '',
};

const InterDetails = () => {
  const [form, setForm]       = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState(null);

  useEffect(() => {
    api.get('/education/intermediate').then(res => {
      if (res.data.intermediateDetails) {
        setForm(res.data.intermediateDetails);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.put('/education/intermediate', form);
      setMsg({ type: 'success', text: 'Intermediate details saved successfully!' });
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
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Intermediate (12th) Details</h1>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Board</label>
            <input name="board" value={form.board} onChange={handleChange} className="input-field" placeholder="AP, TS, CBSE, etc." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IPE Marks</label>
            <input name="ipe_marks" type="number" value={form.ipe_marks} onChange={handleChange} className="input-field" placeholder="500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IPE Percentage</label>
            <input name="ipe_percentage" type="number" step="0.01" min="0" max="100" value={form.ipe_percentage} onChange={handleChange} className="input-field" placeholder="95.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">EAMCET Rank</label>
            <input name="eamcet_rank" type="number" value={form.eamcet_rank} onChange={handleChange} className="input-field" placeholder="5000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">JEE Mains Percentile</label>
            <input name="jee_mains_percentile" type="number" step="0.01" min="0" max="100" value={form.jee_mains_percentile} onChange={handleChange} className="input-field" placeholder="95.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">JEE Advanced Percentile</label>
            <input name="jee_advanced_percentile" type="number" step="0.01" min="0" max="100" value={form.jee_advanced_percentile} onChange={handleChange} className="input-field" placeholder="85.5" />
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

export default InterDetails;

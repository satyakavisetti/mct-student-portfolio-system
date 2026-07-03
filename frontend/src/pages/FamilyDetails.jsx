import React, { useEffect, useState } from 'react';
import api from '../services/api';

const initialForm = {
  father_name: '',
  father_occupation: '',
  mother_name: '',
  mother_occupation: '',
};

const FamilyDetails = () => {
  const [form, setForm]       = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState(null);

  useEffect(() => {
    api.get('/family').then(res => {
      if (res.data.familyDetails) {
        setForm(res.data.familyDetails);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.put('/family', form);
      setMsg({ type: 'success', text: 'Family details saved successfully!' });
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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Family Details</h1>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
          msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200'
                                 : 'bg-red-50 text-red-700 border border-red-200'
        }`}>{msg.text}</div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label>
            <input name="father_name" value={form.father_name} onChange={handleChange} className="input-field" placeholder="Father's full name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Father's Occupation</label>
            <input name="father_occupation" value={form.father_occupation} onChange={handleChange} className="input-field" placeholder="Occupation" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Name</label>
            <input name="mother_name" value={form.mother_name} onChange={handleChange} className="input-field" placeholder="Mother's full name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Occupation</label>
            <input name="mother_occupation" value={form.mother_occupation} onChange={handleChange} className="input-field" placeholder="Occupation" />
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

export default FamilyDetails;

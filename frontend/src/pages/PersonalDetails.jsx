import React, { useEffect, useState } from 'react';
import api from '../services/api';

const initialPersonalForm = {
  full_name: '', email: '', phone: '', date_of_birth: '',
  gender: '', address: '', city: '', state: '', pincode: '',
};

const initialFamilyForm = {
  father_name: '', father_occupation: '', mother_name: '', mother_occupation: '',
};

const initialSiblingForm = {
  sibling_name: '', education: '', occupation: '',
};

const PersonalDetails = () => {
  const [personalForm, setPersonalForm] = useState(initialPersonalForm);
  const [familyForm, setFamilyForm] = useState(initialFamilyForm);
  const [siblings, setSiblings] = useState([]);
  const [siblingForm, setSiblingForm] = useState(initialSiblingForm);
  const [editingSiblingId, setEditingSiblingId] = useState(null);
  const [mentorInfo, setMentorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingFamily, setSavingFamily] = useState(false);
  const [savingSibling, setSavingSibling] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [personalRes, familyRes, siblingsRes] = await Promise.all([
          api.get('/personal'),
          api.get('/family'),
          api.get('/siblings'),
        ]);

        const personal = personalRes.data.data || {};
        setPersonalForm({
          full_name: personal.full_name || '',
          email: personal.email || '',
          phone: personal.phone || '',
          date_of_birth: personal.date_of_birth ? personal.date_of_birth.substring(0, 10) : '',
          gender: personal.gender || '',
          address: personal.address || '',
          city: personal.city || '',
          state: personal.state || '',
          pincode: personal.pincode || '',
        });

        setMentorInfo({
          mentor_name: personal.mentor_name || 'Not assigned',
          mentor_phone: personal.mentor_phone || 'N/A',
          mentor_email: personal.mentor_email || 'N/A',
          block_name: personal.block_name || 'Not assigned',
        });

        setFamilyForm(familyRes.data.familyDetails || initialFamilyForm);
        setSiblings(siblingsRes.data.siblings || []);
      } catch (error) {
        console.error('Load personal details error:', error);
        setMsg({ type: 'error', text: 'Unable to load profile information. Please refresh.' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handlePersonalChange = (e) => setPersonalForm({ ...personalForm, [e.target.name]: e.target.value });
  const handleFamilyChange = (e) => setFamilyForm({ ...familyForm, [e.target.name]: e.target.value });
  const handleSiblingChange = (e) => setSiblingForm({ ...siblingForm, [e.target.name]: e.target.value });

  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    setSavingPersonal(true);
    setMsg(null);

    try {
      await api.post('/personal', personalForm);
      setMsg({ type: 'success', text: 'Personal details saved successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save personal details.' });
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleFamilySubmit = async (e) => {
    e.preventDefault();
    setSavingFamily(true);
    setMsg(null);

    try {
      await api.put('/family', familyForm);
      setMsg({ type: 'success', text: 'Family details saved successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save family details.' });
    } finally {
      setSavingFamily(false);
    }
  };

  const resetSiblingForm = () => {
    setSiblingForm(initialSiblingForm);
    setEditingSiblingId(null);
  };

  const loadSiblings = async () => {
    try {
      const res = await api.get('/siblings');
      setSiblings(res.data.siblings || []);
    } catch (err) {
      console.error('Load siblings error:', err);
    }
  };

  const handleSiblingSubmit = async (e) => {
    e.preventDefault();
    if (!siblingForm.sibling_name.trim()) {
      setMsg({ type: 'error', text: 'Sibling name is required.' });
      return;
    }

    setSavingSibling(true);
    setMsg(null);

    try {
      if (editingSiblingId) {
        await api.put(`/siblings/${editingSiblingId}`, siblingForm);
        setMsg({ type: 'success', text: 'Sibling updated successfully.' });
      } else {
        await api.post('/siblings', siblingForm);
        setMsg({ type: 'success', text: 'Sibling added successfully.' });
      }
      resetSiblingForm();
      await loadSiblings();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save sibling.' });
    } finally {
      setSavingSibling(false);
    }
  };

  const handleEditSibling = (sibling) => {
    setSiblingForm({
      sibling_name: sibling.sibling_name || '',
      education: sibling.education || '',
      occupation: sibling.occupation || '',
    });
    setEditingSiblingId(sibling.id);
  };

  const handleDeleteSibling = async (id) => {
    if (!window.confirm('Delete this sibling record?')) return;

    try {
      await api.delete(`/siblings/${id}`);
      setSiblings((prev) => prev.filter((item) => item.id !== id));
      setMsg({ type: 'success', text: 'Sibling removed successfully.' });
      if (editingSiblingId === id) resetSiblingForm();
    } catch (err) {
      console.error('Delete sibling error:', err);
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to delete sibling.' });
    }
  };

  const handleSaveAll = async (e) => {
    e && e.preventDefault();
    setSavingPersonal(true);
    setSavingFamily(true);
    setMsg(null);
    try {
      await Promise.all([
        api.post('/personal', personalForm),
        api.put('/family', familyForm),
      ]);
      setMsg({ type: 'success', text: 'Profile saved successfully.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save profile.' });
    } finally {
      setSavingPersonal(false);
      setSavingFamily(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Personal Profile</h1>
          <p className="text-sm text-gray-500">Unified personal, family and sibling information (ERP style).</p>
        </div>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSaveAll} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600">Full Name</label>
                <input name="full_name" value={personalForm.full_name} onChange={handlePersonalChange} className="input-field" />
              </div>
              <div>
                <label className="text-sm text-gray-600">Gender</label>
                <select name="gender" value={personalForm.gender} onChange={handlePersonalChange} className="input-field">
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Date Of Birth</label>
                <input name="date_of_birth" type="date" value={personalForm.date_of_birth} onChange={handlePersonalChange} className="input-field" />
              </div>
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <input name="email" type="email" value={personalForm.email} onChange={handlePersonalChange} className="input-field" />
              </div>
              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <input name="phone" value={personalForm.phone} onChange={handlePersonalChange} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-gray-600">Address</label>
                <textarea name="address" value={personalForm.address} onChange={handlePersonalChange} className="input-field" rows={3} />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Family Information</h2>
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Father Name</label>
                  <input name="father_name" value={familyForm.father_name} onChange={handleFamilyChange} className="input-field" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Father Occupation</label>
                  <input name="father_occupation" value={familyForm.father_occupation} onChange={handleFamilyChange} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Mother Name</label>
                  <input name="mother_name" value={familyForm.mother_name} onChange={handleFamilyChange} className="input-field" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Mother Occupation</label>
                  <input name="mother_occupation" value={familyForm.mother_occupation} onChange={handleFamilyChange} className="input-field" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Sibling Information</h2>
            <button type="button" onClick={() => { setSiblingForm(initialSiblingForm); setEditingSiblingId(null); }} className="btn-secondary">New</button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="p-2">Name</th>
                  <th className="p-2">Studying / Working</th>
                  <th className="p-2">Course / Job</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {siblings.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-2">{s.sibling_name}</td>
                    <td className="p-2">{s.education || s.occupation || '—'}</td>
                    <td className="p-2">{s.occupation || '—'}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleEditSibling(s)} className="text-blue-600">Edit</button>
                        <button type="button" onClick={() => handleDeleteSibling(s.id)} className="text-red-600">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="border-t">
                  <td className="p-2"><input name="sibling_name" placeholder="Name" value={siblingForm.sibling_name} onChange={handleSiblingChange} className="input-field" /></td>
                  <td className="p-2"><input name="education" placeholder="Studying / Working" value={siblingForm.education} onChange={handleSiblingChange} className="input-field" /></td>
                  <td className="p-2"><input name="occupation" placeholder="Course / Job" value={siblingForm.occupation} onChange={handleSiblingChange} className="input-field" /></td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={handleSiblingSubmit} className="btn-primary px-3 py-1" disabled={savingSibling}>{savingSibling ? 'Saving...' : (editingSiblingId ? 'Update' : 'Add')}</button>
                      {editingSiblingId && <button type="button" onClick={resetSiblingForm} className="btn-secondary px-3 py-1">Cancel</button>}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary px-6 py-2" disabled={savingPersonal || savingFamily}>{(savingPersonal || savingFamily) ? 'Saving...' : 'Save Profile'}</button>
        </div>
      </form>
    </div>
  );
};

export default PersonalDetails;

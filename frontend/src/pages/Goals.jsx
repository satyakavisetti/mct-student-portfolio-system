import React, { useEffect, useState } from 'react';
import api from '../services/api';

const goalTypes = [
  'AI / Machine Learning',
  'Cyber Security',
  'Data Science',
  'Cloud Computing',
  'Full Stack Development',
  'Mobile App Development',
  'UI/UX Design',
  'Other',
];

const emptyForm = {
  title: '',
  goal_type: '',
  custom_goal_type: '',
  description: '',
  target_date: '',
  status: 'pending',
  topics: [],
};

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState(null);
  const [topicInput, setTopicInput] = useState('');
  const [editingTopic, setEditingTopic] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/goals');
      setGoals(res.data.data || []);
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: err.response?.data?.message || 'Unable to load goals.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ ...emptyForm, topics: [] });
    setEditId(null);
    setShowForm(true);
    setMsg(null);
    setTopicInput('');
    setEditingTopic(null);
  };

  const openEdit = async (g) => {
    setForm({
      title: g.title || '',
      goal_type: g.goal_type || '',
      custom_goal_type: g.custom_goal_type || '',
      description: g.description || '',
      target_date: g.target_date ? g.target_date.substring(0, 10) : '',
      status: g.status || 'pending',
      topics: (g.topics || []).map(t => ({ ...t, progress_percentage: t.progress_percentage ?? 0 })),
    });
    setEditId(g.id);
    setShowForm(true);
    setMsg(null);
    setTopicInput('');
    setEditingTopic(null);
  };

  const addOrUpdateTopic = () => {
    const trimmed = topicInput.trim();
    if (!trimmed) {
      setMsg({ type: 'error', text: 'Topic name is required.' });
      return;
    }

    const exists = form.topics.some((topic) => {
      const topicName = (topic.topic_name || '').trim().toLowerCase();
      return topicName === trimmed.toLowerCase() && topic !== editingTopic;
    });

    if (exists) {
      setMsg({ type: 'error', text: 'Topic already exists for this goal.' });
      return;
    }

    if (editingTopic) {
      setForm({
        ...form,
        topics: form.topics.map((topic) => topic === editingTopic ? { ...topic, topic_name: trimmed } : topic),
      });
    } else {
      setForm({ ...form, topics: [...form.topics, { topic_name: trimmed }] });
    }

    setTopicInput('');
    setEditingTopic(null);
    setMsg(null);
  };

  const startEditTopic = (topic) => {
    setEditingTopic(topic);
    setTopicInput(topic.topic_name || '');
  };

  const deleteTopic = (topic) => {
    setForm({ ...form, topics: form.topics.filter((item) => item !== topic) });
  };

  const syncTopics = async (goalId) => {
    const existingRes = await api.get(`/goals/${goalId}/topics`);
    const existingTopics = existingRes.data.data || [];
    await Promise.all(existingTopics.map((topic) => api.delete(`/goals/topics/${topic.id}`)));
    await Promise.all(
      form.topics
        .filter((topic) => (topic.topic_name || '').trim())
        .map((topic) => api.post(`/goals/${goalId}/topics`, { topic_name: topic.topic_name.trim(), progress_percentage: topic.progress_percentage ?? 0 }))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setMsg({ type: 'error', text: 'Goal title is required.' });
      return;
    }
    if (form.goal_type === 'Other' && !form.custom_goal_type.trim()) {
      setMsg({ type: 'error', text: 'Custom goal type is required when selecting Other.' });
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        title: form.title.trim(),
        goal_type: form.goal_type || null,
        custom_goal_type: form.goal_type === 'Other' ? form.custom_goal_type.trim() : null,
        description: form.description || null,
        target_date: form.target_date || null,
        status: form.status || 'pending',
      };

      let goalRes;
      if (editId) {
        goalRes = await api.put(`/goals/${editId}`, payload);
      } else {
        goalRes = await api.post('/goals', payload);
      }

      const goalId = editId || goalRes.data.data?.id;
      if (goalId) {
        await syncTopics(goalId);
        // Additionally save any progress updates for existing topics via dedicated endpoint
        await Promise.all((form.topics || []).filter(t => t.id).map(t => api.put(`/goals/topics/${t.id}/progress`, { topic_name: t.topic_name, progress_percentage: t.progress_percentage ?? 0 })));
      }

      setShowForm(false);
      setMsg({ type: 'success', text: editId ? 'Goal updated!' : 'Goal added!' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await api.delete(`/goals/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
  };

  const statusBadge = (s) => {
    if (s === 'completed') return <span className="badge-completed">Completed</span>;
    if (s === 'in_progress') return <span className="badge-progress">In Progress</span>;
    return <span className="badge-pending">Pending</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Goals</h1>
        <button onClick={openAdd} className="btn-primary">+ Add Goal</button>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      {showForm && (
        <div className="card">
          <h2 className="section-title">{editId ? 'Edit Goal' : 'New Goal'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input name="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Goal title *" required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select name="goal_type" value={form.goal_type} onChange={(e) => setForm({ ...form, goal_type: e.target.value, custom_goal_type: e.target.value === 'Other' ? form.custom_goal_type : '' })} className="input-field">
                <option value="">Select Goal Type</option>
                {goalTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <select name="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            {form.goal_type === 'Other' && (
              <input name="custom_goal_type" value={form.custom_goal_type} onChange={(e) => setForm({ ...form, custom_goal_type: e.target.value })} className="input-field" placeholder="Custom Goal Type *" />
            )}
            <input type="date" name="target_date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} className="input-field" />
            <textarea name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} placeholder="Description" />

            <div className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Required Topics</h3>
                <button type="button" onClick={addOrUpdateTopic} className="text-sm text-blue-600">{editingTopic ? 'Update Topic' : '+ Add Topic'}</button>
              </div>
              <div className="flex gap-2">
                <input value={topicInput} onChange={(e) => setTopicInput(e.target.value)} className="input-field" placeholder="Type a topic" />
                <button type="button" onClick={addOrUpdateTopic} className="btn-secondary">{editingTopic ? 'Update' : 'Add'}</button>
                {editingTopic && (
                  <button type="button" onClick={() => { setEditingTopic(null); setTopicInput(''); }} className="btn-secondary">Cancel</button>
                )}
              </div>
              {form.topics.length > 0 && (
                <div className="mt-3 space-y-2">
                  {form.topics.map((topic, idx) => (
                    <div key={`${topic.id || topic.topic_name || 'topic'}-${idx}`} className="rounded-lg border border-gray-200 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{topic.topic_name}</p>
                          <div className="mt-2">
                            <div className="w-full bg-gray-100 h-3 rounded overflow-hidden">
                              <div className="bg-blue-600 h-3" style={{ width: `${topic.progress_percentage}%` }} />
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <input type="range" min={0} max={100} value={topic.progress_percentage} onChange={(e) => {
                                const val = Number(e.target.value);
                                setForm({ ...form, topics: form.topics.map((t) => t === topic ? { ...t, progress_percentage: val } : t) });
                              }} className="w-48" />
                              <input type="number" min={0} max={100} value={topic.progress_percentage} onChange={(e) => {
                                let val = Number(e.target.value);
                                if (Number.isNaN(val)) val = 0;
                                if (val < 0) val = 0;
                                if (val > 100) val = 100;
                                setForm({ ...form, topics: form.topics.map((t) => t === topic ? { ...t, progress_percentage: val } : t) });
                              }} className="input-field w-20" />
                              <span className="text-sm text-gray-600">%</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => startEditTopic(topic)} className="text-sm text-blue-600">Edit</button>
                          <button type="button" onClick={() => deleteTopic(topic)} className="text-sm text-red-500">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">No goals yet. Click "+ Add Goal" to get started.</div>
      ) : (
        goals.map((g) => (
          <div key={g.id} className="card flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold text-gray-800">{g.title}</h3>
                {statusBadge(g.status)}
                {g.goal_type && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{g.goal_type === 'Other' ? g.custom_goal_type || 'Other' : g.goal_type}</span>}
              </div>
              {g.description && <p className="text-sm text-gray-600">{g.description}</p>}
              {g.target_date && <p className="text-xs text-gray-400 mt-1">Target: {new Date(g.target_date).toLocaleDateString()}</p>}
              {g.topics && g.topics.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {g.topics.map((topic) => (
                    <span key={topic.id || topic.topic_name} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{topic.topic_name}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => openEdit(g)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
              <button onClick={() => handleDelete(g.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Goals;

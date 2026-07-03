import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [form, setForm]       = useState({ mssid: '', password: '' });
const [role, setRole]       = useState('student');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) {
      setError('Please select Student or Coordinator.');
      return;
    }
    if (!form.mssid || !form.password) {
      setError('Both fields are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await login(form.mssid.trim().toUpperCase(), form.password, role);
      if (res.user.role === 'coordinator') {
        navigate('/coordinator/dashboard', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">M</div>
          <h1 className="text-2xl font-bold text-gray-800">MCT Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Student Portfolio & Academic Tracking</p>
        </div>

        <div className="card">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Sign In As</h2>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {['student', 'coordinator'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => { setRole(option); setError(''); }}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                    role === option
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {option === 'student' ? 'Student' : 'Coordinator'}
                </button>
              ))}
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Login</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MSSID</label>
              <input
                type="text"
                name="mssid"
                value={form.mssid}
                onChange={handleChange}
                className="input-field"
                placeholder="MSS2022096"
                autoComplete="username"
              />
              <p className="text-xs text-gray-400 mt-1">Format: MSS + 7 digits</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Logging in...
                </span>
              ) : role === 'coordinator' ? 'Coordinator Login' : 'Student Login'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 hover:underline font-medium">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Signup = () => {
  const [form, setForm]       = useState({ mssid: '', password: '', confirmPassword: '', mssBatch: '', collegeName: '', year: '' });
  const [role, setRole]       = useState('student');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { register }          = useAuth();
  const navigate              = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const validate = () => {
    const mssidRegex = /^MSS\d{7}$/;
    if (!mssidRegex.test(form.mssid.trim().toUpperCase())) {
      return 'MSSID must be in format MSS followed by 7 digits (e.g. MSS2022096)';
    }
    if (form.password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    if (form.password !== form.confirmPassword) {
      return 'Passwords do not match.';
    }
    if (role === 'student' && !form.mssBatch) {
      return 'MSS Batch is required.';
    }
    if (role === 'student' && !form.collegeName) {
      return 'College Name is required.';
    }
    if (role === 'student' && !form.year) {
      return 'Year is required.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      await register(
        form.mssid.trim().toUpperCase(),
        form.password,
        form.confirmPassword,
        role,
        form.mssBatch,
        form.collegeName,
        form.year
      );
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">M</div>
          <h1 className="text-2xl font-bold text-gray-800">MCT Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Create your account</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Create Account As</h2>
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
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign Up</h2>

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
                className="input-field uppercase"
                placeholder="MSS2022096"
              />
              <p className="text-xs text-gray-400 mt-1">Your college-assigned MSS ID</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="input-field"
                placeholder="Minimum 6 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className="input-field"
                placeholder="Re-enter password"
              />
            </div>

            {role === 'student' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MSS Batch</label>
                  <select
                    name="mssBatch"
                    value={form.mssBatch}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Select Batch</option>
                    <option value="9">9</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                    <option value="13">13</option>
                    <option value="14">14</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">College Name</label>
                  <select
                    name="collegeName"
                    value={form.collegeName}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Select College</option>
                    <option value="Vasavi">Vasavi</option>
                    <option value="CBIT">CBIT</option>
                    <option value="KMIT">KMIT</option>
                    <option value="Vardhaman">Vardhaman</option>
                    <option value="Narayanamma">Narayanamma</option>
                    <option value="BVRIT">BVRIT</option>
                    <option value="IIIT Hyderabad">IIIT Hyderabad</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select
                    name="year"
                    value={form.year}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Select Year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </>
            )}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Creating account...
                </span>
              ) : role === 'coordinator' ? 'Sign Up as Coordinator' : 'Sign Up as Student'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;

import axios from 'axios';

const resolvedBackend = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL;
const baseURL = resolvedBackend
  ? `${String(resolvedBackend).replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT to every request and allow file uploads to set their own multipart headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mct_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      config.headers = config.headers || {};
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
      if (config.headers.common) {
        delete config.headers.common['Content-Type'];
        delete config.headers.common['content-type'];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mct_token');
      localStorage.removeItem('mct_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

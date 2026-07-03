import api from './api';

const TOKEN_KEY = 'mct_token';
const USER_KEY  = 'mct_user';

const authService = {
  async register(mssid, password, confirmPassword, role = 'student', mssBatch, collegeName, year) {
    const { data } = await api.post('/auth/register', { mssid, password, confirmPassword, role, mss_batch: mssBatch, college_name: collegeName, year });
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }
    return data;
  },

  async login(mssid, password, role) {
    const { data } = await api.post('/auth/login', { mssid, password, role });
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }
    return data;
  },

  async getMe() {
    const { data } = await api.get('/auth/me');
    return data;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser() {
    const token = this.getToken();
    if (!token) return null;
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY);
  },
};

export default authService;

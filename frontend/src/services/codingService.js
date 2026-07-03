import api from './api';

const codingService = {
  async getProfile(studentId) {
    const { data } = await api.get(`/coding/profile/${studentId}`);
    return data;
  },

  async getHandles(studentId) {
    const { data } = await api.get(`/coding/handles/${studentId}`);
    return data;
  },

  async saveHandle(payload) {
    const { data } = await api.post('/coding/handles', payload);
    return data;
  },

  async syncProfile(studentId) {
    const { data } = await api.post(`/coding/sync/${studentId}`);
    return data;
  },

  async refreshProfile(studentId) {
    const { data } = await api.post(`/coding/refresh/${studentId}`);
    return data;
  },
};

export default codingService;

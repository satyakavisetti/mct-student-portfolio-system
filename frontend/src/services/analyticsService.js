import api from './api';

const analyticsService = {
  async getProfile() {
    const { data } = await api.get('/analytics/profile');
    return data.data;
  },

  async getPlatform(platform) {
    const { data } = await api.get(`/analytics/${platform}`);
    return data.data;
  },

  async getOverallScore() {
    const { data } = await api.get('/analytics/overall-score');
    return data.data;
  },
};

export default analyticsService;

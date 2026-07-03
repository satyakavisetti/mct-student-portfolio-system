import api from './api';

const coordinatorAnalyticsService = {
  async getPlatform(studentId, platform) {
    const { data } = await api.get(`/coordinator/analytics/student/${studentId}/${platform}`);
    return data.data;
  },
};

export default coordinatorAnalyticsService;

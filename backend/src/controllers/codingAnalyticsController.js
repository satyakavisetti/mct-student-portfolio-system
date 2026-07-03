const { getStudentAnalytics, getStudentContestHistory, getLeaderboard } = require('../services/codingAnalyticsService');

const safeNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const getAnalyticsSummary = async (req, res) => {
  try {
    const studentId = safeNumber(req.params.studentId);
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    const analytics = await getStudentAnalytics(studentId);
    if (!analytics) {
      return res.status(404).json({ success: false, message: 'Analytics not found for this student.' });
    }

    return res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Analytics summary error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAnalyticsContests = async (req, res) => {
  try {
    const studentId = safeNumber(req.params.studentId);
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    const platform = req.query.platform ? String(req.query.platform).trim().toLowerCase() : null;
    const contests = await getStudentContestHistory(studentId, platform);
    return res.json({ success: true, data: contests });
  } catch (error) {
    console.error('Analytics contests error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAnalyticsLeaderboard = async (req, res) => {
  try {
    const platform = req.query.platform ? String(req.query.platform).trim().toLowerCase() : null;
    const leaderboard = await getLeaderboard(platform);
    return res.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Analytics leaderboard error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAnalyticsSummary,
  getAnalyticsContests,
  getAnalyticsLeaderboard,
};

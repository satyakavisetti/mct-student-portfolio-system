const analyticsService = require('../services/analyticsService');

// GET /api/analytics/profile
// Returns the full coding analytics summary for the authenticated student.
const getAnalyticsProfile = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const profile = await analyticsService.getStudentProfile(studentId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Coding profile analytics not found.' });
    }
    return res.json({ success: true, data: profile });
  } catch (error) {
    console.error('getAnalyticsProfile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load analytics profile.' });
  }
};

// GET /api/analytics/leetcode
// Returns LeetCode analytics data for the authenticated student.
const getAnalyticsLeetCode = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const analytics = await analyticsService.getPlatformAnalytics(studentId, 'leetcode');
    if (!analytics) {
      return res.status(404).json({ success: false, message: 'LeetCode analytics not found.' });
    }
    return res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('getAnalyticsLeetCode error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load LeetCode analytics.' });
  }
};

// GET /api/analytics/codechef
// Returns CodeChef analytics data for the authenticated student.
const getAnalyticsCodeChef = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const analytics = await analyticsService.getPlatformAnalytics(studentId, 'codechef');
    if (!analytics) {
      return res.status(404).json({ success: false, message: 'CodeChef analytics not found.' });
    }
    return res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('getAnalyticsCodeChef error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load CodeChef analytics.' });
  }
};

// GET /api/analytics/hackerrank
// Returns HackerRank analytics data for the authenticated student.
const getAnalyticsHackerRank = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const analytics = await analyticsService.getPlatformAnalytics(studentId, 'hackerrank');
    if (!analytics) {
      return res.status(404).json({ success: false, message: 'HackerRank analytics not found.' });
    }
    return res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('getAnalyticsHackerRank error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load HackerRank analytics.' });
  }
};

// GET /api/analytics/github
// Returns GitHub analytics data for the authenticated student.
const getAnalyticsGitHub = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const analytics = await analyticsService.getPlatformAnalytics(studentId, 'github');
    if (!analytics) {
      return res.status(404).json({ success: false, message: 'GitHub analytics not found.' });
    }
    return res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('getAnalyticsGitHub error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load GitHub analytics.' });
  }
};

// GET /api/analytics/overall-score
// Returns an aggregated coding score summary for the authenticated student.
const getAnalyticsOverallScore = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const overall = await analyticsService.getOverallScore(studentId);
    if (!overall) {
      return res.status(404).json({ success: false, message: 'Overall score analytics not found.' });
    }
    return res.json({ success: true, data: overall });
  } catch (error) {
    console.error('getAnalyticsOverallScore error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load overall score analytics.' });
  }
};

// GET /api/analytics/leaderboard
// Returns a leaderboard across students and/or by platform.
const getAnalyticsLeaderboard = async (req, res) => {
  try {
    const platform = req.query.platform ? String(req.query.platform).trim().toLowerCase() : null;
    const leaderboard = await analyticsService.getLeaderboard(platform);
    return res.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('getAnalyticsLeaderboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load leaderboard analytics.' });
  }
};

// POST /api/analytics/save-handles
// Saves or updates the authenticated student's coding handles.
const postAnalyticsSaveHandles = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const payload = req.body;
    const handles = Array.isArray(payload?.handles) ? payload.handles : payload?.handle ? [payload.handle] : [];

    if (!handles.length) {
      return res.status(400).json({ success: false, message: 'Handles payload is required.' });
    }

    const saved = await analyticsService.saveHandles(studentId, handles);
    if (!saved || saved.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid handles were saved.' });
    }

    return res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error('postAnalyticsSaveHandles error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save coding handles.' });
  }
};

// POST /api/analytics/sync
// Triggers a sync of the authenticated student's coding handles and profiles.
const postAnalyticsSync = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const result = await analyticsService.syncHandles(studentId);
    if (!result) {
      return res.status(400).json({ success: false, message: 'Sync request could not be completed.' });
    }
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('postAnalyticsSync error:', error);
    return res.status(500).json({ success: false, message: 'Failed to sync coding profiles.' });
  }
};

module.exports = {
  getAnalyticsProfile,
  getAnalyticsLeetCode,
  getAnalyticsCodeChef,
  getAnalyticsHackerRank,
  getAnalyticsGitHub,
  getAnalyticsOverallScore,
  getAnalyticsLeaderboard,
  postAnalyticsSaveHandles,
  postAnalyticsSync,
};

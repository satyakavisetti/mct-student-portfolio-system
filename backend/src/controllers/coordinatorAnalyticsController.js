const analyticsService = require('../services/analyticsService');

const ensureCoordinatorAccess = (req, res) => {
  if (req.user?.role !== 'coordinator') {
    res.status(403).json({ success: false, message: 'Coordinator access required.' });
    return false;
  }
  return true;
};

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getCoordinatorStudentProfile = async (req, res) => {
  try {
    if (!ensureCoordinatorAccess(req, res)) return;

    const studentId = safeNumber(req.params.studentId);
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    const profile = await analyticsService.getStudentProfile(studentId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student coding profile not found.' });
    }

    return res.json({ success: true, data: profile });
  } catch (error) {
    console.error('getCoordinatorStudentProfile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load student coding profile.' });
  }
};

const getCoordinatorPlatformAnalytics = async (req, res) => {
  try {
    if (!ensureCoordinatorAccess(req, res)) return;

    const studentId = safeNumber(req.params.studentId);
    const platform = String(req.params.platform || '').trim().toLowerCase();
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    if (!['leetcode', 'codechef', 'hackerrank'].includes(platform)) {
      return res.status(400).json({ success: false, message: 'Supported platform is required (leetcode, codechef, hackerrank).' });
    }

    const analytics = await analyticsService.getPlatformAnalytics(studentId, platform);
    if (!analytics) {
      return res.status(404).json({ success: false, message: `No analytics found for ${platform}.` });
    }

    return res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('getCoordinatorPlatformAnalytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load platform analytics.' });
  }
};

const getCoordinatorOverallScore = async (req, res) => {
  try {
    if (!ensureCoordinatorAccess(req, res)) return;

    const studentId = safeNumber(req.params.studentId);
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    const overall = await analyticsService.getOverallScore(studentId);
    if (!overall) {
      return res.status(404).json({ success: false, message: 'Overall score analytics not found.' });
    }

    return res.json({ success: true, data: overall });
  } catch (error) {
    console.error('getCoordinatorOverallScore error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load overall score analytics.' });
  }
};

module.exports = {
  getCoordinatorStudentProfile,
  getCoordinatorPlatformAnalytics,
  getCoordinatorOverallScore,
};

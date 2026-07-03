const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAnalyticsProfile,
  getAnalyticsLeetCode,
  getAnalyticsCodeChef,
  getAnalyticsHackerRank,
  getAnalyticsGitHub,
  getAnalyticsOverallScore,
  getAnalyticsLeaderboard,
  postAnalyticsSaveHandles,
  postAnalyticsSync,
} = require('../controllers/analyticsController');

router.use(protect);
router.get('/profile', getAnalyticsProfile);
router.get('/leetcode', getAnalyticsLeetCode);
router.get('/codechef', getAnalyticsCodeChef);
router.get('/hackerrank', getAnalyticsHackerRank);
router.get('/github', getAnalyticsGitHub);
router.get('/overall-score', getAnalyticsOverallScore);
router.get('/leaderboard', getAnalyticsLeaderboard);
router.post('/save-handles', postAnalyticsSaveHandles);
router.post('/sync', postAnalyticsSync);

module.exports = router;

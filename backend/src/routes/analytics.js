const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAnalyticsSummary, getAnalyticsContests, getAnalyticsLeaderboard } = require('../controllers/codingAnalyticsController');

router.use(protect);
router.get('/student/:studentId', getAnalyticsSummary);
router.get('/student/:studentId/contests', getAnalyticsContests);
router.get('/leaderboard', getAnalyticsLeaderboard);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getCodingProfile, saveCodingHandleController, getCodingHandles, syncCodingProfile, refreshCodingProfile, getLeaderboard } = require('../controllers/codingController');

router.get('/profile/:studentId', getCodingProfile);
router.get('/handles/:studentId', getCodingHandles);
router.post('/handles', saveCodingHandleController);
router.put('/handles', saveCodingHandleController);
router.post('/sync/:studentId', syncCodingProfile);
router.post('/refresh/:studentId', refreshCodingProfile);
router.get('/leaderboard', getLeaderboard);
router.get('/leaderboard/:platform', getLeaderboard);

module.exports = router;

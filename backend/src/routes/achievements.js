const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAchievements, addAchievement, updateAchievement, deleteAchievement } = require('../controllers/achievementsController');

router.use(protect);
router.get('/', getAchievements);
router.post('/', addAchievement);
router.put('/:id', updateAchievement);
router.delete('/:id', deleteAchievement);

module.exports = router;

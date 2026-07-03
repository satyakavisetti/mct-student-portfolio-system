const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getGoals, addGoal, updateGoal, deleteGoal, getGoalTopics, addGoalTopic, updateGoalTopic, deleteGoalTopic } = require('../controllers/goalsController');

router.use(protect);
router.get('/', getGoals);
router.post('/', addGoal);
router.get('/:goalId/topics', getGoalTopics);
router.post('/:goalId/topics', addGoalTopic);
router.put('/topics/:topicId', updateGoalTopic);
router.delete('/topics/:topicId', deleteGoalTopic);
// Endpoint to update only progress for a topic
router.put('/topics/:topicId/progress', updateGoalTopic);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

module.exports = router;

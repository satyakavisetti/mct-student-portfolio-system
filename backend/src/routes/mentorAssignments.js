const express = require('express');
const router = express.Router();
const { getMentorAssignments, saveMentorAssignment } = require('../controllers/mentorAssignmentsController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getMentorAssignments);
router.post('/:mentorType', saveMentorAssignment);
router.put('/:mentorType', saveMentorAssignment);

module.exports = router;

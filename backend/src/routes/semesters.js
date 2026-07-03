const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const academicController = require('../controllers/academicController');

router.use(protect);
router.get('/', academicController.getSemesters);
router.put('/', academicController.postSemester);
router.get('/:semesterId/subjects', academicController.getSemesterSubjects);
router.post('/:semesterId/subjects', academicController.postSemesterSubject);
router.put('/subjects/:id', academicController.updateSemesterSubject);
router.delete('/subjects/:id', academicController.deleteSemesterSubject);

module.exports = router;

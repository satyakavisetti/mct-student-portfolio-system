const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const academicController = require('../controllers/academicController');

router.use(protect);
router.get('/', academicController.getAcademic);
router.post('/', academicController.postAcademic);
router.put('/:studentId', academicController.putAcademic);
router.get('/school', academicController.getSchool);
router.put('/school', academicController.putSchool);
router.get('/intermediate', academicController.getIntermediate);
router.put('/intermediate', academicController.putIntermediate);
router.get('/btech', academicController.getBtech);
router.put('/btech', academicController.putBtech);
router.get('/semesters', academicController.getSemesters);
router.put('/semesters', academicController.postSemester);
router.get('/semesters/:semesterId/subjects', academicController.getSemesterSubjects);
router.post('/semesters/:semesterId/subjects', academicController.postSemesterSubject);
router.put('/semesters/subjects/:id', academicController.updateSemesterSubject);
router.delete('/semesters/subjects/:id', academicController.deleteSemesterSubject);

module.exports = router;

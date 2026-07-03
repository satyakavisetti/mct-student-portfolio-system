const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const academicController = require('../controllers/academicController');

router.use(protect);
router.get('/school', academicController.getSchool);
router.put('/school', academicController.putSchool);
router.get('/intermediate', academicController.getIntermediate);
router.put('/intermediate', academicController.putIntermediate);
router.get('/btech', academicController.getBtech);
router.put('/btech', academicController.putBtech);

module.exports = router;

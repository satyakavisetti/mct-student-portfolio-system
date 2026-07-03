const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getResume, uploadResume, deleteResume } = require('../controllers/resumeController');

router.use(protect);
router.get('/', getResume);
router.post('/', uploadResume);
router.delete('/', deleteResume);

module.exports = router;

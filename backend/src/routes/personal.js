const express = require('express');
const router = express.Router();
const { getPersonal, upsertPersonal } = require('../controllers/personalController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getPersonal);
router.post('/', upsertPersonal);
router.put('/:studentId', upsertPersonal);

module.exports = router;

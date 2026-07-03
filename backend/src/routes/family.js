const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getFamily, upsertFamily, updateFamily } = require('../controllers/familyController');

router.use(protect);
router.get('/', getFamily);
router.post('/', upsertFamily);
router.put('/', updateFamily);
router.put('/:studentId', updateFamily);

module.exports = router;

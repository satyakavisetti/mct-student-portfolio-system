const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getSiblings, addSibling, updateSibling, deleteSibling } = require('../controllers/siblingController');

router.use(protect);
router.get('/', getSiblings);
router.post('/', addSibling);
router.put('/:id', updateSibling);
router.delete('/:id', deleteSibling);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getPlacements, addPlacement, updatePlacement, deletePlacement } = require('../controllers/placementsController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getPlacements);
router.post('/', addPlacement);
router.put('/:id', updatePlacement);
router.delete('/:id', deletePlacement);

module.exports = router;

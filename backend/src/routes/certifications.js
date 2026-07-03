const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getCertifications, addCertification, updateCertification, deleteCertification } = require('../controllers/certificationsController');

router.use(protect);
router.get('/', getCertifications);
router.post('/', addCertification);
router.put('/:id', updateCertification);
router.delete('/:id', deleteCertification);

module.exports = router;

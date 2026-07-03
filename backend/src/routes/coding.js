const express = require('express');
const router = express.Router();
const { getCodingProfiles, addCodingProfile, updateCodingProfile, deleteCodingProfile, syncCodingProfile, fetchProfileOnly, uploadHackerRankScreenshot } = require('../controllers/codingController');
const { protect } = require('../middleware/auth');
const imageUpload = require('../middleware/imageUpload');

router.use(protect);
router.get('/', getCodingProfiles);
router.post('/', addCodingProfile);
router.post('/fetch', fetchProfileOnly);
router.post('/hackerrank/upload', imageUpload.single('screenshot'), uploadHackerRankScreenshot);
router.put('/:id', updateCodingProfile);
router.post('/:id/sync', syncCodingProfile);
router.delete('/:id', deleteCodingProfile);

module.exports = router;

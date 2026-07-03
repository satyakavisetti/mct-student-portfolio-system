const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getVolunteeringActivities,
  addVolunteeringActivity,
  updateVolunteeringActivity,
  deleteVolunteeringActivity,
  uploadVolunteeringCertificate,
} = require('../controllers/volunteeringController');

router.use(protect);
router.get('/', getVolunteeringActivities);
router.post('/', addVolunteeringActivity);
router.put('/:id', updateVolunteeringActivity);
router.delete('/:id', deleteVolunteeringActivity);
router.post('/:id/certificate', uploadVolunteeringCertificate);

module.exports = router;

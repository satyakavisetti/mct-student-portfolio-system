const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getCoordinatorAnalyticsDashboard,
  getCoordinatorAnalyticsCoding,
  getCoordinatorAnalyticsVolunteering,
  getCoordinatorCodingTracking,
} = require('../controllers/coordinatorCodingTrackingController');
const {
  getCoordinatorStudents,
  getCoordinatorStudentById,
  getCoordinatorStudentProjects,
  getCoordinatorReportCardByMssid,
} = require('../controllers/coordinatorStudentsController');
const { getCoordinatorStudentVolunteering } = require('../controllers/coordinatorStudentsController');
const {
  getCoordinatorPlatformAnalytics,
} = require('../controllers/coordinatorAnalyticsController');

const router = express.Router();

router.get('/analytics/dashboard', protect, getCoordinatorAnalyticsDashboard);
router.get('/dashboard', protect, getCoordinatorAnalyticsDashboard);
router.get('/analytics/coding', protect, getCoordinatorAnalyticsCoding);
router.get('/analytics/volunteering', protect, getCoordinatorAnalyticsVolunteering);
router.get('/coding-tracking', protect, getCoordinatorCodingTracking);
router.get('/analytics/student/:studentId/:platform', protect, getCoordinatorPlatformAnalytics);
router.get('/students', protect, getCoordinatorStudents);
router.get('/students/:id', protect, getCoordinatorStudentById);
router.get('/students/:id/projects', protect, getCoordinatorStudentProjects);
router.get('/students/:id/volunteering', protect, getCoordinatorStudentVolunteering);
router.get('/report-card/:mssid', protect, getCoordinatorReportCardByMssid);

module.exports = router;

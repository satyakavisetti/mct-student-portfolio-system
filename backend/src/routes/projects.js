const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getProjects, addProject, updateProject, deleteProject } = require('../controllers/projectsController');

router.use(protect);
router.get('/', getProjects);
router.post('/', addProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

module.exports = router;

const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool } = require('./config/database');

const authRoutes = require('./routes/auth.js');
const codingRoutes = require('./routes/codingRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const personalRoutes = require('./routes/personal');
const placementsRoutes = require('./routes/placements');
const academicRoutes = require('./routes/academic');
const educationRoutes = require('./routes/education');
const semestersRoutes = require('./routes/semesters');
const familyRoutes = require('./routes/family');
const siblingRoutes = require('./routes/siblings');
const goalsRoutes = require('./routes/goals');
const projectsRoutes = require('./routes/projects');
const achievementsRoutes = require('./routes/achievements');
const certificationsRoutes = require('./routes/certifications');
const coordinatorRoutes = require('./routes/coordinator');
const volunteeringRoutes = require('./routes/volunteering');
const resumeRoutes = require('./routes/resume');
const mentorAssignmentsRoutes = require('./routes/mentorAssignments');

const app = express();

const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://localhost:5173',
].filter(Boolean);

const corsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin) || /^https:\/\/.*\.onrender\.com$/.test(origin)) {
    callback(null, true);
    return;
  }

  callback(null, false);
};

if (process.env.NODE_ENV === 'production') {
  corsOptions.origin = corsOrigin;
} else {
  corsOptions.origin = (origin, callback) => callback(null, true);
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/coding', codingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/personal', personalRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/siblings', siblingRoutes);
app.use('/api/placements', placementsRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/semesters', semestersRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/certifications', certificationsRoutes);
app.use('/api/volunteering', volunteeringRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/mentor-assignments', mentorAssignmentsRoutes);
app.use('/api/coordinator', coordinatorRoutes);

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: 'Server and DB are healthy.', timestamp: new Date() });
  } catch {
    res.status(500).json({ success: false, message: 'DB connection failed.' });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Max 5MB.' });
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
});

module.exports = app;


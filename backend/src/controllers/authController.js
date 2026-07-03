const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const MSSID_REGEX = /^MSS\d{7}$/;
const ALLOWED_COLLEGES = new Set(['Vasavi','CBIT','KMIT','Vardhaman','Narayanamma','BVRIT','IIIT Hyderabad','Other']);

const generateToken = (id, mssid, role) => {
  return jwt.sign({ id, mssid, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const mssid = req.body.mssid?.trim().toUpperCase();
    const { password, confirmPassword, role, mss_batch: mssBatch, college_name: collegeName, year } = req.body;
    const userRole = role && ['student', 'coordinator'].includes(role.toLowerCase()) ? role.toLowerCase() : 'student';

    if (!mssid || !password) {
      return res.status(400).json({ success: false, message: 'MSSID and password are required.' });
    }
    if (userRole === 'student' && (!mssBatch || !collegeName || !year)) {
      return res.status(400).json({ success: false, message: 'MSS Batch, College Name, and Year are required for student registration.' });
    }
    if (userRole === 'student' && !ALLOWED_COLLEGES.has(collegeName)) {
      return res.status(400).json({ success: false, message: 'College Name is invalid.' });
    }

    if (!MSSID_REGEX.test(mssid)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid MSSID format. Must be MSS followed by 7 digits (e.g. MSS2022096).',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const existing = await query('SELECT id FROM students WHERE mssid = $1', [mssid]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'This MSSID is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await query(
      'INSERT INTO students (mssid, password, role, mss_batch, college_name, year) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, mssid, role, created_at',
      [mssid, hashedPassword, userRole, userRole === 'student' ? mssBatch : null, userRole === 'student' ? collegeName : null, userRole === 'student' ? year : null]
    );

    const student = result.rows[0];
    const token = generateToken(student.id, student.mssid, student.role);

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: { id: student.id, mssid: student.mssid, role: student.role },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const mssid = req.body.mssid?.trim().toUpperCase();
    const { password, role } = req.body;

    if (!mssid || !password || !role) {
      return res.status(400).json({ success: false, message: 'MSSID, password, and account type are required.' });
    }

    if (!MSSID_REGEX.test(mssid)) {
      return res.status(400).json({ success: false, message: 'Invalid MSSID format.' });
    }

    if (!['student', 'coordinator'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid account type selected.' });
    }

    const result = await query(
      'SELECT id, mssid, password, role, is_active FROM students WHERE mssid = $1',
      [mssid]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid MSSID or password.' });
    }

    const student = result.rows[0];

    if (student.role !== role) {
      return res.status(401).json({ success: false, message: 'Please login using the correct account type.' });
    }

    if (!student.is_active) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Contact coordinator.' });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid MSSID or password.' });
    }

    const token = generateToken(student.id, student.mssid, student.role);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: { id: student.id, mssid: student.mssid, role: student.role },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const result = await query(
      `SELECT s.id, s.mssid, s.role, s.created_at,
              pd.full_name, pd.email, pd.phone
       FROM students s
       LEFT JOIN personal_details pd ON pd.student_id = s.id
       WHERE s.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { register, login, getMe };

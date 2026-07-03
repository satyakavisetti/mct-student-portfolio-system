const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const upload = require('../middleware/documentUpload');

const getResume = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, file_name, file_path, file_size, uploaded_at, updated_at FROM resume WHERE student_id = $1 LIMIT 1',
      [req.user.id]
    );
    return res.status(200).json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    console.error('getResume error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load resume.' });
  }
};

const uploadResume = async (req, res) => {
  upload.single('resume')(req, res, async (err) => {
    if (err) {
      console.error('uploadResume error:', err);
      return res.status(400).json({ success: false, message: err.message || 'Resume upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Resume file is required.' });
    }

    try {
      const filePath = path.relative(path.join(__dirname, '../../'), req.file.path).replace(/\\/g, '/');
      const fileUrl = `/${filePath}`;
      const existing = await query('SELECT id, file_path FROM resume WHERE student_id = $1 LIMIT 1', [req.user.id]);

      if (existing.rows.length > 0) {
        const oldPath = path.join(__dirname, '../../', existing.rows[0].file_path);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
        const result = await query(
          `UPDATE resume SET file_name=$1, file_path=$2, file_size=$3, uploaded_at=NOW(), updated_at=NOW() WHERE student_id=$4 RETURNING *`,
          [req.file.originalname, filePath, req.file.size, req.user.id]
        );
        return res.status(200).json({ success: true, message: 'Resume replaced successfully.', data: result.rows[0] });
      }

      const result = await query(
        `INSERT INTO resume (student_id, file_name, file_path, file_size, uploaded_at, updated_at)
         VALUES ($1,$2,$3,$4,NOW(),NOW()) RETURNING *`,
        [req.user.id, req.file.originalname, filePath, req.file.size]
      );
      return res.status(201).json({ success: true, message: 'Resume uploaded successfully.', data: result.rows[0] });
    } catch (error) {
      console.error('uploadResume error:', error);
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ success: false, message: 'Unable to save resume.' });
    }
  });
};

const deleteResume = async (req, res) => {
  try {
    const existing = await query('SELECT id, file_path FROM resume WHERE student_id = $1 LIMIT 1', [req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }
    const filePath = path.join(__dirname, '../../', existing.rows[0].file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await query('DELETE FROM resume WHERE student_id = $1', [req.user.id]);
    return res.status(200).json({ success: true, message: 'Resume deleted.' });
  } catch (error) {
    console.error('deleteResume error:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete resume.' });
  }
};

module.exports = { getResume, uploadResume, deleteResume };

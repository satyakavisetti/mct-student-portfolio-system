const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const upload = require('../middleware/documentUpload');

const getVolunteeringActivities = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, title, organization, role, description, start_date, end_date, hours, category, certificate_url, certificate_path, created_at, updated_at FROM volunteering WHERE student_id = $1 ORDER BY start_date DESC NULLS LAST, id DESC',
      [req.user.id]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getVolunteeringActivities error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load volunteering activities.' });
  }
};

const addVolunteeringActivity = async (req, res) => {
  try {
    const { title, organization, role, description, start_date, end_date, hours, category, certificate_url } = req.body;
    if (!title || !organization || !start_date) {
      return res.status(400).json({ success: false, message: 'Title, organization, and start date are required.' });
    }
    const result = await query(
      `INSERT INTO volunteering (student_id, title, organization, role, description, start_date, end_date, hours, category, certificate_url, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW()) RETURNING *`,
      [req.user.id, title, organization, role || null, description || null, start_date, end_date || null, hours || null, category || null, certificate_url || null]
    );
    return res.status(201).json({ success: true, message: 'Volunteering activity added.', data: result.rows[0] });
  } catch (error) {
    console.error('addVolunteeringActivity error:', error);
    return res.status(500).json({ success: false, message: 'Unable to add volunteering activity.' });
  }
};

const updateVolunteeringActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, organization, role, description, start_date, end_date, hours, category, certificate_url } = req.body;

    if (!title || !organization || !start_date) {
      return res.status(400).json({ success: false, message: 'Title, organization, and start date are required.' });
    }

    const result = await query(
      `UPDATE volunteering SET title=$1, organization=$2, role=$3, description=$4, start_date=$5, end_date=$6, hours=$7, category=$8, certificate_url=$9, updated_at=NOW()
       WHERE id=$10 AND student_id=$11 RETURNING *`,
      [title, organization, role || null, description || null, start_date, end_date || null, hours || null, category || null, certificate_url || null, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Volunteering activity not found.' });
    }

    return res.status(200).json({ success: true, message: 'Volunteering activity updated.', data: result.rows[0] });
  } catch (error) {
    console.error('updateVolunteeringActivity error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update volunteering activity.' });
  }
};

const deleteVolunteeringActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM volunteering WHERE id=$1 AND student_id=$2 RETURNING id', [id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Volunteering activity not found.' });
    }
    return res.status(200).json({ success: true, message: 'Volunteering activity deleted.' });
  } catch (error) {
    console.error('deleteVolunteeringActivity error:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete volunteering activity.' });
  }
};

const uploadVolunteeringCertificate = async (req, res) => {
  upload.single('certificate')(req, res, async (err) => {
    if (err) {
      console.error('uploadVolunteeringCertificate error:', err);
      return res.status(400).json({ success: false, message: err.message || 'Certificate upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Certificate file is required.' });
    }

    try {
      const filePath = path.relative(path.join(__dirname, '../../'), req.file.path).replace(/\\/g, '/');
      const fileUrl = `/${filePath}`;
      const { id } = req.params;
      const result = await query(
        `UPDATE volunteering SET certificate_url=$1, certificate_path=$2, updated_at=NOW() WHERE id=$3 AND student_id=$4 RETURNING *`,
        [fileUrl, filePath, id, req.user.id]
      );

      if (result.rows.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: 'Volunteering activity not found.' });
      }

      return res.status(200).json({ success: true, message: 'Certificate uploaded.', data: result.rows[0] });
    } catch (error) {
      console.error('uploadVolunteeringCertificate error:', error);
      return res.status(500).json({ success: false, message: 'Unable to save certificate.' });
    }
  });
};

module.exports = {
  getVolunteeringActivities,
  addVolunteeringActivity,
  updateVolunteeringActivity,
  deleteVolunteeringActivity,
  uploadVolunteeringCertificate,
};

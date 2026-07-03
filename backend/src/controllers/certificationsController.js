const { query } = require('../config/database');

const getCertifications = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM certifications WHERE student_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getCertifications error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching certifications.' });
  }
};

const addCertification = async (req, res) => {
  try {
    const { title, issuing_organization, issue_date, expiry_date, credential_id, credential_url } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Certification title is required.' });
    }
    const result = await query(
      `INSERT INTO certifications (student_id, title, issuing_organization, issue_date, expiry_date, credential_id, credential_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, title, issuing_organization || null, issue_date || null, expiry_date || null, credential_id || null, credential_url || null]
    );
    return res.status(201).json({ success: true, message: 'Certification added.', data: result.rows[0] });
  } catch (error) {
    console.error('addCertification error:', error);
    return res.status(500).json({ success: false, message: 'Server error while adding certification.' });
  }
};

const updateCertification = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, issuing_organization, issue_date, expiry_date, credential_id, credential_url } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Certification title is required.' });
    }
    const result = await query(
      `UPDATE certifications SET title=$1, issuing_organization=$2, issue_date=$3, expiry_date=$4,
       credential_id=$5, credential_url=$6, updated_at=NOW()
       WHERE id=$7 AND student_id=$8 RETURNING *`,
      [title, issuing_organization || null, issue_date || null, expiry_date || null, credential_id || null, credential_url || null, id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Certification not found.' });
    }
    return res.status(200).json({ success: true, message: 'Certification updated.', data: result.rows[0] });
  } catch (error) {
    console.error('updateCertification error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating certification.' });
  }
};

const deleteCertification = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM certifications WHERE id=$1 AND student_id=$2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Certification not found.' });
    }
    return res.status(200).json({ success: true, message: 'Certification deleted.' });
  } catch (error) {
    console.error('deleteCertification error:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting certification.' });
  }
};

module.exports = { getCertifications, addCertification, updateCertification, deleteCertification };

const { query } = require('../config/database');

// GET /api/personal
const getPersonal = async (req, res) => {
  try {
    const result = await query(
      `SELECT pd.*, s.block_id, s.mentor_id, b.block_name, m.mentor_name, m.mentor_phone, m.mentor_email
       FROM personal_details pd
       LEFT JOIN students s ON s.id = pd.student_id
       LEFT JOIN blocks b ON b.id = s.block_id
       LEFT JOIN mentors m ON m.id = s.mentor_id
       WHERE pd.student_id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(200).json({ success: true, data: null });
    }
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('getPersonal error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/personal  (upsert)
const upsertPersonal = async (req, res) => {
  try {
    const { full_name, email, phone, date_of_birth, gender, address, city, state, pincode, block_id, mentor_id } = req.body;

    const existing = await query('SELECT id FROM personal_details WHERE student_id = $1', [req.user.id]);

    let result;
    if (existing.rows.length > 0) {
      result = await query(
        `UPDATE personal_details SET
          full_name=$1, email=$2, phone=$3, date_of_birth=$4,
          gender=$5, address=$6, city=$7, state=$8, pincode=$9, updated_at=NOW()
         WHERE student_id=$10 RETURNING *`,
        [full_name, email, phone, date_of_birth || null, gender, address, city, state, pincode, req.user.id]
      );
    } else {
      result = await query(
        `INSERT INTO personal_details
          (student_id, full_name, email, phone, date_of_birth, gender, address, city, state, pincode)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [req.user.id, full_name, email, phone, date_of_birth || null, gender, address, city, state, pincode]
      );
    }

    if (typeof block_id !== 'undefined' || typeof mentor_id !== 'undefined') {
      await query(
        `UPDATE students SET block_id = $1, mentor_id = $2 WHERE id = $3`,
        [block_id || null, mentor_id || null, req.user.id]
      );
    }

    return res.status(200).json({ success: true, message: 'Personal details saved.', data: result.rows[0] });
  } catch (error) {
    console.error('upsertPersonal error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getPersonal, upsertPersonal };

const { query } = require('../config/database');

const ensureAuthorizedStudent = (req, studentId) => {
  const requestedId = Number(studentId);
  if (req.user.id !== requestedId && req.user.role !== 'coordinator') {
    const err = new Error('Not authorized to modify this student record.');
    err.status = 403;
    throw err;
  }
};

const getFamily = async (req, res) => {
  try {
    const result = await query('SELECT * FROM family_details WHERE student_id = $1 LIMIT 1', [req.user.id]);
    return res.json({ success: true, familyDetails: result.rows[0] || null });
  } catch (error) {
    console.error('getFamily error:', error);
    return res.status(500).json({ success: false, message: 'Server error while loading family details.' });
  }
};

const upsertFamily = async (req, res) => {
  try {
    const { father_name, father_occupation, mother_name, mother_occupation } = req.body;
    const existing = await query('SELECT id FROM family_details WHERE student_id = $1', [req.user.id]);

    let result;
    if (existing.rows.length > 0) {
      result = await query(
        `UPDATE family_details SET father_name=$1, father_occupation=$2, mother_name=$3, mother_occupation=$4, updated_at=NOW()
         WHERE student_id=$5 RETURNING *`,
        [father_name || null, father_occupation || null, mother_name || null, mother_occupation || null, req.user.id]
      );
    } else {
      result = await query(
        `INSERT INTO family_details (student_id, father_name, father_occupation, mother_name, mother_occupation)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [req.user.id, father_name || null, father_occupation || null, mother_name || null, mother_occupation || null]
      );
    }

    return res.json({ success: true, message: 'Family details saved.', familyDetails: result.rows[0] });
  } catch (error) {
    console.error('upsertFamily error:', error);
    return res.status(500).json({ success: false, message: 'Server error while saving family details.' });
  }
};

const updateFamily = async (req, res) => {
  try {
    const studentId = req.params.studentId ? Number(req.params.studentId) : req.user.id;
    if (req.params.studentId) {
      ensureAuthorizedStudent(req, studentId);
    }

    const { father_name, father_occupation, mother_name, mother_occupation } = req.body;
    const existing = await query('SELECT id FROM family_details WHERE student_id = $1', [studentId]);
    let result;

    if (existing.rows.length > 0) {
      result = await query(
        `UPDATE family_details SET father_name=$1, father_occupation=$2, mother_name=$3, mother_occupation=$4, updated_at=NOW()
         WHERE student_id=$5 RETURNING *`,
        [father_name || null, father_occupation || null, mother_name || null, mother_occupation || null, studentId]
      );
    } else {
      result = await query(
        `INSERT INTO family_details (student_id, father_name, father_occupation, mother_name, mother_occupation)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [studentId, father_name || null, father_occupation || null, mother_name || null, mother_occupation || null]
      );
    }

    return res.json({ success: true, message: 'Family details saved.', familyDetails: result.rows[0] });
  } catch (error) {
    console.error('updateFamily error:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Server error while updating family details.' });
  }
};

module.exports = { getFamily, upsertFamily, updateFamily };
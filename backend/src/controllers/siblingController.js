const { query } = require('../config/database');

const ensureAuthorized = (req, studentId) => {
  const sid = Number(studentId);
  if (req.user.role !== 'coordinator' && req.user.id !== sid) {
    const err = new Error('Not authorized to modify this student record.');
    err.status = 403;
    throw err;
  }
};

const getSiblings = async (req, res) => {
  try {
    const result = await query('SELECT id, sibling_name, education, occupation, created_at, updated_at FROM siblings WHERE student_id = $1 ORDER BY id ASC', [req.user.id]);
    return res.json({ success: true, siblings: result.rows });
  } catch (error) {
    console.error('getSiblings error:', error);
    return res.status(500).json({ success: false, message: 'Server error while loading siblings.' });
  }
};

const addSibling = async (req, res) => {
  try {
    const { sibling_name, education, occupation } = req.body;
    if (!sibling_name || !sibling_name.trim()) {
      return res.status(400).json({ success: false, message: 'Sibling name is required.' });
    }
    const result = await query(
      `INSERT INTO siblings (student_id, sibling_name, education, occupation, created_at, updated_at)
       VALUES ($1,$2,$3,$4,NOW(),NOW()) RETURNING *`,
      [req.user.id, sibling_name.trim(), education || null, occupation || null]
    );
    return res.status(201).json({ success: true, message: 'Sibling added.', sibling: result.rows[0] });
  } catch (error) {
    console.error('addSibling error:', error);
    return res.status(500).json({ success: false, message: 'Server error while adding sibling.' });
  }
};

const updateSibling = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await query('SELECT student_id FROM siblings WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sibling not found.' });
    }
    ensureAuthorized(req, existing.rows[0].student_id);

    const { sibling_name, education, occupation } = req.body;
    if (!sibling_name || !sibling_name.trim()) {
      return res.status(400).json({ success: false, message: 'Sibling name is required.' });
    }

    const result = await query(
      `UPDATE siblings SET sibling_name=$1, education=$2, occupation=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [sibling_name.trim(), education || null, occupation || null, id]
    );
    return res.json({ success: true, message: 'Sibling updated.', sibling: result.rows[0] });
  } catch (error) {
    console.error('updateSibling error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating sibling.' });
  }
};

const deleteSibling = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await query('SELECT student_id FROM siblings WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sibling not found.' });
    }
    ensureAuthorized(req, existing.rows[0].student_id);
    await query('DELETE FROM siblings WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Sibling deleted.' });
  } catch (error) {
    console.error('deleteSibling error:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting sibling.' });
  }
};

module.exports = { getSiblings, addSibling, updateSibling, deleteSibling };
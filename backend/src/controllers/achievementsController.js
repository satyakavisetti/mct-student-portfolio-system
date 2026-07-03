const { query } = require('../config/database');

const getAchievements = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM achievements WHERE student_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getAchievements error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching achievements.' });
  }
};

const addAchievement = async (req, res) => {
  try {
    const { title, description, date_achieved, category } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Achievement title is required.' });
    }
    const result = await query(
      `INSERT INTO achievements (student_id, title, description, date_achieved, category)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, title, description || null, date_achieved || null, category || null]
    );
    return res.status(201).json({ success: true, message: 'Achievement added.', data: result.rows[0] });
  } catch (error) {
    console.error('addAchievement error:', error);
    return res.status(500).json({ success: false, message: 'Server error while adding achievement.' });
  }
};

const updateAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date_achieved, category } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Achievement title is required.' });
    }
    const result = await query(
      `UPDATE achievements SET title=$1, description=$2, date_achieved=$3, category=$4, updated_at=NOW()
       WHERE id=$5 AND student_id=$6 RETURNING *`,
      [title, description || null, date_achieved || null, category || null, id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Achievement not found.' });
    }
    return res.status(200).json({ success: true, message: 'Achievement updated.', data: result.rows[0] });
  } catch (error) {
    console.error('updateAchievement error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating achievement.' });
  }
};

const deleteAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM achievements WHERE id=$1 AND student_id=$2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Achievement not found.' });
    }
    return res.status(200).json({ success: true, message: 'Achievement deleted.' });
  } catch (error) {
    console.error('deleteAchievement error:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting achievement.' });
  }
};

module.exports = { getAchievements, addAchievement, updateAchievement, deleteAchievement };

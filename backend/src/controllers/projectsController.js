const { query } = require('../config/database');

const getProjects = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM projects WHERE student_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getProjects error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching projects.' });
  }
};

const addProject = async (req, res) => {
  try {
    const { title, description, tech_stack, github_url, live_url, start_date, end_date } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Project title is required.' });
    }
    const result = await query(
      `INSERT INTO projects (student_id, title, description, tech_stack, github_url, live_url, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, title, description || null, tech_stack || null, github_url || null, live_url || null, start_date || null, end_date || null]
    );
    return res.status(201).json({ success: true, message: 'Project added.', data: result.rows[0] });
  } catch (error) {
    console.error('addProject error:', error);
    return res.status(500).json({ success: false, message: 'Server error while adding project.' });
  }
};

const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, tech_stack, github_url, live_url, start_date, end_date } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Project title is required.' });
    }
    const result = await query(
      `UPDATE projects SET title=$1, description=$2, tech_stack=$3, github_url=$4, live_url=$5,
       start_date=$6, end_date=$7, updated_at=NOW()
       WHERE id=$8 AND student_id=$9 RETURNING *`,
      [title, description || null, tech_stack || null, github_url || null, live_url || null, start_date || null, end_date || null, id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    return res.status(200).json({ success: true, message: 'Project updated.', data: result.rows[0] });
  } catch (error) {
    console.error('updateProject error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating project.' });
  }
};

const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM projects WHERE id=$1 AND student_id=$2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    return res.status(200).json({ success: true, message: 'Project deleted.' });
  } catch (error) {
    console.error('deleteProject error:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting project.' });
  }
};

module.exports = { getProjects, addProject, updateProject, deleteProject };

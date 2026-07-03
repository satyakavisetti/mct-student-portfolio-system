const { query } = require('../config/database');

const getPlacements = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM placements WHERE student_id = $1 ORDER BY offer_date DESC',
      [req.user.id]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getPlacements error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const addPlacement = async (req, res) => {
  try {
    const { company_name, role, package_lpa, placement_type, offer_date, joining_date, status } = req.body;
    if (!company_name) return res.status(400).json({ success: false, message: 'Company name is required.' });

    const result = await query(
      `INSERT INTO placements (student_id, company_name, role, package_lpa, placement_type, offer_date, joining_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, company_name, role, package_lpa || null, placement_type, offer_date || null, joining_date || null, status || 'pending']
    );
    return res.status(201).json({ success: true, message: 'Placement added.', data: result.rows[0] });
  } catch (error) {
    console.error('addPlacement error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const updatePlacement = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, role, package_lpa, placement_type, offer_date, joining_date, status } = req.body;

    const result = await query(
      `UPDATE placements SET company_name=$1, role=$2, package_lpa=$3, placement_type=$4,
       offer_date=$5, joining_date=$6, status=$7, updated_at=NOW()
       WHERE id=$8 AND student_id=$9 RETURNING *`,
      [company_name, role, package_lpa || null, placement_type, offer_date || null, joining_date || null, status, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Placement not found.' });
    }
    return res.status(200).json({ success: true, message: 'Placement updated.', data: result.rows[0] });
  } catch (error) {
    console.error('updatePlacement error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const deletePlacement = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM placements WHERE id=$1 AND student_id=$2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Placement not found.' });
    }
    return res.status(200).json({ success: true, message: 'Placement deleted.' });
  } catch (error) {
    console.error('deletePlacement error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getPlacements, addPlacement, updatePlacement, deletePlacement };

const { query } = require('../config/database');

const ALLOWED_TYPES = ['ACADEMIC', 'PROJECT', 'RESUME', 'CODING'];

const ensureMentorAssignmentsTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS mentor_assignments (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL,
      mentor_type VARCHAR(50) NOT NULL,
      mentor_name VARCHAR(255),
      mentor_phone VARCHAR(50),
      mentor_email VARCHAR(255),
      department VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(student_id, mentor_type)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_mentor_assignments_student_id
    ON mentor_assignments(student_id)
  `);
};

const normalizeMentorType = (mentorType) => {
  const normalized = String(mentorType || '').toUpperCase();
  return ALLOWED_TYPES.includes(normalized) ? normalized : null;
};

const getMentorAssignments = async (req, res) => {
  try {
    await ensureMentorAssignmentsTable();

    const result = await query(
      `SELECT mentor_type, mentor_name, mentor_phone, mentor_email, department, updated_at
       FROM mentor_assignments
       WHERE student_id = $1
       ORDER BY mentor_type`,
      [req.user.id]
    );

    const data = result.rows.reduce((acc, item) => {
      acc[item.mentor_type] = {
        mentor_name: item.mentor_name || '',
        mentor_phone: item.mentor_phone || '',
        mentor_email: item.mentor_email || '',
        department: item.department || '',
        updated_at: item.updated_at,
      };
      return acc;
    }, {});

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getMentorAssignments error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const saveMentorAssignment = async (req, res) => {
  try {
    await ensureMentorAssignmentsTable();

    const mentorType = normalizeMentorType(req.body.mentor_type || req.params.mentorType);
    if (!mentorType) {
      return res.status(400).json({ success: false, message: 'Invalid mentor type.' });
    }

    const { mentor_name = '', mentor_phone = '', mentor_email = '', department = '' } = req.body;

    const existing = await query(
      'SELECT id FROM mentor_assignments WHERE student_id = $1 AND mentor_type = $2',
      [req.user.id, mentorType]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await query(
        `UPDATE mentor_assignments
         SET mentor_name = $1,
             mentor_phone = $2,
             mentor_email = $3,
             department = $4,
             updated_at = NOW()
         WHERE student_id = $5 AND mentor_type = $6
         RETURNING mentor_type, mentor_name, mentor_phone, mentor_email, department, updated_at`,
        [mentor_name, mentor_phone, mentor_email, department, req.user.id, mentorType]
      );
    } else {
      result = await query(
        `INSERT INTO mentor_assignments
          (student_id, mentor_type, mentor_name, mentor_phone, mentor_email, department)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING mentor_type, mentor_name, mentor_phone, mentor_email, department, updated_at`,
        [req.user.id, mentorType, mentor_name, mentor_phone, mentor_email, department]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Mentor assignment saved.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('saveMentorAssignment error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getMentorAssignments, saveMentorAssignment };

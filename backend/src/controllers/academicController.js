const { query } = require('../config/database');

const ensureAuthorizedStudent = (req, studentId) => {
  const requestedId = Number(studentId);
  if (req.user.id !== requestedId && req.user.role !== 'coordinator') {
    const err = new Error('Not authorized to modify this student record.');
    err.status = 403;
    throw err;
  }
};

const getAcademic = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM academic_details WHERE student_id = $1 LIMIT 1',
      [req.user.id]
    );
    return res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    console.error('getAcademic error:', error);
    return res.status(500).json({ success: false, message: 'Server error while loading academic details.' });
  }
};

const postAcademic = async (req, res) => {
  try {
    const {
      college_name,
      department,
      degree,
      year_of_study,
      cgpa,
      backlogs,
      admission_year,
      passout_year,
      section,
      rollno,
    } = req.body;

    const existing = await query('SELECT id FROM academic_details WHERE student_id = $1', [req.user.id]);

    let result;
    if (existing.rows.length > 0) {
      result = await query(
        `UPDATE academic_details SET
          college_name=$1, department=$2, degree=$3, year_of_study=$4, cgpa=$5,
          backlogs=$6, admission_year=$7, passout_year=$8, section=$9, rollno=$10,
          updated_at=NOW()
         WHERE student_id=$11 RETURNING *`,
        [college_name || null, department || null, degree || null, year_of_study || null,
          cgpa || null, backlogs || 0, admission_year || null, passout_year || null,
          section || null, rollno || null, req.user.id]
      );
    } else {
      result = await query(
        `INSERT INTO academic_details
          (student_id, college_name, department, degree, year_of_study, cgpa, backlogs, admission_year, passout_year, section, rollno)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [req.user.id, college_name || null, department || null, degree || null, year_of_study || null,
          cgpa || null, backlogs || 0, admission_year || null, passout_year || null,
          section || null, rollno || null]
      );
    }

    return res.json({ success: true, message: 'Academic details saved.', data: result.rows[0] });
  } catch (error) {
    console.error('postAcademic error:', error);
    return res.status(500).json({ success: false, message: 'Server error while saving academic details.' });
  }
};

const putAcademic = async (req, res) => {
  try {
    const { studentId } = req.params;
    ensureAuthorizedStudent(req, studentId);

    const {
      college_name,
      department,
      degree,
      year_of_study,
      cgpa,
      backlogs,
      admission_year,
      passout_year,
      section,
      rollno,
    } = req.body;

    const existing = await query('SELECT id FROM academic_details WHERE student_id = $1', [studentId]);
    let result;
    if (existing.rows.length > 0) {
      result = await query(
        `UPDATE academic_details SET
          college_name=$1, department=$2, degree=$3, year_of_study=$4, cgpa=$5,
          backlogs=$6, admission_year=$7, passout_year=$8, section=$9, rollno=$10,
          updated_at=NOW()
         WHERE student_id=$11 RETURNING *`,
        [college_name || null, department || null, degree || null, year_of_study || null,
          cgpa || null, backlogs || 0, admission_year || null, passout_year || null,
          section || null, rollno || null, studentId]
      );
    } else {
      result = await query(
        `INSERT INTO academic_details
          (student_id, college_name, department, degree, year_of_study, cgpa, backlogs, admission_year, passout_year, section, rollno)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [studentId, college_name || null, department || null, degree || null, year_of_study || null,
          cgpa || null, backlogs || 0, admission_year || null, passout_year || null,
          section || null, rollno || null]
      );
    }

    return res.json({ success: true, message: 'Academic details saved.', data: result.rows[0] });
  } catch (error) {
    console.error('putAcademic error:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Server error while updating academic details.' });
  }
};

const getSchool = async (req, res) => {
  try {
    const result = await query('SELECT * FROM school_details WHERE student_id = $1 LIMIT 1', [req.user.id]);
    return res.json({ success: true, schoolDetails: result.rows[0] || null });
  } catch (error) {
    console.error('getSchool error:', error);
    return res.status(500).json({ success: false, message: 'Server error while loading school details.' });
  }
};

const putSchool = async (req, res) => {
  try {
    const { school_name, board, pass_year, gpa } = req.body;
    const existing = await query('SELECT id FROM school_details WHERE student_id = $1', [req.user.id]);
    let result;
    if (existing.rows.length > 0) {
      result = await query(
        `UPDATE school_details SET school_name=$1, board=$2, pass_year=$3, gpa=$4, updated_at=NOW()
         WHERE student_id=$5 RETURNING *`,
        [school_name || null, board || null, pass_year || null, gpa || null, req.user.id]
      );
    } else {
      result = await query(
        `INSERT INTO school_details (student_id, school_name, board, pass_year, gpa)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [req.user.id, school_name || null, board || null, pass_year || null, gpa || null]
      );
    }
    return res.json({ success: true, message: 'School details saved.', schoolDetails: result.rows[0] });
  } catch (error) {
    console.error('putSchool error:', error);
    return res.status(500).json({ success: false, message: 'Server error while saving school details.' });
  }
};

const getIntermediate = async (req, res) => {
  try {
    const result = await query('SELECT * FROM inter_details WHERE student_id = $1 LIMIT 1', [req.user.id]);
    return res.json({ success: true, intermediateDetails: result.rows[0] || null });
  } catch (error) {
    console.error('getIntermediate error:', error);
    return res.status(500).json({ success: false, message: 'Server error while loading intermediate details.' });
  }
};

const putIntermediate = async (req, res) => {
  try {
    const {
      college_name,
      board,
      ipe_marks,
      ipe_percentage,
      eamcet_rank,
      jee_mains_percentile,
      jee_advanced_percentile,
    } = req.body;
    const existing = await query('SELECT id FROM inter_details WHERE student_id = $1', [req.user.id]);
    let result;
    if (existing.rows.length > 0) {
      result = await query(
        `UPDATE inter_details SET college_name=$1, board=$2, ipe_marks=$3, ipe_percentage=$4,
          eamcet_rank=$5, jee_mains_percentile=$6, jee_advanced_percentile=$7, updated_at=NOW()
         WHERE student_id=$8 RETURNING *`,
        [college_name || null, board || null, ipe_marks || null, ipe_percentage || null,
          eamcet_rank || null, jee_mains_percentile || null, jee_advanced_percentile || null, req.user.id]
      );
    } else {
      result = await query(
        `INSERT INTO inter_details (student_id, college_name, board, ipe_marks, ipe_percentage, eamcet_rank, jee_mains_percentile, jee_advanced_percentile)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [req.user.id, college_name || null, board || null, ipe_marks || null, ipe_percentage || null,
          eamcet_rank || null, jee_mains_percentile || null, jee_advanced_percentile || null]
      );
    }
    return res.json({ success: true, message: 'Intermediate details saved.', intermediateDetails: result.rows[0] });
  } catch (error) {
    console.error('putIntermediate error:', error);
    return res.status(500).json({ success: false, message: 'Server error while saving intermediate details.' });
  }
};

const getBtech = async (req, res) => {
  try {
    const result = await query('SELECT * FROM btech_details WHERE student_id = $1 LIMIT 1', [req.user.id]);
    return res.json({ success: true, btechDetails: result.rows[0] || null });
  } catch (error) {
    console.error('getBtech error:', error);
    return res.status(500).json({ success: false, message: 'Server error while loading BTech details.' });
  }
};

const putBtech = async (req, res) => {
  try {
    const { college_name, branch, admission_year, passout_year, current_cgpa } = req.body;
    const existing = await query('SELECT id FROM btech_details WHERE student_id = $1', [req.user.id]);
    let result;
    if (existing.rows.length > 0) {
      result = await query(
        `UPDATE btech_details SET college_name=$1, branch=$2, admission_year=$3, passout_year=$4,
          current_cgpa=$5, updated_at=NOW()
         WHERE student_id=$6 RETURNING *`,
        [college_name || null, branch || null, admission_year || null, passout_year || null, current_cgpa || null, req.user.id]
      );
    } else {
      result = await query(
        `INSERT INTO btech_details (student_id, college_name, branch, admission_year, passout_year, current_cgpa)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [req.user.id, college_name || null, branch || null, admission_year || null, passout_year || null, current_cgpa || null]
      );
    }
    return res.json({ success: true, message: 'BTech details saved.', btechDetails: result.rows[0] });
  } catch (error) {
    console.error('putBtech error:', error);
    return res.status(500).json({ success: false, message: 'Server error while saving BTech details.' });
  }
};

const getSemesters = async (req, res) => {
  try {
    const result = await query('SELECT * FROM semesters WHERE student_id = $1 ORDER BY semester_number ASC', [req.user.id]);
    return res.json({ success: true, semesters: result.rows });
  } catch (error) {
    console.error('getSemesters error:', error);
    return res.status(500).json({ success: false, message: 'Server error while loading semesters.' });
  }
};

const postSemester = async (req, res) => {
  try {
    const { semester_number } = req.body;
    if (!semester_number) {
      return res.status(400).json({ success: false, message: 'Semester number is required.' });
    }
    const existing = await query(
      'SELECT * FROM semesters WHERE student_id = $1 AND semester_number = $2 LIMIT 1',
      [req.user.id, semester_number]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Semester already exists.' });
    }
    const result = await query(
      `INSERT INTO semesters (student_id, semester_number, created_at, updated_at)
       VALUES ($1,$2,NOW(),NOW()) RETURNING *`,
      [req.user.id, semester_number]
    );
    return res.status(201).json({ success: true, message: 'Semester created.', semester: result.rows[0] });
  } catch (error) {
    console.error('postSemester error:', error);
    return res.status(500).json({ success: false, message: 'Server error while creating semester.' });
  }
};

const getSemesterSubjects = async (req, res) => {
  try {
    const { semesterId } = req.params;
    const semester = await query('SELECT id FROM semesters WHERE id = $1 AND student_id = $2', [semesterId, req.user.id]);
    if (semester.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Semester not found.' });
    }
    const result = await query('SELECT * FROM subjects WHERE semester_id = $1 AND student_id = $2 ORDER BY id ASC', [semesterId, req.user.id]);
    return res.json({ success: true, subjects: result.rows });
  } catch (error) {
    console.error('getSemesterSubjects error:', error);
    return res.status(500).json({ success: false, message: 'Server error while loading subjects.' });
  }
};

const postSemesterSubject = async (req, res) => {
  try {
    const { semesterId } = req.params;
    const { subject_name, mid1_marks, mid2_marks, semester_marks, grade, credits } = req.body;
    if (!subject_name) {
      return res.status(400).json({ success: false, message: 'Subject name is required.' });
    }
    const semester = await query('SELECT id FROM semesters WHERE id = $1 AND student_id = $2', [semesterId, req.user.id]);
    if (semester.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Semester not found.' });
    }
    const result = await query(
      `INSERT INTO subjects (semester_id, student_id, subject_name, mid1_marks, mid2_marks, semester_marks, grade, credits, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) RETURNING *`,
      [semesterId, req.user.id, subject_name, mid1_marks || null, mid2_marks || null, semester_marks || null, grade || null, credits || null]
    );
    return res.status(201).json({ success: true, message: 'Subject added.', subject: result.rows[0] });
  } catch (error) {
    console.error('postSemesterSubject error:', error);
    return res.status(500).json({ success: false, message: 'Server error while adding subject.' });
  }
};

const updateSemesterSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject_name, mid1_marks, mid2_marks, semester_marks, grade, credits } = req.body;
    const existing = await query('SELECT id FROM subjects WHERE id = $1 AND student_id = $2', [id, req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }
    const result = await query(
      `UPDATE subjects SET subject_name=$1, mid1_marks=$2, mid2_marks=$3,
          semester_marks=$4, grade=$5, credits=$6, updated_at=NOW()
       WHERE id=$7 AND student_id=$8 RETURNING *`,
      [subject_name || null, mid1_marks || null, mid2_marks || null, semester_marks || null, grade || null, credits || null, id, req.user.id]
    );
    return res.json({ success: true, message: 'Subject updated.', subject: result.rows[0] });
  } catch (error) {
    console.error('updateSemesterSubject error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating subject.' });
  }
};

const deleteSemesterSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM subjects WHERE id = $1 AND student_id = $2 RETURNING id', [id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }
    return res.json({ success: true, message: 'Subject deleted.' });
  } catch (error) {
    console.error('deleteSemesterSubject error:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting subject.' });
  }
};

module.exports = {
  getAcademic,
  postAcademic,
  putAcademic,
  getSchool,
  putSchool,
  getIntermediate,
  putIntermediate,
  getBtech,
  putBtech,
  getSemesters,
  postSemester,
  getSemesterSubjects,
  postSemesterSubject,
  updateSemesterSubject,
  deleteSemesterSubject,
};

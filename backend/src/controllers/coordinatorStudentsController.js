const { query } = require('../config/database');
const { getStudentAnalytics } = require('../services/codingAnalyticsService');
const { calculatePlacementReadiness } = require('../services/analyticsService');

const ensureCoordinatorAccess = (req, res) => {
  if (req.user.role !== 'coordinator') {
    res.status(403).json({ success: false, message: 'Coordinator access required.' });
    return false;
  }
  return true;
};

const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const buildSortColumn = (sortBy) => {
  switch (sortBy) {
    case 'avg_smart_score':
      return 'cp.avg_smart_score';
    case 'best_smart_score':
      return 'cp.best_smart_score';
    case 'activity_status':
      return 'cp.activity_status';
    case 'cgpa':
      return 'ad.cgpa';
    case 'name':
      return 'COALESCE(NULLIF(TRIM(pd.full_name), \'\'), s.mssid)';
    default:
      return 'cp.best_smart_score';
  }
};

const getCoordinatorStudents = async (req, res) => {
  try {
    if (!ensureCoordinatorAccess(req, res)) return;

    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : null;
    const sortBy = req.query.sortBy ? String(req.query.sortBy).trim() : 'best_smart_score';
    const sortOrder = String(req.query.sortOrder || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const activityStatus = req.query.activityStatus ? String(req.query.activityStatus).trim().toLowerCase() : null;

    const params = [];
    const whereClauses = ["LOWER(s.role) = 'student'"];

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(
        `(LOWER(COALESCE(pd.full_name, s.mssid, '')) LIKE $${params.length} OR LOWER(COALESCE(s.mssid, '')) LIKE $${params.length} OR LOWER(COALESCE(ad.department, '')) LIKE $${params.length} OR LOWER(COALESCE(s.college_name, '')) LIKE $${params.length})`
      );
    }

    if (activityStatus) {
      params.push(activityStatus);
      whereClauses.push(`LOWER(COALESCE(cp.activity_status, 'unverified')) = $${params.length}`);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const orderBy = buildSortColumn(sortBy);

    const queryText = `
      SELECT
        s.id,
        s.mssid,
        s.role,
        s.mss_batch,
        COALESCE(pd.full_name, '') AS full_name,
        COALESCE(s.college_name, '') AS college_name,
        COALESCE(ad.department, '') AS department,
        COALESCE(ad.year_of_study, NULL) AS year_of_study,
        COALESCE(s.year, NULL) AS year,
        COALESCE(cp.best_smart_score, 0)::numeric(10,2) AS best_smart_score,
        COALESCE(cp.avg_smart_score, 0)::numeric(10,2) AS avg_smart_score,
        COALESCE(cp.max_coding_score, 0)::numeric(10,2) AS coding_score,
        COALESCE(cp.activity_status, 'unverified') AS activity_status,
        COALESCE(v.total_hours, 0)::numeric(10,2) AS total_volunteering_hours,
        COALESCE(v.activity_count, 0)::int AS volunteering_activity_count,
        COALESCE(p.project_count, 0)::int AS total_projects,
        COALESCE(gh.github_handle, '') AS github_handle,
        COALESCE(gh.github_profile_url, '') AS github_profile_url,
        COALESCE(g.goals_count, 0)::int AS total_goals,
        COALESCE(
          LEAST(
            100,
            ROUND(
              COALESCE(
                (CASE
                  WHEN ad.cgpa IS NULL THEN 0
                  ELSE ((LEAST(ad.cgpa, 10) / 10.0) * 100 * 0.75) + (GREATEST(0, 100 - LEAST(ad.backlogs, 5) * 20) * 0.25)
                END),
                0
              ) * 0.3
              + (CASE WHEN r.has_resume THEN 100 ELSE 0 END) * 0.2
              + LEAST(g.goals_count, 8) * 100.0 / 8 * 0.2
              + LEAST(p.project_count, 8) * 100.0 / 8 * 0.15
              + LEAST(COALESCE(cp.max_coding_score, 0), 100) * 0.15
            )
          ),
          0
        )::int AS placement_readiness_score
      FROM students s
      LEFT JOIN LATERAL (
        SELECT handle AS github_handle, profile_url AS github_profile_url
        FROM coding_handles
        WHERE student_id = s.id AND LOWER(platform) = 'github'
        ORDER BY is_primary DESC, id ASC
        LIMIT 1
      ) gh ON true
      LEFT JOIN personal_details pd ON pd.student_id = s.id
      LEFT JOIN academic_details ad ON ad.student_id = s.id
      LEFT JOIN LATERAL (
        SELECT
          MAX(COALESCE(coding_score, estimated_score, 0)) AS max_coding_score,
          AVG(COALESCE(coding_score, estimated_score, 0))::numeric(10,2) AS avg_smart_score,
          MAX(COALESCE(coding_score, estimated_score, 0)) AS best_smart_score,
          MAX(activity_status) AS activity_status
        FROM coding_profiles
        WHERE student_id = s.id
      ) cp ON true
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(SUM(hours), 0)::numeric(10,2) AS total_hours,
          COUNT(*)::int AS activity_count
        FROM volunteering
        WHERE student_id = s.id
      ) v ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS project_count
        FROM projects
        WHERE student_id = s.id
      ) p ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS goals_count
        FROM goals
        WHERE student_id = s.id
      ) g ON true
      LEFT JOIN LATERAL (
        SELECT EXISTS(SELECT 1 FROM resume WHERE student_id = s.id) AS has_resume
      ) r ON true
      ${whereClause}
      ORDER BY ${orderBy} ${sortOrder}
      LIMIT 500
    `;

    const result = await query(queryText, params);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getCoordinatorStudents error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching students.' });
  }
};

const loadGoalTopics = async (goalId) => {
  const topicColumnsRes = await query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='goal_topics' AND column_name='progress_percentage' LIMIT 1"
  );
  const hasProgress = topicColumnsRes.rows.length > 0;

  const queryText = hasProgress
    ? 'SELECT id, topic_name, COALESCE(progress_percentage, 0) AS progress_percentage FROM goal_topics WHERE goal_id = $1 ORDER BY id ASC'
    : 'SELECT id, topic_name FROM goal_topics WHERE goal_id = $1 ORDER BY id ASC';

  const result = await query(queryText, [goalId]);
  return result.rows.map((topic) => ({
    id: topic.id,
    topic_name: topic.topic_name,
    progress_percentage: hasProgress ? Number(topic.progress_percentage || 0) : 0,
  }));
};

const computeGoalCompletion = (goals) => {
  if (!Array.isArray(goals) || goals.length === 0) return null;
  const total = goals.reduce((sum, goal) => sum + (goal.progressStats?.average ?? 0), 0);
  return Math.round(total / goals.length);
};

const fetchCoordinatorStudentReport = async (studentId) => {
  console.log('fetchCoordinatorStudentReport: start', { studentId });
  const studentResult = await query(
    `
      SELECT
        s.id,
        s.mssid,
        s.role,
        s.mss_batch,
        s.college_name,
        s.year,
        COALESCE(pd.full_name, '') AS full_name,
        pd.email,
        pd.phone,
        pd.date_of_birth,
        pd.gender,
        pd.address,
        pd.city,
        pd.state,
        pd.pincode,
        s.block_id,
        s.mentor_id,
        COALESCE(b.block_name, '') AS block_name,
        COALESCE(m.mentor_name, '') AS mentor_name,
        COALESCE(m.mentor_phone, '') AS mentor_phone,
        COALESCE(m.mentor_email, '') AS mentor_email,
        COALESCE(ad.department, '') AS department,
        COALESCE(ad.degree, '') AS degree,
        ad.year_of_study,
        ad.cgpa,
        ad.backlogs,
        ad.admission_year,
        ad.passout_year,
        ad.section,
        ad.rollno,
        COALESCE(f.father_name, '') AS father_name,
        COALESCE(f.father_occupation, '') AS father_occupation,
        COALESCE(f.mother_name, '') AS mother_name,
        COALESCE(f.mother_occupation, '') AS mother_occupation
      FROM students s
      LEFT JOIN personal_details pd ON pd.student_id = s.id
      LEFT JOIN academic_details ad ON ad.student_id = s.id
      LEFT JOIN family_details f ON f.student_id = s.id
      LEFT JOIN blocks b ON b.id = s.block_id
      LEFT JOIN mentors m ON m.id = s.mentor_id
      WHERE s.id = $1
      LIMIT 1
    `,
    [studentId]
  );

  if (studentResult.rows.length === 0) {
    console.log('fetchCoordinatorStudentReport: no student row found', { studentId });
    return null;
  }

  const studentRow = studentResult.rows[0];
  console.log('fetchCoordinatorStudentReport: studentRow loaded', { id: studentRow.id, mssid: studentRow.mssid });

  console.log('fetchCoordinatorStudentReport: loading related student records');
  const relatedQueries = [
    query('SELECT id, sibling_name, education, occupation, created_at, updated_at FROM siblings WHERE student_id = $1 ORDER BY id ASC', [studentId]),
    query('SELECT id, semester_number, sgpa, created_at, updated_at FROM semesters WHERE student_id = $1 ORDER BY semester_number ASC', [studentId]),
    query('SELECT id, semester_id, student_id, subject_name, mid1_marks, mid2_marks, semester_marks, grade, credits FROM subjects WHERE student_id = $1 ORDER BY semester_id ASC, id ASC', [studentId]),
    query('SELECT id, title, organization, role, description, start_date, end_date, hours, category, certificate_url, certificate_path, created_at, updated_at FROM volunteering WHERE student_id = $1 ORDER BY start_date DESC NULLS LAST, id DESC', [studentId]),
    query('SELECT id, student_id, title, goal_type, custom_goal_type, description, target_date, status, created_at, updated_at FROM goals WHERE student_id = $1 ORDER BY created_at DESC', [studentId]),
    query('SELECT * FROM coding_profiles WHERE student_id = $1 ORDER BY platform ASC, id ASC', [studentId]),
    query('SELECT id, title, issuing_organization, issue_date, expiry_date, credential_id, credential_url, created_at, updated_at FROM certifications WHERE student_id = $1 ORDER BY created_at DESC', [studentId]),
    query('SELECT * FROM achievements WHERE student_id = $1 ORDER BY created_at DESC', [studentId]),
    query('SELECT id, company_name, role, package_lpa, placement_type, offer_date, joining_date, status, created_at, updated_at FROM placements WHERE student_id = $1 ORDER BY offer_date DESC NULLS LAST, id DESC', [studentId]),
    query('SELECT id, file_name, file_path, file_size, uploaded_at, updated_at FROM resume WHERE student_id = $1 LIMIT 1', [studentId]),
    query('SELECT id, platform, question_name, difficulty, question_url, date_solved, created_at FROM recent_questions WHERE student_id = $1 ORDER BY date_solved DESC NULLS LAST, id DESC LIMIT 20', [studentId]),
  ];

  const relatedResults = await Promise.all(relatedQueries);

  const [siblingsRes, semestersRes, subjectsRes, volunteeringRes, goalsRes, codingRes, certificationsRes, achievementsRes, placementsRes, resumeRes, recentQuestionsRes] = relatedResults;

  const subjectsBySemester = subjectsRes.rows.reduce((acc, subject) => {
    const semesterId = subject.semester_id;
    if (!acc[semesterId]) acc[semesterId] = [];
    acc[semesterId].push(subject);
    return acc;
  }, {});

  const semesters = semestersRes.rows.map((semester) => ({
    ...semester,
    subjects: subjectsBySemester[semester.id] || [],
  }));

  const goals = await Promise.all(goalsRes.rows.map(async (goal) => {
    const topics = await loadGoalTopics(goal.id);
    const totalTopics = topics.length;
    const completedTopics = topics.filter((topic) => Number(topic.progress_percentage || 0) === 100).length;
    const average = totalTopics > 0 ? Math.round(topics.reduce((sum, topic) => sum + (Number(topic.progress_percentage || 0)), 0) / totalTopics) : 0;
    return {
      ...goal,
      topics,
      progressStats: {
        average,
        totalTopics,
        completedTopics,
        pendingTopics: totalTopics - completedTopics,
      },
    };
  }));

  console.log('fetchCoordinatorStudentReport: calculating analytics and placement readiness', { studentId });
  const codingAnalytics = (await getStudentAnalytics(studentId)) || {};
  const placementReadiness = await calculatePlacementReadiness(studentId);
  console.log('fetchCoordinatorStudentReport: analytics result', { codingAnalyticsKeys: Object.keys(codingAnalytics || {}), placementReadiness: placementReadiness ? Object.keys(placementReadiness) : null });
  const githubHandleEntry = (codingAnalytics.handles || []).find((entry) => String(entry.platform || '').toLowerCase() === 'github');
  const githubHandle = githubHandleEntry ? String(githubHandleEntry.handle || '').trim() : '';
  const githubProfileUrl = githubHandleEntry ? String(githubHandleEntry.profileUrl || '').trim() : '';

  const codingPlatformProfiles = Array.isArray(codingAnalytics.platformProfiles) ? codingAnalytics.platformProfiles : [];
  const avgCodingScore = codingPlatformProfiles.length
    ? Math.round(codingPlatformProfiles.reduce((sum, profile) => sum + (Number(profile.codingScore) || 0), 0) / codingPlatformProfiles.length)
    : null;
  const bestCodingScore = codingPlatformProfiles.reduce((best, profile) => Math.max(best, Number(profile.codingScore) || 0), 0) || null;
  codingAnalytics.avgCodingScore = avgCodingScore;
  codingAnalytics.bestCodingScore = bestCodingScore;

  const contestHistory = Array.isArray(codingAnalytics.contestHistory)
    ? codingAnalytics.contestHistory
    : Object.values(codingAnalytics.contestHistory || {}).flat();

  const goalCompletionPercent = computeGoalCompletion(goals);
  const placementReadinessScore = placementReadiness?.placementReadinessScore ?? null;
  const overallMctScore = placementReadinessScore != null && goalCompletionPercent != null
    ? Math.round((placementReadinessScore + goalCompletionPercent) / 2)
    : placementReadinessScore ?? goalCompletionPercent ?? null;

  const responseData = {
    student: {
      id: studentRow.id,
      mssid: studentRow.mssid,
      role: studentRow.role,
      mss_batch: studentRow.mss_batch,
      college_name: studentRow.college_name,
      year: studentRow.year,
      full_name: studentRow.full_name,
      mentor_name: studentRow.mentor_name || null,
      mentor_phone: studentRow.mentor_phone || null,
      mentor_email: studentRow.mentor_email || null,
      block_name: studentRow.block_name || null,
    },
    github_handle: githubHandle,
    github_profile_url: githubProfileUrl,
    personal: {
      full_name: studentRow.full_name || null,
      email: studentRow.email || null,
      phone: studentRow.phone || null,
      date_of_birth: studentRow.date_of_birth || null,
      gender: studentRow.gender || null,
      address: studentRow.address || null,
      city: studentRow.city || null,
      state: studentRow.state || null,
      pincode: studentRow.pincode || null,
      block_id: studentRow.block_id || null,
      block_name: studentRow.block_name || null,
      mentor_id: studentRow.mentor_id || null,
      role: studentRow.role || null,
    },
    academic: {
      department: studentRow.department || null,
      degree: studentRow.degree || null,
      year_of_study: studentRow.year_of_study || null,
      cgpa: studentRow.cgpa != null ? Number(studentRow.cgpa) : null,
      backlogs: studentRow.backlogs != null ? Number(studentRow.backlogs) : null,
      admission_year: studentRow.admission_year || null,
      passout_year: studentRow.passout_year || null,
      section: studentRow.section || null,
      rollno: studentRow.rollno || null,
      college_name: studentRow.college_name || null,
    },
    family: {
      father_name: studentRow.father_name || null,
      father_occupation: studentRow.father_occupation || null,
      mother_name: studentRow.mother_name || null,
      mother_occupation: studentRow.mother_occupation || null,
    },
    siblings: siblingsRes.rows,
    semesters,
    volunteering: volunteeringRes.rows,
    goals,
    coding: codingRes.rows,
    projects: [],
    certifications: certificationsRes.rows,
    achievements: achievementsRes.rows,
    placements: placementsRes.rows,
    resume: resumeRes.rows[0] || null,
    codingAnalytics,
    contestHistory,
    codingHistory: [],
    recentQuestions: recentQuestionsRes.rows,
    goal_completion_percent: goalCompletionPercent,
    overallGoalPercent: goalCompletionPercent,
    placement_readiness_score: placementReadinessScore,
    overall_mct_score: overallMctScore,
  };

  const projectsResult = await query('SELECT * FROM projects WHERE student_id = $1 ORDER BY created_at DESC', [studentId]);
  responseData.projects = projectsResult.rows;

  const codingHistoryResult = await query(
    `SELECT id, platform, rating, problems_solved, contest_count, global_rank, country_rank, recorded_date
     FROM coding_statistics
     WHERE student_id = $1
     ORDER BY recorded_date DESC NULLS LAST, id DESC
     LIMIT 20`,
    [studentId]
  );
  responseData.codingHistory = codingHistoryResult.rows;
  console.log('fetchCoordinatorStudentReport: assembled responseData', {
    studentId,
    mssid: studentRow.mssid,
    goalsCount: goals.length,
    codingProfiles: codingRes.rows.length,
    projectsCount: projectsResult.rows.length,
    certificationsCount: certificationsRes.rows.length,
    placementsCount: placementsRes.rows.length,
  });

  return responseData;
};

const getCoordinatorStudentById = async (req, res) => {
  try {
    if (!ensureCoordinatorAccess(req, res)) return;

    const studentId = safeNumber(req.params.id);
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    const responseData = await fetchCoordinatorStudentReport(studentId);
    if (!responseData) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    return res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('getCoordinatorStudentById error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching student details.' });
  }
};

const getCoordinatorStudentProjects = async (req, res) => {
  try {
    if (!ensureCoordinatorAccess(req, res)) return;

    const studentId = safeNumber(req.params.id);
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    const result = await query(
      'SELECT * FROM projects WHERE student_id = $1 ORDER BY created_at DESC',
      [studentId]
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getCoordinatorStudentProjects error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching student projects.' });
  }
};

const getCoordinatorStudentVolunteering = async (req, res) => {
  try {
    if (!ensureCoordinatorAccess(req, res)) return;

    const studentId = safeNumber(req.params.id);
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    const studentResult = await query(
      `SELECT s.id,
              s.mssid,
              COALESCE(pd.full_name, '') AS full_name,
              COALESCE(s.college_name, '') AS college_name,
              s.year AS year,
              s.mss_batch
       FROM students s
       LEFT JOIN personal_details pd ON pd.student_id = s.id
       WHERE s.id = $1
       LIMIT 1`,
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const volunteeringRes = await query(
      'SELECT id, title, organization, role, description, start_date, end_date, hours, category, certificate_url, certificate_path, created_at, updated_at FROM volunteering WHERE student_id = $1 ORDER BY start_date DESC NULLS LAST, id DESC',
      [studentId]
    );

    const student = studentResult.rows[0];
    const activities = (volunteeringRes.rows || []).map((a) => ({
      id: a.id,
      title: a.title,
      organization: a.organization,
      role: a.role,
      description: a.description,
      start_date: a.start_date,
      end_date: a.end_date,
      hours: a.hours != null ? Number(a.hours) : null,
      category: a.category,
      certificate_url: a.certificate_url || null,
      certificate_path: a.certificate_path || null,
      created_at: a.created_at,
      updated_at: a.updated_at,
      // volunteering table does not have verification/approval columns
      verificationStatus: null,
      approvalStatus: null,
    }));

    const totalHours = activities.reduce((sum, a) => sum + Number(a.hours || 0), 0);
    const remaining = Math.max(0, 20 - totalHours);
    const eligibility = totalHours >= 20 ? 'Eligible' : 'Not Eligible';

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: student.id,
          full_name: student.full_name,
          mssid: student.mssid,
          college_name: student.college_name,
          year: student.year,
          mss_batch: student.mss_batch,
        },
        volunteering: activities,
        summary: {
          total_hours: totalHours,
          remaining_hours: remaining,
          eligibility,
          activity_count: activities.length,
        },
      },
    });
  } catch (error) {
    console.error('getCoordinatorStudentVolunteering error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching volunteering details.' });
  }
};

const getCoordinatorReportCardByMssid = async (req, res) => {
  try {
    if (!ensureCoordinatorAccess(req, res)) return;

    const mssid = String(req.params.mssid || '').trim().toUpperCase();
    console.log('getCoordinatorReportCardByMssid called', { mssid });
    if (!mssid) {
      return res.status(400).json({ success: false, message: 'MSSID is required.' });
    }

    const studentIdResult = await query('SELECT id FROM students WHERE mssid = $1 AND role = $2 LIMIT 1', [mssid, 'student']);
    if (studentIdResult.rows.length === 0) {
      console.log('getCoordinatorReportCardByMssid: student not found', { mssid });
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const studentId = studentIdResult.rows[0].id;
    const responseData = await fetchCoordinatorStudentReport(studentId);
    if (!responseData) {
      console.log('getCoordinatorReportCardByMssid: failed to load report data', { studentId, mssid });
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    console.log('getCoordinatorReportCardByMssid: returning report data', { studentId, mssid });
    return res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('getCoordinatorReportCardByMssid error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching report card.' });
  }
};

module.exports = {
  getCoordinatorStudents,
  getCoordinatorStudentById,
  getCoordinatorStudentProjects,
  getCoordinatorStudentVolunteering,
  getCoordinatorReportCardByMssid,
};

const { query } = require('../config/database');

const ensureCoordinatorAccess = (req, res) => {
  if (req.user.role !== 'coordinator') {
    res.status(403).json({ success: false, message: 'Coordinator access required.' });
    return false;
  }
  return true;
};

const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

const normalizeCollegeValue = (value) => {
  const raw = normalizeText(value);
  if (!raw) return '';

  const aliases = {
    vasavi: 'Vasavi',
    'vasavi college of engineering': 'Vasavi',
    cbit: 'CBIT',
    'chaitanya bharathi institute of technology': 'CBIT',
    kmit: 'KMIT',
    vardhaman: 'Vardhaman',
    narayanamma: 'Narayanamma',
    bvrit: 'BVRIT',
    'iiit hyderabad': 'IIIT Hyderabad',
    'iiit-hyderabad': 'IIIT Hyderabad',
    other: 'Other',
  };

  return aliases[raw] || String(value).trim();
};

const normalizeYearValue = (value) => {
  const raw = normalizeText(value);
  if (!raw) return '';

  const aliases = {
    '1': '1st Year',
    '1st': '1st Year',
    '1st year': '1st Year',
    'first year': '1st Year',
    'year 1': '1st Year',
    '2': '2nd Year',
    '2nd': '2nd Year',
    '2nd year': '2nd Year',
    'second year': '2nd Year',
    'year 2': '2nd Year',
    '3': '3rd Year',
    '3rd': '3rd Year',
    '3rd year': '3rd Year',
    'third year': '3rd Year',
    'year 3': '3rd Year',
    '4': '4th Year',
    '4th': '4th Year',
    '4th year': '4th Year',
    'fourth year': '4th Year',
    'year 4': '4th Year',
  };

  if (aliases[raw]) return aliases[raw];
  if (raw.includes('1st') || raw.includes('first') || raw.includes('year 1') || raw.includes('i year')) return '1st Year';
  if (raw.includes('2nd') || raw.includes('second') || raw.includes('year 2') || raw.includes('ii year')) return '2nd Year';
  if (raw.includes('3rd') || raw.includes('third') || raw.includes('year 3') || raw.includes('iii year')) return '3rd Year';
  if (raw.includes('4th') || raw.includes('fourth') || raw.includes('year 4') || raw.includes('iv year')) return '4th Year';

  return String(value).trim();
};

const getCoordinatorAnalyticsDashboard = async (req, res) => {
  try {
    if (!ensureCoordinatorAccess(req, res)) return;

    const studentsRes = await query('SELECT COUNT(*)::int AS count FROM students');
    const coordinatorsRes = await query("SELECT COUNT(*)::int AS count FROM students WHERE LOWER(role) = 'coordinator'");

    let blocksRes = { rows: [{ count: 0 }] };
    try {
      blocksRes = await query('SELECT COUNT(*)::int AS count FROM blocks');
    } catch (e) {
      console.error('Blocks query failed:', e);
    }

    let placementsRes = { rows: [{ total: 0, placed: 0, avg_package: 0 }] };
    try {
      placementsRes = await query('SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = \'placed\')::int AS placed, COALESCE(AVG(package_lpa), 0)::numeric(10,2) AS avg_package FROM placements');
    } catch (e) {
      console.error('Placements query failed:', e);
    }

    let cgpaRes = { rows: [] };
    try {
      cgpaRes = await query('SELECT CASE WHEN cgpa IS NULL THEN \'N/A\' ELSE CAST(FLOOR(cgpa / 2.0) * 2 AS VARCHAR) || \'-\' || CAST(FLOOR(cgpa / 2.0) * 2 + 1 AS VARCHAR) END AS category, COUNT(*)::int AS count FROM academic_details GROUP BY 1 ORDER BY 1');
    } catch (e) {
      console.error('CGPA query failed:', e);
    }

    let codingPlatformsRes = { rows: [] };
    try {
      codingPlatformsRes = await query(`
        SELECT LOWER(platform) AS platform, AVG(COALESCE(current_rating, rating, contest_rating))::numeric(10,2) AS avg_rating,
               AVG(COALESCE(coding_score, estimated_score, 0))::numeric(10,2) AS avg_coding_score
        FROM coding_profiles
        WHERE platform IS NOT NULL
        GROUP BY LOWER(platform)
        ORDER BY LOWER(platform)
      `);
    } catch (e) {
      console.error('Coding platforms query failed:', e);
      codingPlatformsRes = { rows: [] };
    }

    let topPerformersRes = { rows: [] };
    try {
      topPerformersRes = await query(`
        SELECT s.full_name, s.mssid, cp.platform, COALESCE(cp.current_rating, cp.rating, cp.contest_rating) AS rating,
               COALESCE(cp.coding_score, cp.estimated_score) AS coding_score, cp.global_rank
        FROM coding_profiles cp
        LEFT JOIN students s ON s.id = cp.student_id
        WHERE cp.student_id IS NOT NULL
        ORDER BY COALESCE(cp.coding_score, cp.estimated_score, 0) DESC, COALESCE(cp.current_rating, cp.rating, cp.contest_rating, 0) DESC
        LIMIT 10
      `);
    } catch (e) {
      console.error('Top performers query failed:', e);
      topPerformersRes = { rows: [] };
    }

    res.json({
      success: true,
      stats: {
        totalStudents: studentsRes.rows[0]?.count || 0,
        totalCoordinators: coordinatorsRes.rows[0]?.count || 0,
        totalBlocks: blocksRes.rows[0]?.count || 0,
        placements: {
          total: placementsRes.rows[0]?.total || 0,
          placed: placementsRes.rows[0]?.placed || 0,
          avg_package: Number(placementsRes.rows[0]?.avg_package || 0),
        },
        codingPlatforms: (codingPlatformsRes.rows || []).map((row) => ({
          platform: row.platform,
          avg_rating: Number(row.avg_rating || 0),
          avg_coding_score: Number(row.avg_coding_score || 0),
        })),
        cgpaDistribution: (cgpaRes.rows || []).map((row) => ({ category: row.category, count: Number(row.count || 0) })),
        topPerformers: (topPerformersRes.rows || []).map((row) => ({
          full_name: row.full_name,
          mssid: row.mssid,
          platform: row.platform,
          rating: row.rating,
          coding_score: row.coding_score,
          global_rank: row.global_rank,
        })),
      },
    });
  } catch (error) {
    console.error('Coordinator analytics dashboard error:', error);
    return res.json({
      success: true,
      stats: {
        totalStudents: 0,
        totalCoordinators: 0,
        totalBlocks: 0,
        placements: { total: 0, placed: 0, avg_package: 0 },
        codingPlatforms: [],
        cgpaDistribution: [],
        topPerformers: [],
      },
    });
  }
};

const getCoordinatorAnalyticsCoding = async (req, res) => {
  try {
    if (!ensureCoordinatorAccess(req, res)) return;

    const breakdownRes = await query(`
      SELECT COALESCE(profile_status, 'unverified') AS status, COUNT(*)::int AS count
      FROM coding_profiles
      GROUP BY COALESCE(profile_status, 'unverified')
      ORDER BY status
    `);

    const platformsRes = await query(`
      SELECT LOWER(platform) AS platform, AVG(COALESCE(current_rating, rating, contest_rating))::numeric(10,2) AS avg_rating,
             AVG(COALESCE(problems_solved, total_problems, 0))::numeric(10,2) AS avg_problems
      FROM coding_profiles
      WHERE platform IS NOT NULL
      GROUP BY LOWER(platform)
      ORDER BY LOWER(platform)
    `);

    const performersRes = await query(`
      SELECT s.full_name, s.mssid, cp.platform, COALESCE(cp.current_rating, cp.rating, cp.contest_rating) AS rating,
             COALESCE(cp.coding_score, cp.estimated_score) AS coding_score, cp.global_rank
      FROM coding_profiles cp
      LEFT JOIN students s ON s.id = cp.student_id
      WHERE cp.student_id IS NOT NULL
      ORDER BY COALESCE(cp.coding_score, cp.estimated_score, 0) DESC
      LIMIT 8
    `);

    res.json({
      success: true,
      analytics: {
        verificationBreakdown: {
          verified: 0,
          verified_url_only: 0,
          estimated: 0,
          unverified: 0,
        },
        avgSmartScore: 0,
        bestSmartScore: 0,
        platforms: (platformsRes.rows || []).map((row) => ({ platform: row.platform, avg_rating: Number(row.avg_rating || 0), avg_problems: Number(row.avg_problems || 0) })),
        topPerformers: (performersRes.rows || []).map((row) => ({ full_name: row.full_name, mssid: row.mssid, platform: row.platform, rating: row.rating, coding_score: row.coding_score, global_rank: row.global_rank })),
        activityStatusBreakdown: Object.fromEntries((breakdownRes.rows || []).map((row) => [row.status, Number(row.count || 0)])),
      },
    });
  } catch (error) {
    console.error('Coordinator analytics coding error:', error);
    return res.json({
      success: true,
      analytics: {
        verificationBreakdown: { verified: 0, verified_url_only: 0, estimated: 0, unverified: 0 },
        avgSmartScore: 0,
        bestSmartScore: 0,
        platforms: [],
        topPerformers: [],
        activityStatusBreakdown: {},
      },
    });
  }
};

const getCoordinatorAnalyticsVolunteering = async (req, res) => {
  try {
    if (!ensureCoordinatorAccess(req, res)) return;

    res.json({ success: true, analytics: { total: 0, byCategory: {} } });
  } catch (error) {
    console.error('Coordinator analytics volunteering error:', error);
    return res.json({ success: true, analytics: { total: 0, byCategory: {} } });
  }
};

const getCoordinatorCodingTracking = async (req, res) => {
  try {
    if (!ensureCoordinatorAccess(req, res)) return;

    const platformParam = String(req.query.platform || 'all').toLowerCase();
    const windowParam = String(req.query.window || 'overall').toLowerCase();
    const collegeParam = String(req.query.college || 'all').trim();
    const yearParam = String(req.query.year || 'all').trim();
    const searchParam = String(req.query.search || '').trim();

    const platform = ['leetcode', 'codechef', 'hackerrank', 'all'].includes(platformParam) ? platformParam : 'all';
    const window = ['today', '7d', 'overall'].includes(windowParam) ? windowParam : 'overall';
    const college = normalizeCollegeValue(collegeParam === 'all' ? '' : collegeParam);
    const year = normalizeYearValue(yearParam === 'all' ? '' : yearParam);
    const search = searchParam.toLowerCase();

        const leaderboardQuery = `
          SELECT student_id, mssid, full_name, platform, username, rating, problems_solved, coding_score, global_rank, college_name, year_value, last_snapshot
          FROM (
        SELECT
          cp.student_id,
          s.mssid,
          COALESCE(NULLIF(TRIM(pd.full_name), ''), s.mssid) AS full_name,
          LOWER(COALESCE(cp.platform, '')) AS platform,
          cp.username,
          COALESCE(cp.current_rating, cp.rating, cp.contest_rating) AS rating,
          COALESCE(cp.problems_solved, cp.total_problems, 0) AS problems_solved,
          COALESCE(cp.coding_score, cp.estimated_score, 0) AS coding_score,
          cp.global_rank,
          COALESCE(NULLIF(TRIM(s.college_name), ''), NULLIF(TRIM(ad.college_name), ''), '') AS college_name,
          COALESCE(NULLIF(TRIM(s.year), ''), NULLIF(TRIM(CAST(ad.year_of_study AS TEXT)), ''), '') AS year_value,
          COALESCE(NULLIF(TRIM(s.mss_batch), ''), '') AS batch,
          COALESCE(cp.current_streak, 0) AS current_streak,
          COALESCE(cp.updated_at, cp.created_at) AS last_snapshot,
          COUNT(*) OVER () AS total_count,
          ROW_NUMBER() OVER (
            PARTITION BY cp.student_id, LOWER(COALESCE(cp.platform, ''))
            ORDER BY COALESCE(cp.coding_score, cp.estimated_score, 0) DESC,
                     COALESCE(cp.current_rating, cp.rating, cp.contest_rating, 0) DESC,
                     COALESCE(cp.updated_at, cp.created_at, NOW()) DESC,
                     cp.id DESC
          ) AS rn
        FROM coding_profiles cp
        LEFT JOIN students s ON s.id = cp.student_id
        LEFT JOIN personal_details pd ON pd.student_id = cp.student_id
        LEFT JOIN academic_details ad ON ad.student_id = cp.student_id
        WHERE cp.student_id IS NOT NULL
          AND ($1 = 'all' OR LOWER(COALESCE(cp.platform, '')) = $1)
          AND ($2 = 'all' OR LOWER(COALESCE(NULLIF(TRIM(s.college_name), ''), NULLIF(TRIM(ad.college_name), ''), '')) = LOWER($2))
          AND ($3 = 'all' OR LOWER(COALESCE(NULLIF(TRIM(s.year), ''), NULLIF(TRIM(CAST(ad.year_of_study AS TEXT)), ''), '')) = LOWER($3))
          AND (
            $4 = ''
            OR LOWER(COALESCE(NULLIF(TRIM(pd.full_name), ''), s.mssid, '')) LIKE '%' || $4 || '%'
            OR LOWER(COALESCE(s.mssid, '')) LIKE '%' || $4 || '%'
            OR LOWER(COALESCE(cp.username, '')) LIKE '%' || $4 || '%'
          )
          AND (
            $5 = 'overall'
            OR ($5 = 'today' AND COALESCE(cp.updated_at, cp.created_at, NOW())::date = CURRENT_DATE)
            OR ($5 = '7d' AND COALESCE(cp.updated_at, cp.created_at, NOW()) >= CURRENT_DATE - INTERVAL '6 days')
          )
      ) ranked
      WHERE rn = 1
      ORDER BY
        (CASE WHEN $5 = 'overall' THEN COALESCE(coding_score, 0) END) DESC,
        (CASE WHEN $5 = 'overall' THEN COALESCE(rating, 0) END) DESC,
        (CASE WHEN $5 = 'overall' THEN COALESCE(problems_solved, 0) END) DESC,
        (CASE WHEN $5 != 'overall' THEN COALESCE(rating, 0) END) DESC,
        (CASE WHEN $5 != 'overall' THEN COALESCE(problems_solved, 0) END) DESC,
        (CASE WHEN $5 != 'overall' THEN COALESCE(username, full_name, '') END) ASC,
        full_name ASC
      LIMIT 50
    `;

    const result = await query(leaderboardQuery, [platform, college || 'all', year || 'all', search, window]);

    res.json({
      success: true,
      data: {
        platform,
        window,
        college: college || 'all',
        year: year || 'all',
        leaderboard: (result.rows || []).map((row) => ({
          studentId: row.student_id,
          mssid: row.mssid,
          fullName: row.full_name,
          platform: row.platform,
          username: row.username,
          rating: row.rating,
          problemsSolved: row.problems_solved,
          codingScore: row.coding_score,
          globalRank: row.global_rank,
          college: normalizeCollegeValue(row.college_name || ''),
          year: normalizeYearValue(row.year_value || ''),
          score: Number(row.coding_score ?? row.rating ?? 0),
        })),
      },
    });
  } catch (error) {
    console.error('Coordinator coding tracking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCoordinatorAnalyticsDashboard,
  getCoordinatorAnalyticsCoding,
  getCoordinatorAnalyticsVolunteering,
  getCoordinatorCodingTracking,
};

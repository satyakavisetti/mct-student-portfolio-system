const { query } = require('../config/database');
const { syncUserCodingProfiles } = require('../services/codingSyncService');
const { saveCodingHandle, getStudentHandles } = require('../db/codingHandles');
const { normalizePlatform, extractUsername } = require('../utils/platformUtils');

const safeNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const safeString = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
};

const safeJSON = (value) => {
  if (value === undefined || value === null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const emptyProfilePayload = (studentId) => ({
  studentId: Number(studentId),
  lastSynced: null,
  platforms: {
    leetcode: {},
    codechef: {},
    github: {},
    hackerrank: {},
  },
  contestHistory: {
    leetcode: [],
    codechef: [],
  },
});

const getProfileResponse = async (studentId) => {
  try {
    const profileResult = await query(
      `SELECT student_id, platform, username, display_name, profile_status, last_sync, last_sync_date, rating, current_rating, max_rating,
              problems_solved, easy_solved, medium_solved, hard_solved, total_solved, contest_count, contests_attended, contest_rating,
              top_percentage, country, active_days, total_active_days, current_streak, max_streak, topic_statistics, activity_calendar, recent_submissions,
              total_problems, global_rank, country_rank, reputation, stars_badges, avatar_url, profile_url, badges_analysis, achievements_analysis
       FROM coding_profiles
       WHERE student_id = $1
       ORDER BY platform ASC`,
      [studentId]
    );

    const contestResult = await query(
      `SELECT platform, contest_name, contest_date, rank, rating_before, rating_after, rating_change
       FROM contest_history
       WHERE student_id = $1
       ORDER BY contest_date DESC NULLS LAST, id DESC`,
      [studentId]
    );

    const platforms = {
      leetcode: {},
      codechef: {},
      github: {},
      hackerrank: {},
    };

    for (const row of profileResult.rows || []) {
      const platform = normalizePlatform(safeString(row.platform));
      if (!platform || !platforms[platform]) continue;

      const ratingValue = safeNumber(row.current_rating ?? row.rating ?? row.contest_rating);
      const solvedValue = safeNumber(row.problems_solved ?? row.total_problems);

      platforms[platform] = {
        platform,
        username: safeString(row.username),
        displayName: safeString(row.display_name),
        profileStatus: safeString(row.profile_status) || 'failed',
        lastSynced: row.last_sync ? new Date(row.last_sync).toISOString() : (row.last_sync_date ? new Date(row.last_sync_date).toISOString() : null),
        stats: {
          rating: ratingValue,
          maxRating: safeNumber(row.max_rating),
          problemsSolved: solvedValue,
          totalSolved: safeNumber(row.total_solved),
          easySolved: safeNumber(row.easy_solved),
          mediumSolved: safeNumber(row.medium_solved),
          hardSolved: safeNumber(row.hard_solved),
          contestCount: safeNumber(row.contest_count),
          contestsAttended: safeNumber(row.contests_attended),
          contestRating: safeNumber(row.contest_rating),
          topPercentage: safeNumber(row.top_percentage),
          country: safeString(row.country),
          activeDays: safeNumber(row.total_active_days ?? row.active_days),
          totalActiveDays: safeNumber(row.total_active_days ?? row.active_days),
          currentStreak: safeNumber(row.current_streak),
          maxStreak: safeNumber(row.max_streak),
          topicStatistics: row.topic_statistics || null,
          activityCalendar: row.activity_calendar || null,
          recentSubmissions: row.recent_submissions || [],
          globalRank: safeNumber(row.global_rank),
          countryRank: safeNumber(row.country_rank),
          reputation: safeNumber(row.reputation),
          starsBadges: safeString(row.stars_badges),
          avatarUrl: safeString(row.avatar_url),
          profileUrl: safeString(row.profile_url),
        },
        badgesAnalysis: safeJSON(row.badges_analysis),
        achievementsAnalysis: safeJSON(row.achievements_analysis),
      };
    }

    const contestHistory = {
      leetcode: [],
      codechef: [],
    };

    for (const row of contestResult.rows || []) {
      const platform = safeString(row.platform);
      if (!platform || !contestHistory[platform]) continue;
      contestHistory[platform].push({
        contestName: safeString(row.contest_name),
        contestDate: safeString(row.contest_date),
        rank: safeNumber(row.rank),
        rating: safeNumber(row.rating_after),
        ratingBefore: safeNumber(row.rating_before),
        ratingChange: safeNumber(row.rating_change),
      });
    }

    const timestamps = (profileResult.rows || [])
      .map((row) => {
        const lastSync = row.last_sync ? new Date(row.last_sync).getTime() : 0;
        const lastSyncDate = row.last_sync_date ? new Date(row.last_sync_date).getTime() : 0;
        return lastSync || lastSyncDate;
      })
      .filter(Boolean);

    return {
      studentId: Number(studentId),
      lastSynced: timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null,
      platforms,
      contestHistory,
    };
  } catch (error) {
    return emptyProfilePayload(studentId);
  }
};

const getCodingProfile = async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await getProfileResponse(studentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const saveCodingHandleController = async (req, res) => {
  try {
    const studentId = safeNumber(req.body?.studentId ?? req.body?.student_id);
    const platform = normalizePlatform(req.body?.platform);
    const rawHandle = safeString(req.body?.handle);
    const handle = safeString(rawHandle ? (extractUsername(platform, rawHandle) || rawHandle) : null);

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    if (!platform) {
      return res.status(400).json({ success: false, message: 'Supported platform is required (leetcode, codechef, github, hackerrank).' });
    }

    if (!handle) {
      return res.status(400).json({ success: false, message: 'Username is required.' });
    }

    if (platform === 'github' && /\s/.test(handle)) {
      return res.status(400).json({ success: false, message: 'GitHub username cannot contain spaces.' });
    }

    if (platform === 'hackerrank' && /^(https?:\/\/|www\.)/i.test(rawHandle || '')) {
      return res.status(400).json({ success: false, message: 'HackerRank username should be entered without a URL.' });
    }

    if (platform === 'hackerrank' && /\s/.test(handle)) {
      return res.status(400).json({ success: false, message: 'HackerRank username cannot contain spaces.' });
    }

    const saved = await saveCodingHandle({
      student_id: studentId,
      platform,
      handle,
      profile_url: null,
      is_primary: false,
      metadata: {},
    });

    res.json({ success: true, data: saved });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCodingHandles = async (req, res) => {
  try {
    const studentId = safeNumber(req.params.studentId);
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }
    const handles = await getStudentHandles(studentId);
    res.json({ success: true, data: handles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const runWithControllerTimeout = async (promise, timeoutMs = 120000) => {
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Sync request timed out')), timeoutMs);
    promise.then((result) => {
      clearTimeout(timer);
      resolve(result);
    }).catch((error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
};

const syncCodingProfile = async (req, res) => {
  try {
    req.setTimeout(120000);
    const { studentId } = req.params;
    const result = await runWithControllerTimeout(syncUserCodingProfiles(studentId), 120000);

    if (!result || result.failedPlatforms?.length) {
      return res.status(500).json({ success: false, data: result || null });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const refreshCodingProfile = async (req, res) => {
  try {
    req.setTimeout(120000);
    const { studentId } = req.params;
    const result = await runWithControllerTimeout(syncUserCodingProfiles(studentId), 120000);

    if (!result || result.failedPlatforms?.length) {
      return res.status(500).json({ success: false, data: result || null });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const platformParam = (req.params.platform || req.query.platform || '').toString().trim().toLowerCase();

    if (platformParam === 'leetcode' || platformParam === 'codechef') {
      // platform-specific leaderboard format per requirements
      const sql = `
        SELECT COALESCE(s.full_name, '') AS student_name, LOWER(cp.platform) AS platform, cp.username,
               COALESCE(cp.current_rating, cp.rating, cp.contest_rating) AS rating,
               COALESCE(cp.problems_solved, cp.total_problems, 0) AS solved_questions
        FROM coding_profiles cp
        LEFT JOIN students s ON s.id = cp.student_id
        WHERE LOWER(cp.platform) = $1
        ORDER BY COALESCE(cp.coding_score, 0) DESC NULLS LAST, COALESCE(cp.current_rating, cp.rating, cp.contest_rating, 0) DESC NULLS LAST
        LIMIT 100
      `;
      const result = await query(sql, [platformParam]);
      const rows = (result.rows || []).map((row) => {
        if (platformParam === 'leetcode') {
          return {
            student_name: row.student_name || null,
            username: row.username || null,
            rating: row.rating != null ? Number(row.rating) : null,
            solved_questions: row.solved_questions != null ? Number(row.solved_questions) : 0,
          };
        }
        // codechef
        return {
          student_name: row.student_name || null,
          username: row.username || null,
          rating: row.rating != null ? Number(row.rating) : null,
        };
      });
      return res.json({ success: true, data: rows });
    }

    // Default: full leaderboard
    const result = await query(`
      SELECT student_id, platform, username, profile_status, rating, problems_solved, contest_count, global_rank, reputation
      FROM coding_profiles
      ORDER BY student_id ASC
    `);

    const rows = (result.rows || []).map((row) => {
      const rating = safeNumber(row.rating);
      const problemsSolved = safeNumber(row.problems_solved);
      const contestCount = safeNumber(row.contest_count);
      const reputation = safeNumber(row.reputation);
      const globalRank = safeNumber(row.global_rank);
      const score = (rating || 0) * 2 + (problemsSolved || 0) * 3 + (contestCount || 0) * 10 + (reputation || 0) / 10 + (globalRank ? Math.max(0, 1000 - globalRank) / 100 : 0);
      return {
        studentId: Number(row.student_id),
        platform: safeString(row.platform),
        username: safeString(row.username),
        profileStatus: safeString(row.profile_status) || 'failed',
        score,
      };
    });

    rows.sort((a, b) => b.score - a.score);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getLeaderboard error:', error);
    res.json({ success: true, data: [] });
  }
};

module.exports = {
  getCodingProfile,
  saveCodingHandleController,
  getCodingHandles,
  syncCodingProfile,
  refreshCodingProfile,
  getLeaderboard,
};

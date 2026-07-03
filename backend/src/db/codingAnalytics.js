const db = require('./index');
const { normalizePlatform } = require('../utils/platformUtils');

const getCodingProfilesForStudent = async (studentId) => {
  if (!studentId) return [];
  return db.all(
    `SELECT id, student_id, platform, username, profile_status, rating, current_rating,
            max_rating, problems_solved, easy_solved, medium_solved, hard_solved, total_problems, total_solved, contest_count, contest_rating,
            global_rank, country_rank, reputation, stars_badges, coding_score,
            last_activity_date, last_sync_date, last_sync, data_verification_status,
            estimated_skill_level, estimated_progress_score, badges_analysis, achievements_analysis,
            activity_calendar, recent_submissions, total_active_days, active_days, current_streak, max_streak, topic_statistics,
            created_at, updated_at
     FROM coding_profiles
     WHERE student_id = $1
     ORDER BY platform ASC`,
    [studentId]
  );
};

const getContestHistoryForStudent = async (studentId, platform = null) => {
  if (!studentId) return [];
  const normalizedPlatform = platform ? normalizePlatform(platform) : null;
  if (platform && !normalizedPlatform) return [];
  const params = [studentId];
  const filter = normalizedPlatform ? 'AND platform = $2' : '';

  return db.all(
    `SELECT id, student_id, platform, contest_id, contest_name, contest_url, contest_date,
            rank, rating_before, rating_after, rating_change, details, created_at, updated_at
     FROM contest_history
     WHERE student_id = $1 ${filter}
     ORDER BY contest_date DESC NULLS LAST, id DESC`,
    params
  );
};

const getCodingStatisticsForStudent = async (studentId) => {
  if (!studentId) return [];
  return db.all(
    `SELECT id, coding_profile_id, student_id, platform, rating, max_rating, problems_solved,
            contest_count, global_rank, country_rank, reputation, stars_badges, recorded_date, created_at
     FROM coding_statistics
     WHERE student_id = $1
     ORDER BY recorded_date DESC, id DESC`,
    [studentId]
  );
};

const getCodingProfileHistoryForStudent = async (studentId) => {
  if (!studentId) return [];
  return db.all(
    `SELECT id, coding_profile_id, student_id, platform, rating, max_rating, problems_solved,
            global_rank, country_rank, stars_badges, recorded_date, created_at
     FROM coding_profile_history
     WHERE student_id = $1
     ORDER BY recorded_date DESC, id DESC`,
    [studentId]
  );
};

const getLeaderboard = async (platform = null) => {
  const normalizedPlatform = platform ? normalizePlatform(platform) : null;
  if (platform && !normalizedPlatform) return [];
  const params = [];
  const platformFilter = normalizedPlatform ? 'WHERE platform = $1' : '';
  if (normalizedPlatform) params.push(normalizedPlatform);

  return db.all(
    `SELECT student_id, platform, username, profile_status, rating, current_rating, max_rating,
            problems_solved, contest_count, global_rank, country_rank, reputation, stars_badges,
            coding_score, last_sync_date, last_sync
     FROM coding_profiles
     ${platformFilter}
     ORDER BY COALESCE(current_rating, rating, max_rating) DESC NULLS LAST,
              problems_solved DESC NULLS LAST,
              contest_count DESC NULLS LAST`,
    params
  );
};

module.exports = {
  getCodingProfilesForStudent,
  getContestHistoryForStudent,
  getCodingStatisticsForStudent,
  getCodingProfileHistoryForStudent,
  getLeaderboard,
};

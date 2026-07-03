// Silence logging before modules load
console.log = () => {};
console.info = () => {};
console.warn = () => {};
console.error = () => {};

const path = require('path');
const { syncUserCodingProfiles } = require(path.join(__dirname, 'src', 'services', 'codingSyncService'));
const { query } = require(path.join(__dirname, 'src', 'config', 'database'));

(async () => {
  try {
    await syncUserCodingProfiles(1);

    const result = await query(
      `SELECT student_id, platform, username, display_name, profile_status, last_sync, last_sync_date, rating, current_rating, max_rating,
              problems_solved, easy_solved, medium_solved, hard_solved, total_solved, contest_count, contests_attended, contest_rating,
              top_percentage, country, active_days, total_active_days, current_streak, max_streak, topic_statistics, activity_calendar, recent_submissions,
              total_problems, global_rank, country_rank, reputation, stars_badges, avatar_url, profile_url
       FROM coding_profiles
       WHERE student_id = $1 AND platform = 'leetcode'
       LIMIT 1`,
      [1]
    );

    const row = result.rows?.[0] || null;
    process.stdout.write(JSON.stringify({ row }, null, 2));
  } catch (err) {
    process.stderr.write(String(err));
    process.exit(1);
  }
})();

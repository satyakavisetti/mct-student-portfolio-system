const path = require('path');
const { query } = require(path.join(__dirname, 'src', 'config', 'database'));
(async () => {
  try {
    const res = await query(
      `SELECT student_id, platform, active_days, total_active_days, current_streak, max_streak, last_sync, last_sync_date, updated_at, data_verification_status FROM coding_profiles WHERE student_id = $1 AND platform = 'leetcode'`,
      [1]
    );
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
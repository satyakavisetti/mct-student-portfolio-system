const path = require('path');
const db = require(path.join(__dirname, 'src', 'db', 'index'));

(async () => {
  try {
    const handles = await db.all('SELECT * FROM coding_handles WHERE student_id = 1');
    const profiles = await db.all("SELECT student_id, platform, total_active_days, current_streak, max_streak, topic_statistics FROM coding_profiles WHERE student_id = 1 AND platform = 'leetcode'");
    console.log(JSON.stringify({ handles, profiles }, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

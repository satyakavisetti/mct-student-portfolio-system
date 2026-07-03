const path = require('path');
const { syncUserCodingProfiles } = require(path.join(__dirname, 'src', 'services', 'codingSyncService'));
const { getProfileResponse } = require(path.join(__dirname, 'src', 'controllers', 'codingController'));

(async () => {
  try {
    await syncUserCodingProfiles(1);
    const profileResponse = await getProfileResponse(1);
    const stats = profileResponse?.platforms?.leetcode?.stats || {};
    console.log(JSON.stringify({
      totalActiveDays: stats.totalActiveDays,
      currentStreak: stats.currentStreak,
      maxStreak: stats.maxStreak,
      topicStatistics: stats.topicStatistics,
    }, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

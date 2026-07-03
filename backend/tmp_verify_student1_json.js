// Silence logging before requiring modules
console.log = () => {};
console.info = () => {};
console.warn = () => {};
console.error = () => {};

const path = require('path');
const { syncUserCodingProfiles } = require(path.join(__dirname, 'src', 'services', 'codingSyncService'));
const { getProfileResponse } = require(path.join(__dirname, 'src', 'controllers', 'codingController'));

(async () => {
  try {
    const syncResult = await syncUserCodingProfiles(1);
    const profileResponse = await getProfileResponse(1);
    const stats = profileResponse?.platforms?.leetcode?.stats || {};

    const output = {
      syncResult,
      leetcodeStats: {
        totalActiveDays: stats.totalActiveDays,
        currentStreak: stats.currentStreak,
        maxStreak: stats.maxStreak,
        topicStatistics: stats.topicStatistics,
      },
    };

    process.stdout.write(JSON.stringify(output, null, 2));
  } catch (err) {
    process.stderr.write(String(err));
    process.exit(1);
  }
})();

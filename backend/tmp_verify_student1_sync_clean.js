const path = require('path');
const { syncUserCodingProfiles } = require(path.join(__dirname, 'src', 'services', 'codingSyncService'));
const { getProfileResponse } = require(path.join(__dirname, 'src', 'controllers', 'codingController'));

// Silence noisy logs from services during verification.
const noop = () => {};
console.log = noop;
console.info = noop;
console.warn = noop;
console.debug = noop;

(async () => {
  try {
    const syncResult = await syncUserCodingProfiles(1);
    const profileResponse = await getProfileResponse(1);

    const leetcodeStats = profileResponse?.platforms?.leetcode?.stats || {};
    const output = {
      syncResult,
      leetcodeStats: {
        totalActiveDays: leetcodeStats.totalActiveDays,
        currentStreak: leetcodeStats.currentStreak,
        maxStreak: leetcodeStats.maxStreak,
        topicStatistics: leetcodeStats.topicStatistics,
      },
    };
    process.stdout.write(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

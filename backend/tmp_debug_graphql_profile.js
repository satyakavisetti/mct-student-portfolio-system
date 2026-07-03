const path = require('path');
const { fetchLeetCodeProfile } = require(path.join(__dirname, 'src', 'services', 'leetcodeGraphql.service'));

(async () => {
  try {
    const profile = await fetchLeetCodeProfile('SatyaKavisetti');
    console.log(JSON.stringify({
      activeDays: profile.profile?.activeDays,
      totalSolved: profile.solved?.total,
      currentStreak: profile.profile?.currentStreak,
      maxStreak: profile.profile?.maxStreak,
      topicStatistics: profile.topicStatistics,
      rawKeys: Object.keys(profile).sort(),
    }, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
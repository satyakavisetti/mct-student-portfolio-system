const path = require('path');
const { fetchProfile } = require(path.join(__dirname, 'src', 'services', 'leetcodeService'));

(async () => {
  try {
    const profile = await fetchProfile('SatyaKavisetti');
    console.log(JSON.stringify({
      currentStreak: profile.currentStreak,
      maxStreak: profile.maxStreak,
      activeDays: profile.activeDays,
      topicStatistics: profile.topicStatistics,
      profileStatus: profile.profileStatus,
      rating: profile.rating,
      rank: profile.rank,
      totalSolved: profile.totalSolved,
      rawKeys: Object.keys(profile).sort(),
      profileSample: {
        profile: profile.profile || null,
      }
    }, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
const path = require('path');
const { fetchProfile } = require(path.join(__dirname, 'src', 'services', 'leetcodeService'));

(async () => {
  try {
    const profile = await fetchProfile('SatyaKavisetti');
    const out = {
      currentStreak: profile.currentStreak,
      maxStreak: profile.maxStreak,
      activeDays: profile.activeDays,
      totalSolved: profile.totalSolved,
      _graphql: {
        currentStreak: profile._graphql?.profile?.currentStreak,
        maxStreak: profile._graphql?.profile?.maxStreak,
        activeDays: profile._graphql?.profile?.activeDays,
        topicStatistics: profile._graphql?.topicStatistics,
      },
      _playwright: {
        currentStreak: profile._playwright?.currentStreak,
        maxStreak: profile._playwright?.maxStreak,
        activeDays: profile._playwright?.totalActiveDays ?? profile._playwright?.activeDays,
        topicStatistics: profile._playwright?.topicStatistics,
      },
    };
    console.log(JSON.stringify(out, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
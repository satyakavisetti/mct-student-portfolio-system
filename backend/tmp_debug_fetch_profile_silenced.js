console.log = () => {};
console.info = () => {};
console.warn = () => {};
console.error = () => {};
const path = require('path');
const { fetchProfile } = require(path.join(__dirname, 'src', 'services', 'leetcodeService'));

(async () => {
  try {
    const profile = await fetchProfile('SatyaKavisetti');
    console.log(JSON.stringify({
      maxStreak: profile.maxStreak,
      currentStreak: profile.currentStreak,
      activeDays: profile.activeDays,
      totalActiveDays: profile.totalActiveDays,
      topicStatistics: profile.topicStatistics,
      _graphql: {
        currentStreak: profile._graphql?.profile?.currentStreak,
        maxStreak: profile._graphql?.profile?.maxStreak,
        activeDays: profile._graphql?.profile?.activeDays,
        topicStatistics: profile._graphql?.topicStatistics,
      },
      _playwright: {
        currentStreak: profile._playwright?.currentStreak,
        maxStreak: profile._playwright?.maxStreak,
        totalActiveDays: profile._playwright?.totalActiveDays,
        topicStatistics: profile._playwright?.topicStatistics,
      }
    }, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
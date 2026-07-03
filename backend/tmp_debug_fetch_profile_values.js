const path = require('path');
const { fetchProfile } = require(path.join(__dirname, 'src', 'services', 'leetcodeService'));

(async () => {
  try {
    const profile = await fetchProfile('SatyaKavisetti');
    const output = {
      currentStreak: profile.currentStreak,
      maxStreak: profile.maxStreak,
      activeDays: profile.activeDays,
      totalActiveDays: profile.totalActiveDays,
      topicStatistics: profile.topicStatistics,
      _graphqlCurrentStreak: profile._graphql?.profile?.currentStreak,
      _graphqlMaxStreak: profile._graphql?.profile?.maxStreak,
      _graphqlActiveDays: profile._graphql?.profile?.activeDays,
      _playwrightCurrentStreak: profile._playwright?.currentStreak,
      _playwrightMaxStreak: profile._playwright?.maxStreak,
      _playwrightTotalActiveDays: profile._playwright?.totalActiveDays,
    };
    process.stdout.write(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
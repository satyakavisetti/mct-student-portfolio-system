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
      hasCurrentStreak: profile.hasOwnProperty('currentStreak'),
      hasMaxStreak: profile.hasOwnProperty('maxStreak'),
      hasActiveDays: profile.hasOwnProperty('activeDays'),
      profileKeys: Object.keys(profile).sort(),
      _graphqlCurrentStreak: profile._graphql?.profile?.currentStreak,
      _graphqlMaxStreak: profile._graphql?.profile?.maxStreak,
      _graphqlActiveDays: profile._graphql?.profile?.activeDays,
      _playwrightCurrentStreak: profile._playwright?.currentStreak,
      _playwrightMaxStreak: profile._playwright?.maxStreak,
      _playwrightTotalActiveDays: profile._playwright?.totalActiveDays,
    }, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
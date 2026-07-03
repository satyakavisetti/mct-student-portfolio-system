global.console = {
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};
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
      _graphql: profile._graphql ? {
        currentStreak: profile._graphql.profile?.currentStreak,
        maxStreak: profile._graphql.profile?.maxStreak,
        activeDays: profile._graphql.profile?.activeDays,
        topicStatistics: profile._graphql.topicStatistics,
      } : null,
      _playwright: profile._playwright ? {
        currentStreak: profile._playwright.currentStreak,
        maxStreak: profile._playwright.maxStreak,
        totalActiveDays: profile._playwright.totalActiveDays,
        topicStatistics: profile._playwright.topicStatistics,
      } : null,
      keys: Object.keys(profile).sort(),
    };
    process.stdout.write(JSON.stringify(output, null, 2));
  } catch (err) {
    process.stderr.write(String(err));
    process.exit(1);
  }
})();
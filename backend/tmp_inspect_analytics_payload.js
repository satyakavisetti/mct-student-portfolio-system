const path = require('path');
const analyticsService = require(path.join(__dirname, 'src', 'services', 'analyticsService'));

(async () => {
  try {
    const analytics = await analyticsService.getPlatformAnalytics(1, 'leetcode');
    console.log(JSON.stringify(analytics, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

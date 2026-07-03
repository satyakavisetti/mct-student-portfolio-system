const path = require('path');
const { syncUserCodingProfiles } = require(path.join(__dirname, 'src', 'services', 'codingSyncService'));
const { getProfileResponse } = require(path.join(__dirname, 'src', 'controllers', 'codingController'));

(async () => {
  try {
    const syncResult = await syncUserCodingProfiles(1);
    const profileResponse = await getProfileResponse(1);
    console.log('SYNC_RESULT:', JSON.stringify(syncResult, null, 2));
    console.log('LEETCODE_STATS:', JSON.stringify(profileResponse.platforms.leetcode.stats, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

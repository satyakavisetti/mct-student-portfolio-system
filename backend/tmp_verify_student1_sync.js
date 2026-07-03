const path = require('path');
const { syncUserCodingProfiles } = require(path.join(__dirname, 'src', 'services', 'codingSyncService'));
const { getProfileResponse } = require(path.join(__dirname, 'src', 'controllers', 'codingController'));

(async () => {
  try {
    console.log('=== Running syncUserCodingProfiles(1) ===');
    const syncResult = await syncUserCodingProfiles(1);
    console.log(JSON.stringify({ syncResult }, null, 2));

    console.log('\n=== Fetching profile response for student 1 ===');
    const profileResponse = await getProfileResponse(1);
    console.log(JSON.stringify({ profileResponse: { studentId: profileResponse.studentId, platforms: { leetcode: profileResponse.platforms.leetcode } } }, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
})();

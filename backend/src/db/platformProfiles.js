const db = require('./index');
const { normalizePlatform } = require('../utils/platformUtils');

const getPlatformProfile = async ({ student_id, platform, username = null }) => {
  const normalizedPlatform = normalizePlatform(platform);
  if (!student_id || !normalizedPlatform) return null;
  if (username) {
    const row = await db.one(
      'SELECT * FROM platform_profiles WHERE student_id = $1 AND platform = $2 AND username = $3 LIMIT 1',
      [student_id, normalizedPlatform, username]
    );
    return row;
  }
  const row = await db.one(
    'SELECT * FROM platform_profiles WHERE student_id = $1 AND platform = $2 ORDER BY last_fetched_at DESC NULLS LAST LIMIT 1',
    [student_id, normalizedPlatform]
  );
  return row;
};

const savePlatformProfile = async ({ student_id, coding_handle_id = null, platform, username = null, profile_url = null, raw_data = {}, stats = {}, tags = [] , last_fetched_at = null }) => {
  const normalizedPlatform = normalizePlatform(platform);
  if (!student_id || !normalizedPlatform || !username) return null;
  const text = `INSERT INTO platform_profiles (student_id, coding_handle_id, platform, username, profile_url, raw_data, stats, tags, last_fetched_at, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
    ON CONFLICT (student_id, platform, username) DO UPDATE SET coding_handle_id = COALESCE(EXCLUDED.coding_handle_id, platform_profiles.coding_handle_id), profile_url = EXCLUDED.profile_url, raw_data = EXCLUDED.raw_data, stats = EXCLUDED.stats, tags = EXCLUDED.tags, last_fetched_at = EXCLUDED.last_fetched_at, updated_at = NOW()
    RETURNING *`;
  const params = [student_id, coding_handle_id, normalizedPlatform, username, profile_url, raw_data, stats, tags.length ? tags : null, last_fetched_at];
  const row = await db.one(text, params);
  return row;
};

module.exports = {
  getPlatformProfile,
  savePlatformProfile,
};

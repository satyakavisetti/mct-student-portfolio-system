const db = require('./index');
const { normalizePlatform } = require('../utils/platformUtils');

const saveRatingHistory = async ({ student_id, platform, rating = null, recorded_at = null, context = {} }) => {
  const normalizedPlatform = normalizePlatform(platform);
  if (!student_id || !normalizedPlatform || rating === null || rating === undefined) return null;
  const recAt = recorded_at || new Date();
  const text = `INSERT INTO rating_history (student_id, platform, rating, recorded_at, context, created_at)
    VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *`;
  const params = [student_id, normalizedPlatform, rating, recAt, context];
  const row = await db.one(text, params);
  return row;
};

module.exports = { saveRatingHistory };

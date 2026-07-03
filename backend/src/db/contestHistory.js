const db = require('./index');
const { normalizePlatform } = require('../utils/platformUtils');

const saveContestHistory = async ({ student_id, platform, contest_id, contest_name = null, contest_url = null, contest_date = null, rank = null, rating_before = null, rating_after = null, rating_change = null, details = {} }) => {
  const normalizedPlatform = normalizePlatform(platform);
  if (!student_id || !normalizedPlatform || !contest_id) return null;
  const text = `INSERT INTO contest_history (student_id, platform, contest_id, contest_name, contest_url, contest_date, rank, rating_before, rating_after, rating_change, details, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
    ON CONFLICT (student_id, platform, contest_id) DO UPDATE SET contest_name = EXCLUDED.contest_name, contest_url = EXCLUDED.contest_url, contest_date = EXCLUDED.contest_date, rank = EXCLUDED.rank, rating_before = EXCLUDED.rating_before, rating_after = EXCLUDED.rating_after, rating_change = EXCLUDED.rating_change, details = EXCLUDED.details, updated_at = NOW()
    RETURNING *`;
  const params = [student_id, normalizedPlatform, contest_id, contest_name, contest_url, contest_date, rank, rating_before, rating_after, rating_change, details];
  const row = await db.one(text, params);
  return row;
};

module.exports = { saveContestHistory };

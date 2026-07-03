const db = require('./index');
const { normalizePlatform } = require('../utils/platformUtils');

const saveProblemHistory = async ({ student_id, platform, problem_id, problem_name = null, difficulty = null, solved_at = null, attempt_data = {}, source = null, details = {} }) => {
  const normalizedPlatform = normalizePlatform(platform);
  if (!student_id || !normalizedPlatform || !problem_id) return null;
  const text = `INSERT INTO problem_history (student_id, platform, problem_id, problem_name, difficulty, solved_at, attempt_data, source, details, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
    ON CONFLICT (student_id, platform, problem_id) DO UPDATE SET problem_name = EXCLUDED.problem_name, difficulty = EXCLUDED.difficulty, solved_at = EXCLUDED.solved_at, attempt_data = EXCLUDED.attempt_data, source = EXCLUDED.source, details = EXCLUDED.details, updated_at = NOW()
    RETURNING *`;
  const params = [student_id, normalizedPlatform, problem_id, problem_name, difficulty, solved_at, attempt_data, source, details];
  const row = await db.one(text, params);
  return row;
};

module.exports = { saveProblemHistory };

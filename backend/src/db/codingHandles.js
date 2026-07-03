const db = require('./index');
const { normalizePlatform } = require('../utils/platformUtils');

const allowedUpdateFields = ['handle', 'profile_url', 'is_primary', 'metadata', 'updated_at'];

const getStudentHandles = async (studentId) => {
  if (!studentId) return [];
  const rows = await db.all('SELECT * FROM coding_handles WHERE student_id = $1 ORDER BY is_primary DESC, id ASC', [studentId]);
  return rows;
};

const saveCodingHandle = async ({ student_id, platform, handle, profile_url = null, is_primary = false, metadata = {} }) => {
  const normalizedPlatform = normalizePlatform(platform);
  if (!student_id || !normalizedPlatform || !handle) return null;

  const text = `INSERT INTO coding_handles (student_id, platform, handle, profile_url, is_primary, metadata, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
    ON CONFLICT (student_id, platform) DO UPDATE SET handle = EXCLUDED.handle, profile_url = EXCLUDED.profile_url, is_primary = EXCLUDED.is_primary, metadata = EXCLUDED.metadata, updated_at = NOW()
    RETURNING *`;
  const params = [student_id, normalizedPlatform, handle, profile_url, is_primary, metadata];
  const row = await db.one(text, params);
  return row;
};

const updateCodingHandle = async (id, updates = {}) => {
  if (!id) return null;
  const setClauses = [];
  const values = [];
  let idx = 1;
  for (const key of Object.keys(updates)) {
    if (!allowedUpdateFields.includes(key)) continue;
    setClauses.push(`${key} = $${idx}`);
    values.push(updates[key]);
    idx += 1;
  }
  if (setClauses.length === 0) return await db.one('SELECT * FROM coding_handles WHERE id = $1', [id]);
  const text = `UPDATE coding_handles SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
  values.push(id);
  const row = await db.one(text, values);
  return row;
};

module.exports = {
  getStudentHandles,
  saveCodingHandle,
  updateCodingHandle,
};

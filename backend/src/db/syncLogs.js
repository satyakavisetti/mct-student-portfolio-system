const db = require('./index');

const createSyncLog = async ({ student_id = null, platform = null, operation = 'sync', status = 'started', message = null, response = {} }) => {
  const text = `INSERT INTO sync_logs (student_id, platform, operation, status, message, response, started_at, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW()) RETURNING *`;
  const params = [student_id, platform, operation, status, message, response];
  const row = await db.one(text, params);
  return row;
};

const finishSyncLog = async (id, { status = 'success', message = null, response = {} } = {}) => {
  if (!id) return null;
  const text = `UPDATE sync_logs SET status = $1, message = $2, response = $3, finished_at = NOW() WHERE id = $4 RETURNING *`;
  const params = [status, message, response, id];
  const row = await db.one(text, params);
  return row;
};

module.exports = { createSyncLog, finishSyncLog };

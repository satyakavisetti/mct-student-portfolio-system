const { query } = require('../config/database');

const all = async (text, params = []) => {
  const res = await query(text, params);
  return res.rows || [];
};

const one = async (text, params = []) => {
  const res = await query(text, params);
  return res.rows[0] || null;
};

const run = async (text, params = []) => {
  const res = await query(text, params);
  return res;
};

module.exports = { query, all, one, run };

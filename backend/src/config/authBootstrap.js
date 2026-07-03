const bcrypt = require('bcryptjs');
const { query } = require('./database');

const DEFAULT_USERS = [
  { mssid: 'MSS0000000', role: 'coordinator', password: 'password' },
  { mssid: 'MSS2022096', role: 'student', password: 'password' },
];

const isBcryptHash = (value) => typeof value === 'string' && /\$2[aby]?\$/i.test(value);

const comparePassword = async (candidate, stored) => {
  if (!candidate || !stored) return false;
  if (isBcryptHash(stored)) {
    return bcrypt.compare(candidate, stored);
  }
  return candidate === stored;
};

const ensureDefaultUsers = async () => {
  for (const user of DEFAULT_USERS) {
    try {
      const existing = await query('SELECT id, password FROM students WHERE mssid = $1', [user.mssid]);

      if (existing.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await query(
          'INSERT INTO students (mssid, password, role, is_active) VALUES ($1, $2, $3, TRUE)',
          [user.mssid, hashedPassword, user.role]
        );
        console.log(`[Auth Bootstrap] Created default ${user.role} account ${user.mssid}`);
        continue;
      }

      const storedPassword = existing.rows[0].password;
      const matchesDefaultPassword = await comparePassword(user.password, storedPassword);

      if (!matchesDefaultPassword) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await query('UPDATE students SET password = $1, role = $2, is_active = TRUE WHERE mssid = $3', [
          hashedPassword,
          user.role,
          user.mssid,
        ]);
        console.log(`[Auth Bootstrap] Reset default password for ${user.mssid}`);
      }
    } catch (error) {
      console.error(`[Auth Bootstrap] Failed for ${user.mssid}:`, error.message);
    }
  }
};

module.exports = { ensureDefaultUsers, comparePassword };

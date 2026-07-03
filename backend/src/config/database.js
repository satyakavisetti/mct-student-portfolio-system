const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on("connect", () => {
  console.log("✅ Connected to Neon PostgreSQL");
});

pool.on("error", (err) => {
  console.error("❌ Database Error:", err.message);
});

const query = async (text, params = []) => {
  const normalizedParams = params.map((p) =>
    p === undefined ? null : p
  );

  try {
    return await pool.query(text, normalizedParams);
  } catch (err) {
    console.error("Database query error:", err.message);
    throw err;
  }
};

module.exports = {
  pool,
  query,
};
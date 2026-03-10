const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function addPasswordColumn() {
  try {
    console.log('Adding password column to users table...');
    const result = await pool.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);"
    );
    console.log('✅ Password column added successfully!');
    await pool.end();
  } catch (err) {
    console.error('❌ Error adding password column:', err.message);
    await pool.end();
    process.exit(1);
  }
}

addPasswordColumn();

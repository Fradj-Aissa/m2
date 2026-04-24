/**
 * Migration runner.
 * - Executes JS migration files in database/migrations in lexical (numeric) order.
 * - Tracks applied files in schema_migrations.
 * - Each migration file must export async function up(client).
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { loadEnvironment } = require('../config/runtime');

loadEnvironment();

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    };

const pool = new Pool(poolConfig);

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.js'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function isApplied(client, filename) {
  const res = await client.query(
    'SELECT 1 FROM schema_migrations WHERE filename = $1 LIMIT 1',
    [filename]
  );
  return res.rowCount > 0;
}

async function recordApplied(client, filename) {
  await client.query(
    'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
    [filename]
  );
}

async function runMigration(client, filename) {
  const migrationPath = path.join(MIGRATIONS_DIR, filename);
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const migration = require(migrationPath);
  if (!migration || typeof migration.up !== 'function') {
    throw new Error(
      `Migration file ${filename} must export an async function named up(client)`
    );
  }

  console.log(`[migrations] Running ${filename}...`);
  await client.query('BEGIN');
  try {
    await migration.up(client);
    await recordApplied(client, filename);
    await client.query('COMMIT');
    console.log(`[migrations] ${filename} applied`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const files = listMigrationFiles();
    if (files.length === 0) {
      console.log('[migrations] No migration files found');
      return;
    }

    for (const file of files) {
      const applied = await isApplied(client, file);
      if (applied) {
        console.log(`[migrations] Skipping ${file} (already applied)`);
        continue;
      }
      await runMigration(client, file);
    }

    console.log('[migrations] All migrations completed');
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = { runMigrations };

// Allow running directly
if (require.main === module) {
  runMigrations().catch((err) => {
    console.error('[migrations] Failed:', err);
    process.exit(1);
  });
}

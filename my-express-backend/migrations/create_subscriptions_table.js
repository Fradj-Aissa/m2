const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

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

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await client.query(`
      DO $$
      BEGIN
        CREATE TYPE subscription_status AS ENUM ('pending','active','expired','rejected');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        plan_name VARCHAR(20) NOT NULL CHECK (plan_name IN ('Free','Basic','Pro')),
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        receipt_image TEXT,
        status subscription_status NOT NULL DEFAULT 'pending',
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS current_plan VARCHAR(20) NOT NULL DEFAULT 'Free',
        ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id);
    `);

    await client.query('COMMIT');
    console.log('Subscriptions table migration completed.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Subscriptions migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();

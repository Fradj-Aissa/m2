const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    };

const pool = new Pool(poolConfig);

async function runMigration() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await client.query(`
      DO $$
      BEGIN
        CREATE TYPE notification_type AS ENUM ('rating', 'contact', 'approval', 'system');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        sender_id VARCHAR(255) REFERENCES users(uid) ON DELETE SET NULL,
        type notification_type NOT NULL,
        apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        link TEXT,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'user_id'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'recipient_id'
        ) THEN
          ALTER TABLE notifications RENAME COLUMN user_id TO recipient_id;
        END IF;
      END $$;
    `);

    await client.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_id VARCHAR(255)
    `);

    await client.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id VARCHAR(255)
    `);

    await client.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS apartment_id UUID
    `);

    await client.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT
    `);

    await client.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT
    `);

    await client.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE
    `);

    await client.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    await client.query(`
      UPDATE notifications
      SET is_read = FALSE
      WHERE is_read IS NULL
    `);

    await client.query(`
      UPDATE notifications
      SET created_at = CURRENT_TIMESTAMP
      WHERE created_at IS NULL
    `);

    await client.query(`
      ALTER TABLE reviews
      ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_parent_id ON reviews(parent_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)
    `);

    await client.query('COMMIT');
    console.log('Notifications and replies migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Notifications and replies migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

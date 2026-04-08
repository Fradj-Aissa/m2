module.exports.up = async (client) => {
  // Ensure pgcrypto is available for UUID generation
  await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // Enum for subscription status
  await client.query(`
    DO $$
    BEGIN
      CREATE TYPE subscription_status AS ENUM ('pending','active','expired','rejected');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  // Subscriptions table
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

  // Users table additions
  await client.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS current_plan VARCHAR(20) NOT NULL DEFAULT 'Free',
      ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id);
  `);
};

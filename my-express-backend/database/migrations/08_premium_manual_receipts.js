module.exports.up = async (client) => {
  await client.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS premium_until TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS id_card_path TEXT NULL;
  `);

  await client.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='users' AND column_name='verification_status'
      ) THEN
        ALTER TABLE users
        DROP CONSTRAINT IF EXISTS users_verification_status_check;

        ALTER TABLE users
        ADD CONSTRAINT users_verification_status_check
        CHECK (verification_status IN ('none', 'pending', 'verified', 'rejected'));
      END IF;
    END $$;
  `);

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'manual_subscription_status') THEN
        CREATE TYPE manual_subscription_status AS ENUM ('pending', 'approved', 'rejected');
      END IF;
    END $$;
  `);

  await client.query(`
    ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS receipt_path TEXT,
      ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);
  `);

  await client.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='subscriptions' AND column_name='status'
      ) THEN
        ALTER TABLE subscriptions
        ALTER COLUMN status TYPE manual_subscription_status
        USING (
          CASE
            WHEN status::text = 'active' THEN 'approved'::manual_subscription_status
            ELSE status::text::manual_subscription_status
          END
        );
      END IF;
    EXCEPTION
      WHEN invalid_text_representation THEN NULL;
    END $$;
  `);

  await client.query(`
    ALTER TABLE subscriptions
      ALTER COLUMN status SET DEFAULT 'pending';
  `);
};

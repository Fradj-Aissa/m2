module.exports.up = async (client) => {
  await client.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS id_card_path TEXT,
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
  `);

  await client.query(`
    ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_verification_status_check;
  `);

  await client.query(`
    UPDATE users
    SET verification_status = 'unverified'
    WHERE verification_status IS NULL OR verification_status = 'none';
  `);

  await client.query(`
    ALTER TABLE users
      ALTER COLUMN verification_status SET DEFAULT 'unverified';
  `);

  await client.query(`
    ALTER TABLE users
      ADD CONSTRAINT users_verification_status_check
      CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
  `);
};

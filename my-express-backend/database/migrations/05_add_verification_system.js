module.exports.up = async (client) => {
  // Create verification_status ENUM type
  await client.query(`
    DO $$
    BEGIN
      CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  // Add verification columns to apartments table
  await client.query(`
    ALTER TABLE apartments
      ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS verification_docs JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS verification_feedback TEXT;
  `);

  // Create an index on verification_status for faster queries
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_apartments_verification_status 
    ON apartments(verification_status);
  `);
};

module.exports.down = async (client) => {
  // Drop the index
  await client.query(`
    DROP INDEX IF EXISTS idx_apartments_verification_status;
  `);

  // Remove verification columns from apartments table
  await client.query(`
    ALTER TABLE apartments
      DROP COLUMN IF EXISTS verification_feedback,
      DROP COLUMN IF EXISTS verification_docs,
      DROP COLUMN IF EXISTS verification_status;
  `);

  // Drop the ENUM type
  await client.query(`
    DROP TYPE IF EXISTS verification_status CASCADE;
  `);
};

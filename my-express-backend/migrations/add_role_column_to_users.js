/**
 * Migration: Add role column to users table
 * This migration adds support for admin role assignment
 * Role values: NULL (regular user) or 'admin'
 */

async function up(client) {
  // Add role column if it doesn't exist
  await client.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT NULL CHECK (role IN ('admin', NULL))
  `);

  console.log('✅ Added role column to users table');
}

async function down(client) {
  // Remove role column if rolling back
  await client.query(`
    ALTER TABLE users
    DROP COLUMN IF EXISTS role
  `);

  console.log('⬅️ Removed role column from users table');
}

module.exports = { up, down };

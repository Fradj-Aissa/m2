'use strict';

/** @param {import('pg').PoolClient} client */
async function up(client) {
  await client.query(`
    ALTER TABLE apartments
      ADD COLUMN IF NOT EXISTS property_type VARCHAR(20)
      CHECK (property_type IN ('Apartment', 'House', 'Studio'));
  `);

  console.log('[migration 07] property_type column added to apartments table.');
}

module.exports = { up };

/**
 * Migration 06: Add geographic coordinates to apartments table.
 *
 * Adds two nullable DECIMAL columns:
 *   - lat  DECIMAL(10, 8)  → latitude  (e.g. 36.75250000)
 *   - lng  DECIMAL(11, 8)  → longitude (e.g.  3.04197000)
 *
 * Using DECIMAL avoids floating-point precision loss and handles
 * negative longitudes (western Algeria wilayas like Tindouf).
 *
 * Both columns are optional (allowNull: true) so existing rows
 * are not affected and the map section simply hides itself when
 * coordinates are absent.
 */

'use strict';

/** @param {import('pg').PoolClient} client */
async function up(client) {
  await client.query(`
    ALTER TABLE apartments
      ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS lng DECIMAL(11, 8) DEFAULT NULL;
  `);

  console.log('[migration 06] lat & lng columns added to apartments table.');
}

module.exports = { up };

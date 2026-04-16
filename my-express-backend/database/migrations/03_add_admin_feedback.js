module.exports.up = async (client) => {
  await client.query(`
    ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS admin_feedback TEXT
  `);
};

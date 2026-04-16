module.exports.up = async (client) => {
  await client.query(`
    UPDATE users
    SET current_plan = LOWER(current_plan)
    WHERE current_plan IS NOT NULL
  `);

  await client.query(`
    UPDATE users
    SET current_plan = 'free'
    WHERE current_plan IS NULL
       OR current_plan NOT IN ('free', 'basic', 'pro')
  `);

  await client.query(`
    WITH latest_active_subscription AS (
      SELECT DISTINCT ON (s.user_id)
        s.id,
        s.user_id,
        LOWER(s.plan_name) AS current_plan
      FROM subscriptions s
      WHERE s.status = 'active'
      ORDER BY s.user_id, COALESCE(s.start_date, s.created_at) DESC, s.created_at DESC
    )
    UPDATE users u
    SET subscription_id = latest_active_subscription.id,
        current_plan = latest_active_subscription.current_plan
    FROM latest_active_subscription
    WHERE u.uid = latest_active_subscription.user_id
      AND (
        u.subscription_id IS DISTINCT FROM latest_active_subscription.id
        OR u.current_plan IS DISTINCT FROM latest_active_subscription.current_plan
      )
  `);

  await client.query(`
    ALTER TABLE users
    ALTER COLUMN current_plan SET DEFAULT 'free'
  `);

  await client.query(`
    ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_current_plan_check
  `);

  await client.query(`
    ALTER TABLE users
    ADD CONSTRAINT users_current_plan_check
    CHECK (current_plan IN ('free', 'basic', 'pro'))
  `);
};

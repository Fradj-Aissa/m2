const db = require('../db');

async function autoCheckPremiumExpiry(req, _res, next) {
  try {
    const uid = req.user?.uid;
    if (!uid) return next();

    await db.query(
      `UPDATE users
       SET is_premium = FALSE,
           premium_until = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE uid = $1
         AND is_premium = TRUE
         AND premium_until IS NOT NULL
         AND NOW() > premium_until`,
      [uid]
    );
  } catch (error) {
    console.error('Premium auto-check failed:', error);
  }

  return next();
}

module.exports = autoCheckPremiumExpiry;

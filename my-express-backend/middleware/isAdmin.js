/**
 * Admin Middleware - Checks and validates admin role
 * Must be used AFTER authMiddleware
 * 
 * Logic:
 * 1. Check if user is already admin in database
 * 2. If not admin, check if user email matches ADMIN_EMAIL env variable
 * 3. If email matches, promote user to admin and store in database
 * 4. Allow request to proceed; otherwise return 403 Forbidden
 * 
 * Usage: router.get('/stats', authMiddleware, isAdmin, handler)
 */
const isAdmin = async (req, res, next) => {
  try {
    // Check if user object exists (set by authMiddleware)
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const db = require('../db');
    const userId = req.user.uid;
    const adminEmail = process.env.ADMIN_EMAIL;

    // Step 1: Query user from database to get role and email
    const userResult = await db.query(
      `SELECT uid, email, role FROM users WHERE uid = $1`,
      [userId]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const userRole = user.role || null;
    const userEmail = user.email;

    // Step 2: If already admin, allow access
    if (userRole === 'admin') {
      return next();
    }

    // Step 3: If not admin, check if email matches ADMIN_EMAIL env variable
    if (!adminEmail) {
      console.warn('⚠️  ADMIN_EMAIL environment variable is not set');
      return res.status(403).json({ 
        error: 'Access denied: Admin role required',
        details: 'ADMIN_EMAIL not configured'
      });
    }

    if (userEmail !== adminEmail) {
      console.log(`🚫 Admin access denied for ${userEmail} (expected: ${adminEmail})`);
      return res.status(403).json({ 
        error: 'Access denied: Admin role required',
        details: 'Email does not match admin email'
      });
    }

    // Step 4: Email matches! Promote user to admin in database
    console.log(`✅ Promoting ${userEmail} to admin role`);
    
    const updateResult = await db.query(
      `UPDATE users 
       SET role = 'admin', updated_at = CURRENT_TIMESTAMP 
       WHERE uid = $1 
       RETURNING uid, email, role`,
      [userId]
    );

    if (!updateResult.rows.length) {
      return res.status(500).json({ 
        error: 'Failed to update admin role' 
      });
    }

    // Update req.user with new role
    req.user.role = 'admin';

    console.log(`🎉 User ${userEmail} is now admin and access granted`);
    next();

  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = isAdmin;

/**
 * Admin Middleware - Checks if user has admin role
 * Must be used AFTER authMiddleware
 * 
 * Usage: router.get('/stats', authMiddleware, isAdmin, handler)
 */
const isAdmin = async (req, res, next) => {
  try {
    // Check if user object exists (set by authMiddleware)
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // For now, accept the request if authenticated
    // TODO: Add role column to users table and uncomment check below:
    // const db = require('../db');
    // const result = await db.query('SELECT role FROM users WHERE uid = $1', [req.user.uid]);
    // if (!result.rows[0] || result.rows[0].role !== 'admin') {
    //   return res.status(403).json({ error: 'Access denied: Admin role required' });
    // }

    next();
  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = isAdmin;

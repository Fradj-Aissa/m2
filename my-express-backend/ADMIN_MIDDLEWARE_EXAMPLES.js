/**
 * Example Usage of Admin Middleware
 * 
 * This file shows how to use the new admin middleware in your routes
 */

// ============================================
// Example 1: Protect a single route
// ============================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');

// ✅ Protected admin route
router.get('/stats', authMiddleware, isAdmin, async (req, res) => {
  try {
    // At this point, req.user is guaranteed to be an admin
    // (either they already had role='admin' or were just promoted)
    
    res.json({
      message: 'Admin stats data',
      admin_user: req.user,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// Example 2: Multiple protected routes
// ============================================

router.get('/users', authMiddleware, isAdmin, async (req, res) => {
  // List all users
  res.json({ users: [] });
});

router.patch('/users/:uid/role', authMiddleware, isAdmin, async (req, res) => {
  // Update user role
  res.json({ updated: true });
});

router.delete('/users/:uid', authMiddleware, isAdmin, async (req, res) => {
  // Delete user
  res.json({ deleted: true });
});

// ============================================
// Example 3: Nested route groups
// ============================================

// Routes starting with /api/admin are all protected
const adminRoutes = express.Router();

adminRoutes.use(authMiddleware, isAdmin); // Apply to all routes below

adminRoutes.get('/dashboard', async (req, res) => {
  res.json({ dashboard: 'data' });
});

adminRoutes.get('/analytics', async (req, res) => {
  res.json({ analytics: 'data' });
});

adminRoutes.post('/settings', async (req, res) => {
  res.json({ settings: 'updated' });
});

router.use('/admin', adminRoutes);

// ============================================
// Example 4: Error handling examples
// ============================================

/**
 * Possible responses:
 */

// 401 Unauthorized - No authentication token
// {
//   "error": "User not authenticated"
// }

// 403 Forbidden - Not an admin and email doesn't match
// {
//   "error": "Access denied: Admin role required",
//   "details": "Email does not match admin email"
// }

// 403 Forbidden - ADMIN_EMAIL not configured
// {
//   "error": "Access denied: Admin role required",
//   "details": "ADMIN_EMAIL not configured"
// }

// 404 Not Found - User not in database
// {
//   "error": "User not found"
// }

// 200 OK - Successfully accessed admin route
// {
//   "message": "Admin stats data",
//   "admin_user": { uid: "...", email: "admin@smartrent.com", role: "admin" }
// }

// ============================================
// Example 5: Using with Express Router modules
// ============================================

// file: routes/admin.js

module.exports = (router) => {
  router.get('/admin/dashboard', authMiddleware, isAdmin, (req, res) => {
    res.json({ message: 'Welcome Admin!' });
  });
};

// ============================================
// Example 6: Conditional admin logic
// ============================================

router.get('/protected-route', authMiddleware, async (req, res) => {
  const isAdminUser = req.user.role === 'admin';
  
  if (isAdminUser) {
    // Show sensitive admin data
    return res.json({ 
      restricted_data: 'Only admins see this' 
    });
  } else {
    // Show public data
    return res.json({ 
      public_data: 'Everyone sees this' 
    });
  }
});

// ============================================
// Example 7: Full route handler example
// ============================================

/**
 * GET /api/admin/stats
 * 
 * Middleware Chain:
 * authMiddleware → isAdmin → route handler
 */
router.get('/admin/stats', authMiddleware, isAdmin, async (req, res) => {
  try {
    const db = require('../db');
    
    // At this point, we're guaranteed to have an admin user
    console.log(`Admin action by: ${req.user.email}`);
    
    // Get statistics
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM apartments) as total_apartments,
        (SELECT COUNT(*) FROM reviews) as total_reviews
    `);
    
    res.json({
      success: true,
      data: stats.rows[0],
      admin: req.user,
      timestamp: new Date()
    });
    
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch statistics' 
    });
  }
});

// ============================================
// Example 8: Testing the middleware
// ============================================

/**
 * cURL examples for testing:
 */

// Test 1: Without authentication
// $ curl http://localhost:3000/api/admin/stats
// Expected: 401 Unauthorized

// Test 2: With non-admin token
// $ curl -H "Authorization: Bearer <regular_user_token>" \
//        http://localhost:3000/api/admin/stats
// Expected: 403 Forbidden

// Test 3: With admin token or matching email
// $ curl -H "Authorization: Bearer <admin_token>" \
//        http://localhost:3000/api/admin/stats
// Expected: 200 OK with stats data

// ============================================
// Example 9: Logging admin access
// ============================================

const auditLog = async (req, action) => {
  const db = require('../db');
  
  await db.query(
    `INSERT INTO audit_logs (user_id, action, timestamp) 
     VALUES ($1, $2, NOW())`,
    [req.user.uid, action]
  );
};

router.post('/admin/action', authMiddleware, isAdmin, async (req, res) => {
  try {
    // Log this admin action
    await auditLog(req, 'admin_action_performed');
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// Example 10: Role checking in database queries
// ============================================

router.get('/admin/verify', authMiddleware, isAdmin, async (req, res) => {
  try {
    const db = require('../db');
    
    // Double-check user role in database
    const userCheck = await db.query(
      `SELECT uid, email, role FROM users WHERE uid = $1`,
      [req.user.uid]
    );
    
    if (!userCheck.rows.length || userCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin role verification failed' 
      });
    }
    
    res.json({
      verified: true,
      user: userCheck.rows[0]
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// ============================================
// Summary of Usage
// ============================================

/**
 * Key Points:
 * 
 * 1. Always use authMiddleware FIRST
 *    router.get('/admin', authMiddleware, isAdmin, handler)
 *
 * 2. isAdmin handles everything:
 *    - Database lookup
 *    - Role checking
 *    - Email validation
 *    - Automatic promotion
 *
 * 3. After isAdmin passes, req.user is guaranteed to be admin
 *
 * 4. Set ADMIN_EMAIL in .env:
 *    ADMIN_EMAIL=admin@smartrent.com
 *
 * 5. Apply migration to add role column:
 *    node database/init-db.js
 *
 * 6. All protected routes now have smart admin checking!
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');

/**
 * GET /api/admin/stats
 * Returns statistics about the system
 */
router.get('/stats', authMiddleware, isAdmin, async (req, res) => {
  try {
    // Get total users count
    const usersResult = await db.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(usersResult.rows[0].count, 10);

    // Get total properties count
    const propertiesResult = await db.query('SELECT COUNT(*) as count FROM apartments');
    const totalProperties = parseInt(propertiesResult.rows[0].count, 10);

    // Get pending properties count
    const pendingResult = await db.query(
      "SELECT COUNT(*) as count FROM apartments WHERE status = 'pending'"
    );
    const pendingApprovals = parseInt(pendingResult.rows[0].count, 10);

    // TODO: Add subscriptions table and query active subscriptions
    const activeSubscriptions = 0;

    res.json({
      totalUsers,
      totalProperties,
      activeSubscriptions,
      pendingApprovals,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/admin/users
 * Returns all users
 */
router.get('/users', authMiddleware, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        uid, 
        name, 
        email, 
        type, 
        phone, 
        created_at,
        account_type
       FROM users 
       ORDER BY created_at DESC`
    );

    const users = result.rows.map((user) => ({
      uid: user.uid,
      name: user.name,
      email: user.email,
      type: user.type,
      phone: user.phone,
      created_at: user.created_at,
      account_type: user.account_type,
      status: 'active', // Default status - could be enhanced with actual status column
    }));

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Deletes a user by their UID
 */
router.delete('/users/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (id === req.user.uid) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Delete user (cascading deletes should handle related records)
    const result = await db.query(
      'DELETE FROM users WHERE uid = $1 RETURNING uid, email, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User deleted successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * GET /api/admin/properties
 * Returns all properties/apartments
 */
router.get('/properties', authMiddleware, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        id,
        title,
        description,
        price,
        wilaya,
        landlord_name,
        status,
        created_at
       FROM apartments
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

/**
 * PUT /api/admin/properties/:id/approve
 * Approves a pending property
 */
router.put('/properties/:id/approve', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "UPDATE apartments SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({
      message: 'Property approved successfully',
      property: result.rows[0],
    });
  } catch (error) {
    console.error('Error approving property:', error);
    res.status(500).json({ error: 'Failed to approve property' });
  }
});

/**
 * PUT /api/admin/properties/:id/reject
 * Rejects a pending property
 */
router.put('/properties/:id/reject', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "UPDATE apartments SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({
      message: 'Property rejected successfully',
      property: result.rows[0],
    });
  } catch (error) {
    console.error('Error rejecting property:', error);
    res.status(500).json({ error: 'Failed to reject property' });
  }
});

module.exports = router;

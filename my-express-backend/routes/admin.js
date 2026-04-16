const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');
const { createNotification } = require('../services/notifications');
const { normalizeStoredPlan } = require('../utils/plans');

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
 * PATCH /api/admin/subscriptions/:id/status
 * body: { status: 'active' | 'rejected', feedback?: string }
 */
router.patch('/subscriptions/:id/status', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback = null } = req.body;

    if (!['active', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be active or rejected' });
    }

    const subResult = await db.query('SELECT * FROM subscriptions WHERE id = $1', [id]);
    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    const subscription = subResult.rows[0];

    if (!subscription.user_id || !subscription.plan_name) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    let updated;
    if (status === 'active') {
      const storedPlan = normalizeStoredPlan(subscription.plan_name);

      updated = await db.query(
        `UPDATE subscriptions
         SET status = 'active',
             admin_feedback = $2,
             start_date = NOW(),
             end_date = NOW() + INTERVAL '30 days'
         WHERE id = $1
         RETURNING *`,
        [id, feedback]
      );

      await db.query(
        `UPDATE users SET current_plan = $2, subscription_id = $1 WHERE uid = $3`,
        [id, storedPlan, subscription.user_id]
      );
    } else {
      updated = await db.query(
        `UPDATE subscriptions
         SET status = 'rejected',
             admin_feedback = $2,
             start_date = NULL,
             end_date = NULL
         WHERE id = $1
         RETURNING *`,
        [id, feedback]
      );

      await db.query(
        `UPDATE users SET subscription_id = NULL, current_plan = 'free' WHERE uid = $1`,
        [subscription.user_id]
      );
    }

    try {
      const message =
        status === 'active'
          ? `✅ تم تفعيل اشتراكك في باقة ${subscription.plan_name}. ${feedback ? `ملاحظة: ${feedback}` : ''}`
          : `❌ تم رفض اشتراكك في باقة ${subscription.plan_name}. ${feedback ? `السبب: ${feedback}` : ''}`;

      await createNotification({
        recipientId: subscription.user_id,
        senderId: req.user.uid,
        type: status === 'active' ? 'approval' : 'system',
        apartmentId: null,
        message,
        link: '/subscription',
      });
    } catch (notifyErr) {
      console.error('Notification send failed:', notifyErr);
    }

    res.json({ subscription: updated.rows[0] });
  } catch (error) {
    console.error('Error updating subscription status (admin):', error);
    res.status(500).json({ error: 'Failed to update subscription status' });
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
 * GET /api/admin/reviews
 * Returns all reviews with apartment name and reviewer name
 */
router.get('/reviews', authMiddleware, isAdmin, async (req, res) => {
  try {
    let result;
    try {
      result = await db.query(
        `SELECT
           r.id,
           r.apartment_id,
           COALESCE(a.title, 'Unknown Apartment') AS apartment_name,
           r.renter_id,
           COALESCE(u.name, 'Unknown Reviewer') AS renter_name,
           r.rating,
           r.comment,
           r.report_count,
           r.is_flagged,
           r.created_at
         FROM reviews r
         LEFT JOIN apartments a ON a.firebase_id = r.apartment_id
         LEFT JOIN users u ON u.uid = r.renter_id
         ORDER BY r.created_at DESC`
      );
    } catch (queryError) {
      console.error('SQL query error for admin reviews GET:', queryError);
      return res.status(500).json({ error: 'Database query failed fetching admin reviews' });
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Unexpected error in admin reviews GET:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * DELETE /api/admin/reviews/:id
 * Delete a review by its id
 */
router.delete('/reviews/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM reviews WHERE id = $1 RETURNING id, apartment_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ message: 'Review deleted successfully', review: result.rows[0] });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

/**
 * PATCH /api/admin/reviews/:id/flag
 * Toggle is_flagged or reset report_count
 * body: { action: 'toggle' | 'reset' }
 */
router.patch('/reviews/:id/flag', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!action || !['toggle', 'reset'].includes(action)) {
      return res.status(400).json({ error: 'action is required and must be toggle or reset' });
    }

    let sql;
    let params;

    if (action === 'toggle') {
      sql = 'UPDATE reviews SET is_flagged = NOT is_flagged WHERE id = $1 RETURNING *';
      params = [id];
    } else {
      sql = 'UPDATE reviews SET report_count = 0, is_flagged = FALSE WHERE id = $1 RETURNING *';
      params = [id];
    }

    const updateResult = await db.query(sql, params);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ message: 'Review updated', review: updateResult.rows[0] });
  } catch (error) {
    console.error('Error updating review flag:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

/**
 * GET /api/admin/properties
 * Returns all properties/apartments with verification data
 */
router.get('/properties', authMiddleware, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        a.id,
        a.firebase_id,
        a.title,
        a.description,
        a.price,
        a.wilaya,
        a.landlord_name,
        a.landlord_id,
        a.landlord_phone,
        u.email as landlord_email,
        a.status,
        a.verification_status,
        a.verification_docs,
        a.verification_feedback,
        a.created_at
       FROM apartments a
       LEFT JOIN users u ON u.uid = a.landlord_id
       ORDER BY a.created_at DESC`
    );

    // Debug logging
    console.log(`✅ Admin properties fetched: ${result.rows.length} properties`);
    const propsWithDocs = result.rows.filter(p => p.verification_docs && (Array.isArray(p.verification_docs) ? p.verification_docs.length > 0 : p.verification_docs !== '[]'));
    console.log(`📄 Properties with verification_docs: ${propsWithDocs.length}`);
    propsWithDocs.slice(0, 2).forEach(p => {
      console.log(`  - ${p.title}:`, {
        verification_docs_type: typeof p.verification_docs,
        is_array: Array.isArray(p.verification_docs),
        value_sample: Array.isArray(p.verification_docs) ? p.verification_docs.slice(0, 2) : p.verification_docs,
      });
    });

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
 * GET /api/admin/properties/:id/verification
 * Returns apartment with verification docs (for admins only)
 */
router.get('/properties/:id/verification', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT 
        a.id,
        a.title,
        a.firebase_id,
        a.verification_status,
        a.verification_docs,
        a.verification_feedback,
        a.landlord_id,
        a.landlord_name,
        a.landlord_phone,
        u.email as landlord_email,
        a.created_at
       FROM apartments a
       LEFT JOIN users u ON u.uid = a.landlord_id
       WHERE a.id::text = $1 OR a.firebase_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching property verification:', error);
    res.status(500).json({ error: 'Failed to fetch property verification' });
  }
});

/**
 * GET /api/admin/properties/verification/pending
 * Returns all properties pending verification
 */
router.get('/properties/verification/pending', authMiddleware, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        a.id,
        a.title,
        a.firebase_id,
        a.verification_status,
        a.verification_docs,
        a.landlord_name,
        a.landlord_phone,
        a.created_at,
        u.email as landlord_email
       FROM apartments a
       LEFT JOIN users u ON u.uid = a.landlord_id
       WHERE a.verification_status = 'pending'
       ORDER BY a.created_at ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    res.status(500).json({ error: 'Failed to fetch pending verifications' });
  }
});

/**
 * PATCH /api/admin/properties/:id/verification
 * body: { status: 'verified' | 'rejected', feedback?: string }
 */
router.patch('/properties/:id/verification', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback = null } = req.body;

    if (!['verified', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'status must be verified, rejected, or pending' });
    }

    // Fetch the apartment first
    const aptResult = await db.query(
      `SELECT a.id, a.landlord_id FROM apartments a 
       WHERE a.id::text = $1 OR a.firebase_id = $1`,
      [id]
    );

    if (aptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const apartment = aptResult.rows[0];

    // Update verification status and feedback
    const updateResult = await db.query(
      `UPDATE apartments 
       SET verification_status = $1,
           verification_feedback = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id::text = $3 OR firebase_id = $3
       RETURNING *`,
      [status, feedback, id]
    );

    const updatedApartment = updateResult.rows[0];

    // Send notification to landlord
    let notificationMessage;
    let notificationType;
    
    if (status === 'verified') {
      notificationMessage = '✅ تم التحقق من ملكيتك للعقار بنجاح! عقارك الآن موثق.';
      notificationType = 'approval';
    } else if (status === 'rejected') {
      notificationMessage = `❌ تم رفض التحقق من ملكيتك للعقار.${feedback ? ` السبب: ${feedback}` : ''}`;
      notificationType = 'system';
    } else {
      notificationMessage = '⏳ تم إرجاع التحقق للمراجعة.';
      notificationType = 'system';
    }

    try {
      await createNotification({
        recipientId: apartment.landlord_id,
        senderId: req.user.uid,
        type: notificationType,
        apartmentId: apartment.id,
        message: notificationMessage,
        link: `/apartment/${apartment.id}`,
      });
    } catch (notifyErr) {
      console.error('Notification send failed:', notifyErr);
    }

    res.json({
      message: `Property verification ${status} successfully`,
      property: updatedApartment,
    });
  } catch (error) {
    console.error('Error updating property verification:', error);
    res.status(500).json({ error: 'Failed to update property verification' });
  }
});

module.exports = router;

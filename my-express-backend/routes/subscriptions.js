const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');
const { createNotification } = require('../services/notifications');
const { normalizeStoredPlan } = require('../utils/plans');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'receipts');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname || '') || '.png';
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({ storage });

const PLAN_PRICING = {
  Free: 0,
  Basic: 1800,
  Pro: 3900,
};

async function notifyStatusChange({ subscription, status, feedback, adminId }) {
  try {
    const message =
      status === 'active'
        ? `✅ تم تفعيل اشتراكك في باقة ${subscription.plan_name}. ${feedback ? `ملاحظة: ${feedback}` : ''}`
        : `❌ تم رفض اشتراكك في باقة ${subscription.plan_name}. ${feedback ? `السبب: ${feedback}` : ''}`;

    await createNotification({
      recipientId: subscription.user_id,
      senderId: adminId,
      type: status === 'active' ? 'approval' : 'system',
      apartmentId: null,
      message,
      link: '/subscription',
    });
  } catch (notifyError) {
    console.error('Notification send failed:', notifyError);
  }
}

// Request a paid subscription (Basic/Pro)
router.post('/request', authMiddleware, upload.single('receipt'), async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { plan_name } = req.body;
    const normalizedPlan = plan_name || 'Free';

    if (!userId) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    if (!['Basic', 'Pro'].includes(normalizedPlan)) {
      return res.status(400).json({ error: 'Only Basic or Pro plans require a request' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Receipt image is required' });
    }

    const price = PLAN_PRICING[normalizedPlan] || 0;
    const receiptPath = `/uploads/receipts/${req.file.filename}`;

    const insert = await db.query(
      `INSERT INTO subscriptions (user_id, plan_name, price, receipt_image, status, start_date, end_date)
       VALUES ($1, $2, $3, $4, 'pending', NULL, NULL)
       RETURNING *`,
      [userId, normalizedPlan, price, receiptPath]
    );

    res.status(201).json({ subscription: insert.rows[0] });
  } catch (error) {
    console.error('Error creating subscription request:', error);
    res.status(500).json({ error: 'Failed to create subscription request' });
  }
});

// Current user's subscriptions
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    const result = await db.query(
      `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

async function updateStatusHandler(req, res) {
  try {
    const { id } = req.params;
    const { status, feedback = null } = req.body;

    if (!['active', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be active or rejected' });
    }

    const subscriptionResult = await db.query('SELECT * FROM subscriptions WHERE id = $1', [id]);
    if (subscriptionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    const subscription = subscriptionResult.rows[0];

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
        `UPDATE users
         SET current_plan = $2,
             subscription_id = $1
         WHERE uid = $3`,
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
        `UPDATE users SET subscription_id = NULL, current_plan = 'free'
         WHERE uid = $1`,
        [subscription.user_id]
      );
    }

    await notifyStatusChange({
      subscription,
      status,
      feedback,
      adminId: req.user.uid,
    });

    res.json({ subscription: updated.rows[0] });
  } catch (error) {
    console.error('Error updating subscription status:', error);
    res.status(500).json({ error: 'Failed to update subscription status' });
  }
}

// Unified admin status update with feedback
router.patch('/admin/:id/status', authMiddleware, isAdmin, updateStatusHandler);

// Backward-compatibility routes delegate to unified handler
router.patch('/admin/:id/approve', authMiddleware, isAdmin, (req, res) => {
  req.body = { status: 'active', feedback: null };
  return updateStatusHandler(req, res);
});

router.patch('/admin/:id/reject', authMiddleware, isAdmin, (req, res) => {
  req.body = { status: 'rejected', feedback: null };
  return updateStatusHandler(req, res);
});

// Pending list for admin
router.get('/admin/pending', authMiddleware, isAdmin, async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.name AS user_name, u.email AS user_email
       FROM subscriptions s
       JOIN users u ON u.uid = s.user_id
       WHERE s.status = 'pending'
       ORDER BY s.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

module.exports = router;

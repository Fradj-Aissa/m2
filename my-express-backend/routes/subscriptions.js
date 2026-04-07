const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');
const { createNotification } = require('../services/notifications');
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

router.patch('/admin/:id/approve', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const subscriptionResult = await db.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [id]
    );

    if (subscriptionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = subscriptionResult.rows[0];
    const updated = await db.query(
      `UPDATE subscriptions
       SET status = 'active',
           start_date = NOW(),
           end_date = NOW() + INTERVAL '30 days'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await db.query(
      `UPDATE users
       SET current_plan = $2,
           subscription_id = $1
       WHERE uid = $3`,
      [id, subscription.plan_name, subscription.user_id]
    );

    try {
      await createNotification({
        recipientId: subscription.user_id,
        senderId: req.user.uid,
        type: 'approval',
        apartmentId: null,
        message: `✅ تم تفعيل اشتراكك في باقة ${subscription.plan_name} بنجاح!`,
        link: '/subscription',
      });
    } catch (notifyError) {
      console.error('Notification send failed:', notifyError);
    }

    res.json({ subscription: updated.rows[0] });
  } catch (error) {
    console.error('Error approving subscription:', error);
    res.status(500).json({ error: 'Failed to approve subscription' });
  }
});

router.patch('/admin/:id/reject', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const subscriptionResult = await db.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [id]
    );

    if (subscriptionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = subscriptionResult.rows[0];

    const updated = await db.query(
      `UPDATE subscriptions
       SET status = 'rejected'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await db.query(
      `UPDATE users SET subscription_id = NULL WHERE uid = $1 AND subscription_id = $2`,
      [subscription.user_id, id]
    );

    try {
      await createNotification({
        recipientId: subscription.user_id,
        senderId: req.user.uid,
        type: 'approval',
        apartmentId: null,
        message: `❌ نعتذر، تم رفض إيصال الدفع لاشتراك ${subscription.plan_name}. يرجى التأكد والمحاولة مجدداً.`,
        link: '/subscription',
      });
    } catch (notifyError) {
      console.error('Notification send failed:', notifyError);
    }

    res.json({ subscription: updated.rows[0] });
  } catch (error) {
    console.error('Error rejecting subscription:', error);
    res.status(500).json({ error: 'Failed to reject subscription' });
  }
});

router.get('/admin/pending', authMiddleware, isAdmin, async (req, res) => {
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

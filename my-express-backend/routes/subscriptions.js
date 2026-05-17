const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');
const { createNotification } = require('../services/notifications');
const { normalizeStoredPlan } = require('../utils/plans');
const { receiptUpload } = require('../middleware/premiumUploads');
const autoCheckPremiumExpiry = require('../middleware/autoCheckPremiumExpiry');

const router = express.Router();

async function hasColumn(table, column) {
  const result = await db.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [table, column]
  );
  return result.rows.length > 0;
}

async function createSubscriptionRequest({ userId, receiptPath, amount }) {
  const hasReceiptPath = await hasColumn('subscriptions', 'receipt_path');
  const hasAmount = await hasColumn('subscriptions', 'amount');
  const hasPrice = await hasColumn('subscriptions', 'price');
  const hasPlanName = await hasColumn('subscriptions', 'plan_name');
  const hasReceiptImage = await hasColumn('subscriptions', 'receipt_image');
  const hasStartDate = await hasColumn('subscriptions', 'start_date');
  const hasEndDate = await hasColumn('subscriptions', 'end_date');

  const columns = ['id', 'user_id', 'status', 'created_at'];
  const values = ['gen_random_uuid()', '$1', "'pending'", 'CURRENT_TIMESTAMP'];
  const params = [userId];
  let i = 2;

  if (hasReceiptPath) {
    columns.push('receipt_path');
    values.push(`$${i}`);
    params.push(receiptPath);
    i++;
  }
  if (hasReceiptImage) {
    columns.push('receipt_image');
    values.push(`$${i}`);
    params.push(receiptPath);
    i++;
  }
  if (hasAmount) {
    columns.push('amount');
    values.push(`$${i}`);
    params.push(amount);
    i++;
  }
  if (hasPrice) {
    columns.push('price');
    values.push(`$${i}`);
    params.push(amount);
    i++;
  }
  if (hasPlanName) {
    columns.push('plan_name');
    values.push(`$${i}`);
    params.push('Pro');
    i++;
  }
  if (hasStartDate) {
    columns.push('start_date');
    values.push('NULL');
  }
  if (hasEndDate) {
    columns.push('end_date');
    values.push('NULL');
  }

  const sql = `INSERT INTO subscriptions (${columns.join(', ')}) VALUES (${values.join(', ')}) RETURNING *`;
  return db.query(sql, params);
}

async function notifyStatusChange({ subscription, status, feedback, adminId }) {
  try {
    const message =
      status === 'approved'
        ? `لقد تم قبول طلب الاشتراك الخاص بك بنجاح. ${feedback ? `ملاحظات: ${feedback}` : ''}`
        : `لقد تم رفض طلب الاشتراك الخاص بك. ${feedback ? `السبب: ${feedback}` : ''}`;

    await createNotification({ recipientId: subscription.user_id, senderId: adminId, type: status === 'approved' ? 'approval' : 'system', apartmentId: null, message, link: '/subscription' });
  } catch (notifyError) {
    console.error('Notification send failed:', notifyError);
  }
}

router.post('/upload-receipt', authMiddleware, autoCheckPremiumExpiry, receiptUpload.single('receipt'), async (req, res) => {
  try {
    const userId = req.user?.uid;
    const amount = Number(req.body?.amount || 0);
    if (!userId) return res.status(401).json({ error: 'Invalid user token' });
    if (!req.file) return res.status(400).json({ error: 'Receipt image is required' });

    const receiptPath = `/uploads/receipts/${req.file.filename}`;
    const insert = await createSubscriptionRequest({ userId, receiptPath, amount });

    res.status(201).json({ subscription: insert.rows[0] });
  } catch (error) {
    console.error('Error creating receipt upload:', error);
    res.status(500).json({ error: 'Failed to upload receipt' });
  }
});

router.post('/request', authMiddleware, autoCheckPremiumExpiry, receiptUpload.single('receipt'), async (req, res) => {
  try {
    const userId = req.user?.uid;
    const amount = Number(req.body?.amount || req.body?.price || 0);
    if (!userId) return res.status(401).json({ error: 'Invalid user token' });
    if (!req.file) return res.status(400).json({ error: 'Receipt image is required' });
    const receiptPath = `/uploads/receipts/${req.file.filename}`;
    const insert = await createSubscriptionRequest({ userId, receiptPath, amount });
    res.status(201).json({ subscription: insert.rows[0] });
  } catch (error) {
    console.error('Error creating subscription request:', error);
    res.status(500).json({ error: 'Failed to create subscription request' });
  }
});

router.get('/mine', authMiddleware, autoCheckPremiumExpiry, async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Invalid user token' });
    const result = await db.query(`SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`, [userId]);
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
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'status must be approved or rejected' });

    const subscriptionResult = await db.query('SELECT * FROM subscriptions WHERE id = $1', [id]);
    if (subscriptionResult.rows.length === 0) return res.status(404).json({ error: 'Subscription not found' });
    const subscription = subscriptionResult.rows[0];

    let updated;
    if (status === 'approved') {
      updated = await db.query(
        `UPDATE subscriptions SET status = 'approved', admin_feedback = $2, start_date = NOW(), end_date = NOW() + INTERVAL '30 days' WHERE id = $1 RETURNING *`,
        [id, feedback]
      );
      await db.query(
        `UPDATE users
         SET is_premium = TRUE,
             premium_until = NOW() + INTERVAL '30 days',
             current_plan = 'Pro',
             updated_at = CURRENT_TIMESTAMP
         WHERE uid = $1`,
        [subscription.user_id]
      );
    } else {
      updated = await db.query(
        `UPDATE subscriptions SET status = 'rejected', admin_feedback = $2, start_date = NULL, end_date = NULL WHERE id = $1 RETURNING *`,
        [id, feedback]
      );
    }

    await notifyStatusChange({ subscription, status, feedback, adminId: req.user.uid });
    res.json({ subscription: updated.rows[0] });
  } catch (error) {
    console.error('Error updating subscription status:', error);
    res.status(500).json({ error: 'Failed to update subscription status' });
  }
}

router.patch('/admin/:id/status', authMiddleware, isAdmin, updateStatusHandler);
router.patch('/admin/:id/approve', authMiddleware, isAdmin, (req, res) => { req.body = { status: 'approved', feedback: null }; return updateStatusHandler(req, res); });
router.patch('/admin/:id/reject', authMiddleware, isAdmin, (req, res) => { req.body = { status: 'rejected', feedback: null }; return updateStatusHandler(req, res); });

router.get('/admin/pending', authMiddleware, isAdmin, async (_req, res) => {
  try {
    const result = await db.query(`SELECT s.*, u.name AS user_name, u.email AS user_email FROM subscriptions s JOIN users u ON u.uid = s.user_id WHERE s.status = 'pending' ORDER BY s.created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

module.exports = router;

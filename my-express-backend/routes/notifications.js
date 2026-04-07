const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  listNotifications,
  markNotificationAsRead,
} = require('../services/notifications');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    const notifications = await listNotifications(userId);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    const notification = await markNotificationAsRead(id, userId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

module.exports = router;

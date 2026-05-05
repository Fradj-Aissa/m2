const db = require('../db');
const { emitToUser } = require('../socket');

const NOTIFICATION_SELECT = `
  SELECT
    n.id,
    n.recipient_id,
    n.sender_id,
    n.type,
    n.apartment_id,
    n.message,
    n.link,
    n.is_read,
    n.created_at,
    sender.name AS sender_name,
    COALESCE(sender.profile_pic, sender.avatar) AS sender_photo
  FROM notifications n
  LEFT JOIN users sender ON sender.uid = n.sender_id
`;

async function getNotificationById(notificationId) {
  const result = await db.query(
    `${NOTIFICATION_SELECT}
     WHERE n.id = $1`,
    [notificationId]
  );

  return result.rows[0] || null;
}

async function listNotifications(recipientId) {
  const result = await db.query(
    `${NOTIFICATION_SELECT}
     WHERE n.recipient_id = $1
     ORDER BY n.is_read ASC, n.created_at DESC`,
    [recipientId]
  );

  return result.rows;
}

async function markNotificationAsRead(notificationId, recipientId) {
  const result = await db.query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE id = $1 AND recipient_id = $2
     RETURNING id`,
    [notificationId, recipientId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return getNotificationById(result.rows[0].id);
}

async function createNotification({
  recipientId,
  senderId = null,
  type = 'system',
  apartmentId = null,
  message,
  link = null,
}) {
  if (!recipientId || !message) {
    throw new Error('recipientId and message are required');
  }

  const insertResult = await db.query(
    `INSERT INTO notifications (
      id,
      recipient_id,
      sender_id,
      type,
      apartment_id,
      message,
      link
    ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
    RETURNING id`,
    [recipientId, senderId, type, apartmentId, message, link]
  );

  const notification = await getNotificationById(insertResult.rows[0].id);

  if (notification) {
    emitToUser(recipientId, 'new_notification', notification);
  }

  return notification;
}

module.exports = {
  createNotification,
  getNotificationById,
  listNotifications,
  markNotificationAsRead,
};

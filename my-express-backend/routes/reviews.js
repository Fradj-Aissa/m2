const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const { createNotification } = require('../services/notifications');

const router = express.Router();

async function getApartmentByIdentifier(apartmentIdentifier) {
  const apartmentResult = await db.query(
    `SELECT id, firebase_id, landlord_id, title
     FROM apartments
     WHERE firebase_id = $1 OR id::text = $1`,
    [apartmentIdentifier]
  );

  return apartmentResult.rows[0] || null;
}

async function getReviewStats(apartmentId) {
  const avgResult = await db.query(
    `SELECT
       COALESCE(AVG(rating)::DECIMAL(2,1), 0) AS avg_rating,
       COUNT(*) AS total_reviews
     FROM reviews
     WHERE apartment_id = $1 AND parent_id IS NULL`,
    [apartmentId]
  );

  return {
    avg_rating: parseFloat(avgResult.rows[0].avg_rating),
    total_reviews: parseInt(avgResult.rows[0].total_reviews, 10),
  };
}

router.get('/:apartment_id', async (req, res) => {
  try {
    const { apartment_id } = req.params;

    if (!apartment_id || typeof apartment_id !== 'string') {
      return res.status(400).json({ error: 'apartment_id is required in path and must be a string' });
    }

    const apartment = await getApartmentByIdentifier(apartment_id);

    if (!apartment) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    const reviewsResult = await db.query(
      `SELECT
         r.id,
         r.apartment_id,
         r.renter_id,
         r.owner_id,
         r.parent_id,
         r.rating,
         r.comment,
         r.report_count,
         r.created_at,
         u.name AS author_name,
         u.avatar AS author_photo,
         (r.parent_id IS NOT NULL AND r.renter_id = r.owner_id) AS is_owner_reply
       FROM reviews r
       JOIN users u ON r.renter_id = u.uid
       WHERE r.apartment_id = $1
       ORDER BY r.created_at DESC`,
      [apartment.firebase_id]
    );

    const stats = await getReviewStats(apartment.firebase_id);

    res.json({ reviews: reviewsResult.rows, stats });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { apartment_id, rating, comment } = req.body;
    const renterId = req.user?.uid;
    const parsedRating = Number(rating);

    if (!apartment_id || typeof apartment_id !== 'string') {
      return res.status(400).json({ error: 'apartment_id is required and must be a string' });
    }

    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length < 10) {
      return res.status(400).json({ error: 'comment must be at least 10 characters' });
    }

    if (!renterId) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    const apartment = await getApartmentByIdentifier(apartment_id);

    if (!apartment) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    const ownerId = apartment.landlord_id;

    if (renterId === ownerId) {
      return res.status(403).json({ error: 'Owners cannot review their own apartment' });
    }

    const existingReview = await db.query(
      `SELECT id
       FROM reviews
       WHERE apartment_id = $1 AND renter_id = $2 AND parent_id IS NULL`,
      [apartment.firebase_id, renterId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({ error: 'You have already reviewed this apartment' });
    }

    const insertResult = await db.query(
      `INSERT INTO reviews (
         apartment_id,
         renter_id,
         owner_id,
         parent_id,
         rating,
         comment,
         report_count,
         created_at
       )
       VALUES ($1, $2, $3, NULL, $4, $5, 0, NOW())
       RETURNING id, apartment_id, renter_id, owner_id, parent_id, rating, comment, report_count, created_at`,
      [apartment.firebase_id, renterId, ownerId, parsedRating, comment.trim()]
    );

    const stats = await getReviewStats(apartment.firebase_id);

    try {
      await createNotification({
        recipientId: ownerId,
        senderId: renterId,
        type: 'rating',
        apartmentId: apartment.id,
        message: `أضاف تقييماً جديداً على "${apartment.title}"`,
        link: `/apartment/${apartment.firebase_id}?review=${insertResult.rows[0].id}#reviews`,
      });
    } catch (notificationError) {
      console.error('Failed to create review notification:', notificationError);
    }

    res.status(201).json({ review: insertResult.rows[0], stats });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

router.post('/:id/reply', authMiddleware, async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    const ownerId = req.user?.uid;
    const { comment } = req.body;

    if (!Number.isInteger(reviewId)) {
      return res.status(400).json({ error: 'Review id must be a valid number' });
    }

    if (!ownerId) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length < 3) {
      return res.status(400).json({ error: 'Reply must be at least 3 characters' });
    }

    const parentReviewResult = await db.query(
      `SELECT
         r.id,
         r.parent_id,
         r.apartment_id,
         r.renter_id AS original_renter_id,
         a.id AS apartment_uuid,
         a.firebase_id,
         a.landlord_id,
         a.title
       FROM reviews r
       JOIN apartments a ON a.firebase_id = r.apartment_id
       WHERE r.id = $1`,
      [reviewId]
    );

    if (parentReviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const parentReview = parentReviewResult.rows[0];

    if (parentReview.parent_id !== null) {
      return res.status(400).json({ error: 'Replies can only be added to top-level reviews' });
    }

    if (parentReview.landlord_id !== ownerId) {
      return res.status(403).json({ error: 'Only the apartment owner can reply to this review' });
    }

    const existingReply = await db.query(
      `SELECT id
       FROM reviews
       WHERE parent_id = $1 AND renter_id = $2`,
      [reviewId, ownerId]
    );

    if (existingReply.rows.length > 0) {
      return res.status(409).json({ error: 'This review already has an owner reply' });
    }

    const insertResult = await db.query(
      `INSERT INTO reviews (
         apartment_id,
         renter_id,
         owner_id,
         parent_id,
         rating,
         comment,
         report_count,
         created_at
       )
       VALUES ($1, $2, $3, $4, NULL, $5, 0, NOW())
       RETURNING id, apartment_id, renter_id, owner_id, parent_id, rating, comment, report_count, created_at`,
      [parentReview.apartment_id, ownerId, ownerId, reviewId, comment.trim()]
    );

    try {
      await createNotification({
        recipientId: parentReview.original_renter_id,
        senderId: ownerId,
        type: 'rating',
        apartmentId: parentReview.apartment_uuid,
        message: `قام المالك بالرد على تقييمك في "${parentReview.title}"`,
        link: `/apartment/${parentReview.firebase_id}?review=${insertResult.rows[0].id}#reviews`,
      });
    } catch (notificationError) {
      console.error('Failed to create reply notification:', notificationError);
    }

    res.status(201).json({ reply: insertResult.rows[0] });
  } catch (error) {
    console.error('Error creating review reply:', error);
    res.status(500).json({ error: 'Failed to create review reply' });
  }
});

module.exports = router;

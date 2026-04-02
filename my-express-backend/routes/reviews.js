const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/reviews/:apartment_id
// Fetch all reviews for specific apartment (by apartments.firebase_id)
router.get('/:apartment_id', async (req, res) => {
  try {
    const { apartment_id } = req.params;

    if (!apartment_id || typeof apartment_id !== 'string') {
      return res.status(400).json({ error: 'apartment_id is required in path and must be a string' });
    }

    // Ensure apartment exists
    const apartmentResult = await db.query('SELECT id, firebase_id, landlord_id FROM apartments WHERE firebase_id = $1', [apartment_id]);
    if (apartmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    const reviewsResult = await db.query(
      `SELECT
         r.id,
         r.apartment_id,
         r.renter_id,
         r.owner_id,
         r.rating,
         r.comment,
         r.report_count,
         r.created_at,
         u.name AS renter_name,
         u.avatar AS photo_url
       FROM reviews r
       JOIN users u ON r.renter_id = u.uid
       WHERE r.apartment_id = $1
       ORDER BY r.created_at DESC`,
      [apartment_id]
    );

    const avgResult = await db.query(
      `SELECT
         COALESCE(AVG(rating)::DECIMAL(2,1),0) AS avg_rating,
         COUNT(*) AS total_reviews
       FROM reviews
       WHERE apartment_id = $1`,
      [apartment_id]
    );

    const stats = {
      avg_rating: parseFloat(avgResult.rows[0].avg_rating),
      total_reviews: parseInt(avgResult.rows[0].total_reviews, 10),
    };

    res.json({ reviews: reviewsResult.rows, stats });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /api/reviews
// Authenticated user creates a review for apartment by firebase_id
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { apartment_id, rating, comment } = req.body;
    const renter_id = req.user?.uid;

    if (!apartment_id || typeof apartment_id !== 'string') {
      return res.status(400).json({ error: 'apartment_id is required and must be a string' });
    }
    if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
    }
    if (!comment || typeof comment !== 'string' || comment.trim().length < 10) {
      return res.status(400).json({ error: 'comment must be at least 10 characters' });
    }
    if (!renter_id) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    const apartmentResult = await db.query(
      'SELECT id, firebase_id, landlord_id FROM apartments WHERE firebase_id = $1',
      [apartment_id]
    );

    if (apartmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    const apartment = apartmentResult.rows[0];
    const owner_id = apartment.landlord_id;

    if (renter_id === owner_id) {
      return res.status(403).json({ error: 'Owners cannot review their own apartment' });
    }

    const existing = await db.query(
      'SELECT id FROM reviews WHERE apartment_id = $1 AND renter_id = $2',
      [apartment_id, renter_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You have already reviewed this apartment' });
    }

    const insertResult = await db.query(
      `INSERT INTO reviews (apartment_id, renter_id, owner_id, rating, comment, report_count, created_at)
       VALUES ($1, $2, $3, $4, $5, 0, NOW())
       RETURNING id, apartment_id, renter_id, owner_id, rating, comment, report_count, created_at`,
      [apartment_id, renter_id, owner_id, rating, comment.trim()]
    );

    const avgResult = await db.query(
      `SELECT
         COALESCE(AVG(rating)::DECIMAL(2,1),0) AS avg_rating,
         COUNT(*) AS total_reviews
       FROM reviews
       WHERE apartment_id = $1`,
      [apartment_id]
    );

    const stats = {
      avg_rating: parseFloat(avgResult.rows[0].avg_rating),
      total_reviews: parseInt(avgResult.rows[0].total_reviews, 10),
    };

    res.status(201).json({ review: insertResult.rows[0], stats });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../db");

// Get user's favorite apartment IDs
// GET /api/favorites/:userId
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT apartment_id 
       FROM favorites 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    const favoriteIds = result.rows.map((row) => row.apartment_id);
    res.json(favoriteIds);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

// Get user's favorite apartments (with details)
// GET /api/favorites/:userId/apartments
router.get("/:userId/apartments", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT a.* 
       FROM favorites f
       JOIN apartments a ON f.apartment_id = a.firebase_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch favorite apartments" });
  }
});

// Check if apartment is favorited
// GET /api/favorites/:userId/check/:apartmentId
router.get("/:userId/check/:apartmentId", async (req, res) => {
  try {
    const { userId, apartmentId } = req.params;

    const result = await db.query(
      `SELECT id FROM favorites 
       WHERE user_id = $1 AND apartment_id = $2`,
      [userId, apartmentId]
    );

    const isFavorited = result.rows.length > 0;
    res.json({ isFavorited, favoriteId: isFavorited ? result.rows[0].id : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to check favorite status" });
  }
});

// Add to favorites
// POST /api/favorites
router.post("/", async (req, res) => {
  try {
    const { userId, apartmentId } = req.body;

    if (!userId || !apartmentId) {
      return res.status(400).json({ error: "Missing required fields: userId, apartmentId" });
    }

    // Check if apartment exists
    const apartmentCheck = await db.query(
      `SELECT id FROM apartments 
       WHERE firebase_id = $1`,
      [apartmentId]
    );

    if (apartmentCheck.rows.length === 0) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    // Check if user exists
    const userCheck = await db.query(
      `SELECT uid FROM users WHERE uid = $1`,
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already favorited
    const existing = await db.query(
      `SELECT id FROM favorites WHERE user_id = $1 AND apartment_id = $2`,
      [userId, apartmentId]
    );

    if (existing.rows.length > 0) {
      return res.status(200).json({
        message: "Already in favorites",
        id: existing.rows[0].id,
      });
    }

    const result = await db.query(
      `INSERT INTO favorites (user_id, apartment_id, firebase_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, apartmentId, `temp_${Date.now()}`]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add to favorites" });
  }
});

// Remove from favorites
// DELETE /api/favorites/:userId/:apartmentId
router.delete("/:userId/:apartmentId", async (req, res) => {
  try {
    const { userId, apartmentId } = req.params;

    const result = await db.query(
      `DELETE FROM favorites 
       WHERE user_id = $1 AND apartment_id = $2
       RETURNING *`,
      [userId, apartmentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Favorite not found" });
    }

    res.json({ message: "Removed from favorites" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove from favorites" });
  }
});

// Remove from favorites by ID
// DELETE /api/favorites/remove/:id
router.delete("/remove/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM favorites WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Favorite not found" });
    }

    res.json({ message: "Removed from favorites" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove from favorites" });
  }
});

module.exports = router;

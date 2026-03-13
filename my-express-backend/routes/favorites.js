const express = require("express");
const router = express.Router();
const db = require("../db");

// Helper: resolve apartment identifier to the firebase_id stored in favorites
async function resolveApartmentFirebaseId(apartmentId) {
  const result = await db.query(
    `SELECT firebase_id FROM apartments WHERE id::text = $1 OR firebase_id = $1 LIMIT 1`,
    [apartmentId]
  );
  return result.rows[0]?.firebase_id || null;
}

// Get user's favorite apartment IDs (returns firebase_ids)
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
       JOIN apartments a ON f.apartment_id = a.firebase_id OR f.apartment_id = a.id::text
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

    const firebaseId = await resolveApartmentFirebaseId(apartmentId);
    if (!firebaseId) {
      return res.json({ isFavorited: false, favoriteId: null });
    }

    const result = await db.query(
      `SELECT id FROM favorites 
       WHERE user_id = $1 AND (
         apartment_id = $2 OR firebase_id = $2 OR
         apartment_id = $3 OR firebase_id = $3
       )`,
      [userId, apartmentId, firebaseId]
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

    // Resolve apartment firebase_id (supports both uuid and firebase_id)
    const firebaseId = await resolveApartmentFirebaseId(apartmentId);
    if (!firebaseId) {
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

    // Check if already favorited (supports uuid or firebase_id)
    const existing = await db.query(
      `SELECT id FROM favorites WHERE user_id = $1 AND (
         apartment_id = $2 OR firebase_id = $2 OR
         apartment_id = $3 OR firebase_id = $3
       )`,
      [userId, apartmentId, firebaseId]
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
      [userId, apartmentId, firebaseId]
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

    // Resolve to firebase_id (supports uuid or firebase_id)
    const firebaseId = await resolveApartmentFirebaseId(apartmentId);
    if (!firebaseId) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    const result = await db.query(
      `DELETE FROM favorites 
       WHERE user_id = $1 AND (
         apartment_id = $2 OR firebase_id = $2 OR
         apartment_id = $3 OR firebase_id = $3
       )
       RETURNING *`,
      [userId, apartmentId, firebaseId]
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

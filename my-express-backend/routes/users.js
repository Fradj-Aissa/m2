const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const { uploadImageToImgBB, validateAlgerianPhoneNumber } = require("../utils/imageUpload");
const { identityUpload } = require("../middleware/premiumUploads");
const autoCheckPremiumExpiry = require("../middleware/autoCheckPremiumExpiry");

// Configure multer for image uploads (in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only image mimetypes. Do not throw here; let route return a friendly 400.
    const ok = !!file.mimetype && file.mimetype.startsWith("image/");
    cb(null, ok);
  },
});

// Get user by ID/UID
// GET /api/users/:uid
router.get("/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const result = await db.query("SELECT * FROM users WHERE uid = $1", [uid]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Create or update user
// POST /api/users
router.post("/", async (req, res) => {
  try {
    const { uid, email, name, phone = "", type = "renter" } = req.body;

    // Validation
    if (!uid || !email || !name) {
      return res.status(400).json({ error: "Missing required fields: uid, email, name" });
    }

    const result = await db.query(
      `INSERT INTO users (uid, firebase_id, email, name, phone, type)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (uid) DO UPDATE SET
       email = $3, name = $4, phone = $5, type = $6, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [uid, uid, email, name, phone, type]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create/update user" });
  }
});

// Update profile picture URL in SQL database
// PUT /api/users/update-profile-pic
router.put("/update-profile-pic", authMiddleware, async (req, res) => {
  try {
    const { profile_pic, profile_image, imageUrl, downloadURL } = req.body || {};
    const finalImageUrl = profile_pic || profile_image || imageUrl || downloadURL;

    if (!finalImageUrl) {
      return res.status(400).json({ error: "profile_pic is required" });
    }

    const { uid } = req.user;
    const result = await db.query(
      `UPDATE users
       SET profile_pic = $1,
           profile_image = $1,
           avatar = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE uid = $2
       RETURNING uid, email, name, phone, profile_pic, profile_image, avatar, type, created_at`,
      [finalImageUrl, uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Profile picture updated successfully",
      user: result.rows[0],
      imageUrl: finalImageUrl,
    });
  } catch (err) {
    console.error("Profile picture update error:", err);
    res.status(500).json({ error: "Failed to update profile picture" });
  }
});

// Update user
// PUT /api/users/:uid
router.put("/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, phone, type } = req.body;

    if (!name && !phone && !type) {
      return res.status(400).json({ error: "At least one field must be provided for update" });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (phone) {
      updates.push(`phone = $${paramCount}`);
      values.push(phone);
      paramCount++;
    }

    if (type) {
      updates.push(`type = $${paramCount}`);
      values.push(type);
      paramCount++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(uid);

    const query = `UPDATE users SET ${updates.join(", ")} WHERE uid = $${paramCount} RETURNING *`;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Get all landlords (for admin purposes)
// GET /api/users?type=landlord
router.get("/", async (req, res) => {
  try {
    const { type } = req.query;

    let query = "SELECT uid, email, role, name, phone, type, created_at FROM users";
    const params = [];

    if (type) {
      query += " WHERE type = $1";
      params.push(type);
    }

    query += " ORDER BY created_at DESC";

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Delete user
// DELETE /api/users/:uid
router.delete("/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const result = await db.query("DELETE FROM users WHERE uid = $1 RETURNING *", [uid]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

/**
 * Upload user avatar
 * PATCH /api/users/:uid/avatar
 * Requires: image file (multipart/form-data)
 */
router.patch("/:uid/avatar", authMiddleware, upload.single("image"), async (req, res) => {
  console.log("Avatar upload request received for UID:", req.params.uid);
  console.log("req.file:", req.file);
  try {
    const { uid } = req.params;
    const { uid: authUid } = req.user;

    // Verify user is updating their own avatar
    if (uid !== authUid) {
      return res.status(403).json({ error: "Unauthorized to update this user's avatar" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Upload image to ImgBB
    const imageUrl = await uploadImageToImgBB(
      req.file.buffer,
      `avatar_${uid}_${Date.now()}.jpg`
    );

    // Update user's image field in database
    const result = await db.query(
      `UPDATE users SET profile_image = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE uid = $2 RETURNING uid, email, name, phone, profile_image, avatar, type, created_at`,
      [imageUrl, uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Avatar uploaded successfully",
      user: result.rows[0],
      imageUrl,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    res.status(500).json({ error: error.message || "Failed to upload avatar" });
  }
});

/**
 * Update user phone number with validation
 * PATCH /api/users/:uid/phone
 * Requires: phone (String)
 */
router.patch("/:uid/phone", authMiddleware, async (req, res) => {
  try {
    const { uid } = req.params;
    const { phone } = req.body;
    const { uid: authUid } = req.user;

    // Verify user is updating their own phone
    if (uid !== authUid) {
      return res.status(403).json({ error: "Unauthorized to update this user's phone" });
    }

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Validate Algerian phone number
    if (!validateAlgerianPhoneNumber(phone)) {
      return res.status(400).json({
        error: "Invalid phone number. Algerian numbers must start with 05, 06, or 07",
      });
    }

    const result = await db.query(
      `UPDATE users SET phone = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE uid = $2 RETURNING uid, email, name, phone, type, created_at`,
      [phone, uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Phone number updated successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Phone update error:", error);
    res.status(500).json({ error: "Failed to update phone number" });
  }
});

router.post(
  "/upload-id",
  authMiddleware,
  autoCheckPremiumExpiry,
  identityUpload.fields([
    { name: "id_card", maxCount: 1 },
    { name: "id_front", maxCount: 1 },
    { name: "id_back", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) return res.status(401).json({ error: "Invalid user token" });

      const single = req.files?.id_card?.[0];
      const front = req.files?.id_front?.[0];
      const back = req.files?.id_back?.[0];
      if (!single && (!front || !back)) {
        return res.status(400).json({ error: "ID card image is required" });
      }

      const idCardPath = single
        ? `/uploads/identity/${single.filename}`
        : JSON.stringify({
            front: `/uploads/identity/${front.filename}`,
            back: `/uploads/identity/${back.filename}`,
          });

      const result = await db.query(
        `UPDATE users
         SET id_card_path = $1,
             verification_status = 'pending',
             rejection_reason = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE uid = $2
         RETURNING uid, email, name, verification_status, rejection_reason, id_card_path, is_premium, premium_until`,
        [idCardPath, uid]
      );

      if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

      res.json({ message: "ID card uploaded successfully", user: result.rows[0] });
    } catch (error) {
      console.error("ID upload error:", error);
      res.status(500).json({ error: "Failed to upload ID card" });
    }
  }
);

module.exports = router;


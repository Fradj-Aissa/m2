const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const authMiddleware = require("../middleware/authMiddleware");
const { normalizeDisplayPlan } = require("../utils/plans");
const multer = require("multer");
const { uploadImageToImgBB } = require("../utils/imageUpload");

// Multer setup for registration image uploads (memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = !!file.mimetype && file.mimetype.startsWith("image/");
    cb(null, ok);
  },
});

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

function normalizeUserPlan(user) {
  if (!user) return user;

  return {
    ...user,
    current_plan:
      user.current_plan === undefined ? user.current_plan : normalizeDisplayPlan(user.current_plan),
  };
}

async function handleGoogleAuth(req, res) {
  try {
    console.log("Google auth env:", {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      DATABASE_URL: process.env.DATABASE_URL,
    });

    const { idToken, token, mode = "login", account_type, type } = req.body;
    const idTokenToVerify = idToken || token;
    const requestedAccountType = account_type || type || "renter";

    const normalizedAccountType =
      requestedAccountType === "owner" || requestedAccountType === "landlord"
        ? "owner"
        : "renter";
    const legacyTypeValue = normalizedAccountType === "owner" ? "landlord" : "renter";

    if (!idTokenToVerify) {
      return res.status(400).json({ error: "Missing required field: idToken" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: idTokenToVerify,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.status(400).json({ error: "Invalid Google token payload" });
    }

    const email = payload.email;
    const googleId = payload.sub;
    const name = payload.name || "";
    const picture = payload.picture || "";
    const phoneNumber = payload.phone_number || payload.phone || "";

    const googleIdExists = await hasColumn("users", "google_id");
    const roleExists = await hasColumn("users", "role");
    // detect which profile image column exists in DB (robust to schema changes)
    let profileCol = null;
    if (await hasColumn("users", "profile_image")) profileCol = "profile_image";
    else if (await hasColumn("users", "profile_pic")) profileCol = "profile_pic";
    else if (await hasColumn("users", "image")) profileCol = "image";

    const userResult = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
    let user;
    const isNewUser = userResult.rows.length === 0;

    try {
      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
        const updateParts = [];
        const updateParams = [];

        if (googleIdExists) {
          updateParts.push(`google_id = $${updateParams.length + 1}`);
          updateParams.push(googleId);
        }

        // Update profile image if provided and column exists
        const profileImageExists = !!profileCol;
        if (profileImageExists && picture) {
          updateParts.push(`${profileCol} = $${updateParams.length + 1}`);
          updateParams.push(picture);
        }

        // Update phone if column exists. If Google provided a phone use it, otherwise skip update.
        const phoneColumnExists = await hasColumn("users", "phone");
        if (phoneColumnExists && phoneNumber) {
          updateParts.push(`phone = $${updateParams.length + 1}`);
          updateParams.push(phoneNumber);
        }

        if (email === process.env.ADMIN_EMAIL && roleExists && user.role !== "admin") {
          updateParts.push(`role = $${updateParams.length + 1}`);
          updateParams.push("admin");
        }

        if (updateParts.length > 0) {
          updateParams.push(user.uid);
          try {
            await db.query(`UPDATE users SET ${updateParts.join(", ")} WHERE uid = $${updateParams.length}`, updateParams);
          } catch (updateErr) {
            console.error("Google auth - failed to update existing user:", {
              email,
              updateParts,
              updateParams,
              error: updateErr,
            });
            return res.status(500).json({ error: "Failed to update user", details: updateErr.message });
          }
        }
      } else {
        const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const insertColumns = ["uid", "email", "name"];
        const insertValues = [uid, email, name];

        // include google_id only if column exists
        if (googleIdExists) {
          insertColumns.push("google_id");
          insertValues.push(googleId);
        }

        // include profile image column if it exists
        const profileImageExists = !!profileCol;
        if (profileImageExists) {
          // Default to null if no picture provided by Google
          insertColumns.push(profileCol);
          insertValues.push(picture || null);
        }

        // include phone column if exists. If Google doesn't provide phone, use empty string to satisfy non-null schema.
        const phoneColumnExists = await hasColumn("users", "phone");
        if (phoneColumnExists) {
          insertColumns.push("phone");
          insertValues.push(phoneNumber || "");
        }

        if (email === process.env.ADMIN_EMAIL && roleExists) {
          insertColumns.push("role");
          insertValues.push("admin");
        }

        const placeholders = insertValues.map((_, index) => `$${index + 1}`).join(", ");

        try {
          const insertResult = await db.query(
            `INSERT INTO users (${insertColumns.join(", ")}) VALUES (${placeholders}) RETURNING *`,
            insertValues
          );
          user = insertResult.rows[0];
        } catch (insertErr) {
          console.error("Google auth - insert user failed", {
            email,
            insertColumns,
            insertValues: insertValues.map((v) => (typeof v === "string" && v.length > 100 ? `${v.slice(0, 100)}...` : v)),
            error: insertErr,
          });
          return res.status(500).json({ error: "Failed to create user", details: insertErr.message });
        }
      }
    } catch (innerErr) {
      console.error("Google auth - user create/update unexpected error:", { email, error: innerErr });
      return res.status(500).json({ error: "Failed to process Google user", details: innerErr.message });
    }

    const jwtToken = jwt.sign(
      { uid: user.uid, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Strip sensitive fields and add a safe has_password flag
    const { password: _pw, ...safeUser } = user;
    safeUser.has_password = !!user.password; // true = email/password account, false = Google-only

    // A user requires completion if they don't have a phone number or password
    const requiresCompleteProfile = !user.phone || !user.password;

    res.json({
      message: "Authentication successful",
      user: safeUser,
      token: jwtToken,
      isNewUser,
      requiresCompleteProfile,
    });
  } catch (err) {
    console.error("Error during Google authentication:", err);
    const devDetails = process.env.NODE_ENV === "development" ? err.message || err : undefined;
    res.status(500).json({ error: "Internal server error", details: devDetails });
  }
}

/**
 * Register a new user
 * POST /api/auth/register
 * Body: { email, password, name, phone, type }
 */
router.post("/register", upload.single("image"), async (req, res) => {
  try {
    // when multipart/form-data is used, fields are in req.body and file in req.file
    const { email, password, name } = req.body;
    let { phone = "", account_type, type } = req.body || {};

    // If a file is uploaded, process it
    let profileImageUrl = null;
    if (req.file && req.file.buffer) {
      try {
        profileImageUrl = await uploadImageToImgBB(req.file.buffer, req.file.originalname || `avatar_${Date.now()}`);
      } catch (uploadErr) {
        console.error("Registration image upload failed:", uploadErr);
        return res.status(400).json({ error: "Failed to upload profile image" });
      }
    }
    const requestedAccountType = account_type || type || "renter";

    const normalizedAccountType =
      requestedAccountType === "owner" || requestedAccountType === "landlord"
        ? "owner"
        : "renter";
    const legacyTypeValue = normalizedAccountType === "owner" ? "landlord" : "renter";

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: "Missing required fields: email, password, name" 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: "Password must be at least 6 characters long" 
      });
    }

    // Check if email already exists
    const existingUser = await db.query(
      "SELECT uid FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: "Email already registered" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique uid (use email as base for Firebase compatibility)
    const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create user in database
    const accountTypeExists = await hasColumn("users", "account_type");
    const typeColumnExists = await hasColumn("users", "type");
    const roleExists = await hasColumn("users", "role");
    const insertColumns = ["uid", "firebase_id", "email", "password", "name", "phone"];
    const insertValues = [uid, uid, email, hashedPassword, name, phone];

    // detect profile image column for registration (support profile_image/profile_pic/image)
    let profileColReg = null;
    if (await hasColumn("users", "profile_image")) profileColReg = "profile_image";
    else if (await hasColumn("users", "profile_pic")) profileColReg = "profile_pic";
    else if (await hasColumn("users", "image")) profileColReg = "image";

    // include profile image if uploaded and column exists
    if (profileImageUrl && profileColReg) {
      insertColumns.push(profileColReg);
      insertValues.push(profileImageUrl);
    }

    if (typeColumnExists) {
      insertColumns.push("type");
      insertValues.push(legacyTypeValue);
    }
    if (accountTypeExists) {
      insertColumns.push("account_type");
      insertValues.push(normalizedAccountType);
    }

    const placeholders = insertValues.map((_, index) => `$${index + 1}`).join(", ");
    const returningColumns = [
      "uid",
      "email",
      "name",
      "phone",
      ...(profileColReg ? [profileColReg] : []),
      ...(typeColumnExists ? ["type"] : []),
      ...(accountTypeExists ? ["account_type"] : []),
      ...(roleExists ? ["role"] : []),
      "created_at",
    ].join(", ");

    const result = await db.query(
      `INSERT INTO users (${insertColumns.join(", ")})
       VALUES (${placeholders})
       RETURNING ${returningColumns}`,
      insertValues
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { uid: user.uid, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      user,
      token,
      requiresCompleteProfile: false,
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

/**
 * Login user
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: "Missing required fields: email, password" 
      });
    }

    const accountTypeExists = await hasColumn("users", "account_type");
    const typeColumnExists = await hasColumn("users", "type");
    const currentPlanExists = await hasColumn("users", "current_plan");
    const subscriptionIdExists = await hasColumn("users", "subscription_id");
    const roleExists = await hasColumn("users", "role");
    const selectColumns = [
      "uid",
      "email",
      "password",
      "name",
      "phone",
      "created_at",
      ...(accountTypeExists ? ["account_type"] : []),
      ...(typeColumnExists ? ["type"] : []),
      ...(currentPlanExists ? ["current_plan"] : []),
      ...(subscriptionIdExists ? ["subscription_id"] : []),
      ...(roleExists ? ["role"] : []),
    ].join(", ");

    // Find user by email
    const result = await db.query(
      `SELECT ${selectColumns} FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: "Invalid email or password" 
      });
    }

    const user = result.rows[0];
    const accountType = user.account_type || user.type || "renter";

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ 
        error: "Invalid email or password" 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { uid: user.uid, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return user without password, but with a has_password flag for the frontend
    const { password: _, ...userWithoutPassword } = user;
    const normalizedUser = normalizeUserPlan(userWithoutPassword);
    normalizedUser.account_type = accountType;
    normalizedUser.has_password = true; // email/password login always has a password

    res.json({
      message: "Login successful",
      user: normalizedUser,
      token,
      requiresCompleteProfile: !user.phone || !user.password,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Failed to login" });
  }
});

/**
 * Google OAuth authentication
 * POST /api/auth/google
 * Body: { idToken, mode, account_type }
 */
router.post("/google", handleGoogleAuth);
router.post("/google-login", handleGoogleAuth);

/**
 * Complete user profile for Google signups
 * POST /api/auth/complete-profile
 * Headers: Authorization: Bearer <token>
 * Body: { password, phone, account_type }
 */
router.post("/complete-profile", authMiddleware, async (req, res) => {
  try {
    console.log("Complete Profile Request - Body:", req.body);
    console.log("Complete Profile Request - User:", req.user);

    const { password, phone, account_type } = req.body;
    const uid = req.user?.uid;

    if (!uid) {
      console.error("Missing uid in req.user");
      return res.status(401).json({ error: "Unauthorized - missing user ID" });
    }

    if (!password && !phone) {
      return res.status(400).json({ error: "Password or phone number is required" });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Build update query dynamically
    const updateFields = [];
    const queryValues = [];
    let paramIndex = 1;

    if (phone) {
      updateFields.push(`phone = $${paramIndex}`);
      queryValues.push(phone);
      paramIndex++;
    }

    if (hashedPassword) {
      updateFields.push(`password = $${paramIndex}`);
      queryValues.push(hashedPassword);
      paramIndex++;
    }

    if (account_type) {
      const normalizedType = account_type === "owner" || account_type === "landlord" ? "owner" : "renter";
      updateFields.push(`account_type = $${paramIndex}`);
      queryValues.push(normalizedType);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const roleExists = await hasColumn("users", "role");
    const returningColumns = [
      "uid",
      "email",
      "name",
      "phone",
      "type",
      "account_type",
      ...(roleExists ? ["role"] : []),
      "created_at",
    ].join(", ");

    // Add uid to query values
    queryValues.push(uid);
    const uidParamIndex = paramIndex;

    // Execute update
    const updateQuery = `UPDATE users 
      SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP 
      WHERE uid = $${uidParamIndex} 
      RETURNING ${returningColumns}`;

    console.log("Update Query:", updateQuery);
    console.log("Query Values:", queryValues);

    const result = await db.query(updateQuery, queryValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = result.rows[0];
    updatedUser.account_type = updatedUser.account_type || updatedUser.type;

    res.json({
      message: "Profile completed successfully",
      user: updatedUser,
      requiresCompleteProfile: false,
    });
  } catch (err) {
    console.error("Complete profile error:", err);
    console.error("Full Database Error:", err);
    res.status(500).json({ 
      error: "Failed to complete profile",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

/**
 * Verify JWT token (optional endpoint for frontend to verify token validity)
 * POST /api/auth/verify
 * Headers: Authorization: Bearer <token>
 */
router.post("/verify", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      res.json({ valid: true, user: decoded });
    } catch (err) {
      res.status(401).json({ valid: false, error: "Invalid or expired token" });
    }
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ error: "Failed to verify token" });
  }
});

/**
 * Change user password
 * POST /api/auth/change-password
 * Headers: Authorization: Bearer <token>
 * Body: { currentPassword, newPassword }
 */
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ error: "Unauthorized - missing user ID" });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Missing required fields: currentPassword, newPassword",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "New password must be at least 6 characters long",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: "New password must be different from current password",
      });
    }

    // Fetch user from database
    const userResult = await db.query(
      "SELECT uid, password FROM users WHERE uid = $1",
      [uid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];

    // Verify current password
    if (!user.password) {
      return res.status(400).json({
        error: "User does not have a password set. Please complete your profile first.",
      });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updateResult = await db.query(
      "UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE uid = $2 RETURNING uid, email, name",
      [hashedPassword, uid]
    );

    res.json({
      message: "Password changed successfully",
      user: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
});

/**
 * Delete user account
 * DELETE /api/auth/account
 * Headers: Authorization: Bearer <token>
 * Body: { password } - Required for email/password users; optional for Google-only users
 *
 * Strategy:
 *  - If the user has a password (email/password account), verify it before deleting.
 *  - If the user has NO password (Google OAuth only), allow deletion without a password
 *    so that Google users can also delete their accounts.
 *  - Explicitly delete child records before deleting the user as a belt-and-suspenders
 *    guard against any FK constraint issues, even though the schema uses CASCADE.
 */
router.delete("/account", authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ error: "Unauthorized - missing user ID" });
    }

    // Fetch user
    const userResult = await db.query(
      "SELECT uid, password, email FROM users WHERE uid = $1",
      [uid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];

    // Password verification:
    // - Email/password accounts MUST provide their password.
    // - Google-only accounts (password IS NULL) may skip this step.
    if (user.password) {
      // This is an email/password account — require password confirmation.
      if (!password) {
        return res.status(400).json({
          error: "Password is required to confirm account deletion",
        });
      }
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Password is incorrect" });
      }
    }
    // else: Google-only user — no password check needed.

    // Explicitly clean up related records to avoid any FK constraint surprises.
    // The schema already uses onDelete: Cascade, but we do this explicitly
    // so that any future schema changes don't break account deletion.
    try {
      await db.query("DELETE FROM favorites    WHERE user_id = $1", [uid]);
      await db.query("DELETE FROM reviews      WHERE renter_id = $1", [uid]);
      await db.query("DELETE FROM subscriptions WHERE user_id = $1", [uid]);
      // Nullify sender_id on notifications where this user was the sender
      // (recipient notifications cascade-delete with the user row)
      await db.query("UPDATE notifications SET sender_id = NULL WHERE sender_id = $1", [uid]);
      // Apartments and their child records (favorites, reviews, notifications)
      // cascade via the apartments FK — handled when we delete the user row.
    } catch (cleanupErr) {
      console.error("Delete account - cleanup error (non-fatal):", cleanupErr);
      // Non-fatal: continue to delete the user row; cascade will handle the rest.
    }

    // Hard-delete the user record — this cascades to apartments, notifications, etc.
    const deleteResult = await db.query(
      "DELETE FROM users WHERE uid = $1 RETURNING uid, email",
      [uid]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: "Failed to delete user" });
    }

    console.log(`Account hard-deleted: uid=${uid}, email=${deleteResult.rows[0].email}`);

    res.json({
      message: "Account deleted successfully",
      deleted: true,
      deletedUser: deleteResult.rows[0],
    });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ error: "Failed to delete account", details: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
});

module.exports = router;

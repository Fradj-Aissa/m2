const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const authMiddleware = require("../middleware/authMiddleware");
const { normalizeDisplayPlan } = require("../utils/plans");

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

    const googleIdExists = await hasColumn("users", "google_id");
    const roleExists = await hasColumn("users", "role");

    const userResult = await db.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    let user;
    const isNewUser = userResult.rows.length === 0;

    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
      const updateParts = [];
      const updateParams = [];

      if (googleIdExists) {
        updateParts.push(`google_id = $${updateParams.length + 1}`);
        updateParams.push(googleId);
      }

      if (email === process.env.ADMIN_EMAIL && roleExists && user.role !== "admin") {
        updateParts.push(`role = $${updateParams.length + 1}`);
        updateParams.push("admin");
      }

      if (updateParts.length > 0) {
        updateParams.push(user.uid);
        await db.query(
          `UPDATE users SET ${updateParts.join(", ")} WHERE uid = $${updateParams.length}`,
          updateParams
        );
      }
    } else {
      const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const insertColumns = ["uid", "email", "name", "google_id"];
      const insertValues = [uid, email, name, googleId];

      if (email === process.env.ADMIN_EMAIL && roleExists) {
        insertColumns.push("role");
        insertValues.push("admin");
      }

      const placeholders = insertValues.map((_, index) => `$${index + 1}`).join(", ");

      const insertResult = await db.query(
        `INSERT INTO users (${insertColumns.join(", ")}) VALUES (${placeholders}) RETURNING *`,
        insertValues
      );
      user = insertResult.rows[0];
    }

    const jwtToken = jwt.sign(
      { uid: user.uid, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Authentication successful",
      user,
      token: jwtToken,
      isNewUser,
    });
  } catch (err) {
    console.error("Error during Google authentication:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Register a new user
 * POST /api/auth/register
 * Body: { email, password, name, phone, type }
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, phone = "", account_type, type } = req.body;
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

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    const normalizedUser = normalizeUserPlan(userWithoutPassword);
    normalizedUser.account_type = accountType;

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

module.exports = router;

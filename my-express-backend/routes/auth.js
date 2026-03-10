const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/**
 * Register a new user
 * POST /api/auth/register
 * Body: { email, password, name, phone, type }
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, phone = "", type = "renter" } = req.body;

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
    const result = await db.query(
      `INSERT INTO users (uid, firebase_id, email, password, name, phone, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING uid, email, name, phone, type, created_at`,
      [uid, uid, email, hashedPassword, name, phone, type]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { uid: user.uid, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      user,
      token,
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

    // Find user by email
    const result = await db.query(
      `SELECT uid, email, password, name, phone, type, created_at 
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: "Invalid email or password" 
      });
    }

    const user = result.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ 
        error: "Invalid email or password" 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { uid: user.uid, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: "Login successful",
      user: userWithoutPassword,
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Failed to login" });
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

const jwt = require("jsonwebtoken");

/**
 * Middleware to verify JWT token from Authorization header
 * Attaches decoded user info to req.user
 * 
 * Usage: router.post('/', authMiddleware, handler)
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        error: "Missing or invalid Authorization header" 
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // Attach user info to request
      next();
    } catch (err) {
      return res.status(401).json({ 
        error: "Invalid or expired token" 
      });
    }
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
};

module.exports = authMiddleware;

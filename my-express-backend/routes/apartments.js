const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const { normalizeDisplayPlan, normalizeStoredPlan } = require("../utils/plans");
const { createNotification } = require("../services/notifications");

// Helper function to exclude sensitive verification docs from public API
const excludeVerificationDocs = (apartment) => {
  if (!apartment) return apartment;
  const { verification_docs, ...rest } = apartment;
  return rest;
};

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

const PLAN_LIMITS = {
  free: { maxProperties: 1, maxImages: 5 },
  basic: { maxProperties: 3, maxImages: 10 },
  pro: { maxProperties: 10, maxImages: 20 },
};

/**
 * Upload images to ImgBB
 * POST /api/apartments/upload-images
 * Expects: multipart/form-data with 'images' field containing multiple files
 * Returns: { urls: ["https://i.ibb.co/...", ...] }
 */
router.post("/upload-images", authMiddleware, upload.array("images"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No images provided" });
    }

    const uploadedUrls = [];
    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "ImgBB API key not configured" });
    }

    // Upload each image to ImgBB
    for (const file of req.files) {
      try {
        // Convert buffer to base64
        const base64Image = file.buffer.toString("base64");

        // Create URLSearchParams for ImgBB
        const params = new URLSearchParams();
        params.append("image", base64Image);

        // Send to ImgBB
        const response = await axios.post(
          `https://api.imgbb.com/1/upload?key=${apiKey}`,
          params,
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );

        // Extract URL from response
        if (response.data.success && response.data.data.url) {
          uploadedUrls.push(response.data.data.url);
        } else {
          throw new Error(`Failed to upload ${file.originalname}`);
        }
      } catch (error) {
        console.error(`Error uploading ${file.originalname}:`, error.message);
        return res.status(500).json({
          error: `Failed to upload image: ${file.originalname}`,
          details: error.message,
        });
      }
    }

    res.json({ urls: uploadedUrls });
  } catch (err) {
    console.error("Image upload error:", err);
    res.status(500).json({ error: "Failed to upload images" });
  }
});

// Get all apartments (with filters)
// GET /api/apartments?wilayaId=&rooms=&minPrice=&maxPrice=&priceUnit=
router.get("/", async (req, res) => {
  try {
    const {
      wilayaId,
      rooms,
      minPrice,
      maxPrice,
      priceUnit,
      propertyType,
      isFeatured,
      limit = 50,
      offset = 0,
    } = req.query;
    let isPremiumViewer = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const viewer = await db.query("SELECT is_premium FROM users WHERE uid = $1", [decoded.uid]);
        isPremiumViewer = !!viewer.rows[0]?.is_premium;
      } catch (_e) {
        isPremiumViewer = false;
      }
    }

    let query = `
      SELECT 
        a.*,
        COALESCE(u.profile_pic, u.profile_image, u.avatar) as landlord_photo_url,
        u.verification_status as landlord_verification_status,
        u.current_plan, 
        s.start_date AS subscription_start_date
      FROM apartments a
      LEFT JOIN users u ON u.uid = a.landlord_id
      LEFT JOIN subscriptions s ON s.id = u.subscription_id
      WHERE a.is_active = true
    `;
    const params = [];
    let paramCount = 1;

    // Add filters dynamically
    if (wilayaId) {
      query += ` AND wilaya_id = $${paramCount}`;
      params.push(parseInt(wilayaId));
      paramCount++;
    }

    if (priceUnit) {
      query += ` AND price_unit = $${paramCount}`;
      params.push(priceUnit);
      paramCount++;
    }

    if (propertyType) {
      query += ` AND property_type = $${paramCount}`;
      params.push(propertyType);
      paramCount++;
    }

    if (rooms) {
      if (parseInt(rooms) >= 4) {
        query += ` AND rooms >= $${paramCount}`;
      } else {
        query += ` AND rooms = $${paramCount}`;
      }
      params.push(parseInt(rooms));
      paramCount++;
    }

    if (minPrice) {
      query += ` AND price >= $${paramCount}`;
      params.push(parseFloat(minPrice));
      paramCount++;
    }

    if (maxPrice) {
      query += ` AND price <= $${paramCount}`;
      params.push(parseFloat(maxPrice));
      paramCount++;
    }

    if (isFeatured === "true") {
      query += ` AND is_featured = true`;
    }
    if (!isPremiumViewer) {
      query += ` AND a.created_at <= NOW() - INTERVAL '24 hours'`;
    }

    // Order: plan priority, then subscription start_date, then creation date
    query += ` ORDER BY
      CASE LOWER(COALESCE(u.current_plan, 'free')) WHEN 'pro' THEN 1 WHEN 'basic' THEN 2 ELSE 3 END,
      COALESCE(s.start_date, a.created_at) DESC,
      a.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);
    
    // Also get total count for pagination metadata
    let countQuery = "SELECT COUNT(*) as total FROM apartments a WHERE a.is_active = true";
    let countParams = [];
    let countParamCount = 1;

    if (wilayaId) {
      countQuery += ` AND a.wilaya_id = $${countParamCount}`;
      countParams.push(parseInt(wilayaId));
      countParamCount++;
    }
    if (priceUnit) {
      countQuery += ` AND a.price_unit = $${countParamCount}`;
      countParams.push(priceUnit);
      countParamCount++;
    }
    if (propertyType) {
      countQuery += ` AND a.property_type = $${countParamCount}`;
      countParams.push(propertyType);
      countParamCount++;
    }
    if (rooms) {
      if (parseInt(rooms) >= 4) {
        countQuery += ` AND a.rooms >= $${countParamCount}`;
      } else {
        countQuery += ` AND a.rooms = $${countParamCount}`;
      }
      countParams.push(parseInt(rooms));
      countParamCount++;
    }
    if (minPrice) {
      countQuery += ` AND a.price >= $${countParamCount}`;
      countParams.push(parseFloat(minPrice));
      countParamCount++;
    }
    if (maxPrice) {
      countQuery += ` AND a.price <= $${countParamCount}`;
      countParams.push(parseFloat(maxPrice));
      countParamCount++;
    }
    if (isFeatured === "true") {
      countQuery += ` AND a.is_featured = true`;
    }
    if (!isPremiumViewer) {
      countQuery += ` AND a.created_at <= NOW() - INTERVAL '24 hours'`;
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // Exclude verification_docs from public API response
    const apartmentsWithoutDocs = result.rows.map(excludeVerificationDocs);

    res.json({
      apartments: apartmentsWithoutDocs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch apartments" });
  }
});

// Get featured apartments
// GET /api/apartments/featured
router.get("/featured", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        a.*,
        COALESCE(u.profile_pic, u.profile_image, u.avatar) as landlord_photo_url,
        u.verification_status as landlord_verification_status
      FROM apartments a
      LEFT JOIN users u ON u.uid = a.landlord_id
      WHERE a.is_active = true AND a.is_featured = true 
      ORDER BY a.created_at DESC LIMIT 6`
    );
    // Exclude verification_docs from public API response
    const apartmentsWithoutDocs = result.rows.map(excludeVerificationDocs);
    res.json(apartmentsWithoutDocs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch featured apartments" });
  }
});

// Get apartment by ID (with landlord profile info)
// GET /api/apartments/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try both UUID and firebase_id with explicit text cast, and join with users table
    let isPremiumViewer = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const viewer = await db.query("SELECT is_premium FROM users WHERE uid = $1", [decoded.uid]);
        isPremiumViewer = !!viewer.rows[0]?.is_premium;
      } catch (_e) {
        isPremiumViewer = false;
      }
    }

    const result = await db.query(
      `SELECT 
        a.*,
        COALESCE(u.profile_pic, u.profile_image, u.avatar) as landlord_photo_url,
        u.name as landlord_name_from_user,
        u.verification_status as landlord_verification_status
      FROM apartments a
      LEFT JOIN users u ON u.uid = a.landlord_id
      WHERE a.id::text = $1 OR a.firebase_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    const apartment = result.rows[0];
    const isNewEarlyAccess = new Date(apartment.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
    if (isNewEarlyAccess && !isPremiumViewer) {
      return res.status(403).json({
        error: "This listing is in premium early access window",
        earlyAccess: true,
        apartmentId: apartment.id,
      });
    }

    // Increment views counter
    await db.query(
      "UPDATE apartments SET views = views + 1 WHERE id::text = $1",
      [apartment.id]
    );

    // Exclude verification_docs from public API response
    res.json(excludeVerificationDocs(apartment));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch apartment" });
  }
});

// Get apartments by landlord
// GET /api/apartments/landlord/:landlordId
router.get("/landlord/:landlordId", async (req, res) => {
  try {
    const { landlordId } = req.params;
    const result = await db.query(
      "SELECT * FROM apartments WHERE landlord_id = $1 ORDER BY created_at DESC",
      [landlordId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch landlord apartments" });
  }
});

// Get apartments by wilaya
// GET /api/apartments/wilaya/:wilayaId
router.get("/wilaya/:wilayaId", async (req, res) => {
  try {
    const { wilayaId } = req.params;
    const result = await db.query(
      "SELECT * FROM apartments WHERE is_active = true AND wilaya_id = $1 ORDER BY created_at DESC",
      [parseInt(wilayaId)]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch wilaya apartments" });
  }
});

// Create new apartment
// POST /api/apartments
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      images = [],
      price,
      priceUnit = "month",
      propertyType = null,
      wilaya,
      wilayaId,
      municipality,
      rooms,
      bathrooms,
      area,
      amenities = [],
      verificationDocs = [],
      isFeatured = false,
      isActive = true,
      landlordId,
      landlordPhone,
      landlordName,
      lat,
      lng,
    } = req.body;

    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Enforce landlord ownership from token
    const landlordUid = landlordId || userId;
    if (landlordId && landlordId !== userId) {
      return res.status(403).json({ error: "Landlord ID must match authenticated user" });
    }

    // Fetch plan limits
    const userResult = await db.query("SELECT current_plan FROM users WHERE uid = $1", [landlordUid]);
    const currentPlan = normalizeStoredPlan(userResult.rows[0]?.current_plan);
    const planLimits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.free;
    const displayPlan = normalizeDisplayPlan(currentPlan);

    // Check property count limit
    const countResult = await db.query(
      "SELECT COUNT(*)::int AS count FROM apartments WHERE landlord_id = $1",
      [landlordUid]
    );
    if (countResult.rows[0].count >= planLimits.maxProperties) {
      return res.status(403).json({
        error: `Plan limit reached: ${displayPlan} allows up to ${planLimits.maxProperties} properties`,
      });
    }

    // Normalize images array and enforce per-property image limit
    let normalizedImages = images;
    if (typeof images === "string") {
      try {
        normalizedImages = JSON.parse(images);
      } catch (_e) {
        normalizedImages = [];
      }
    }
    if (!Array.isArray(normalizedImages)) normalizedImages = [];
    if (normalizedImages.length > planLimits.maxImages) {
      return res.status(400).json({
        error: `Plan limit reached: ${displayPlan} allows up to ${planLimits.maxImages} images per property`,
      });
    }

    // Validation
    if (!title || !landlordUid || !price || !rooms || !bathrooms || !area) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await db.query(
      `INSERT INTO apartments (
        id, title, description, images, price, price_unit, property_type, wilaya, wilaya_id,
        municipality, rooms, bathrooms, area, amenities, verification_docs, is_featured, is_active,
        landlord_id, landlord_phone, landlord_name, firebase_id, lat, lng
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        title,
        description,
        JSON.stringify(normalizedImages),
        parseFloat(price),
        priceUnit,
        propertyType,
        wilaya,
        wilayaId,
        municipality,
        parseInt(rooms),
        parseInt(bathrooms),
        parseFloat(area),
        JSON.stringify(amenities),
        JSON.stringify(Array.isArray(verificationDocs) ? verificationDocs : []),
        isFeatured,
        isActive,
        landlordUid,
        landlordPhone,
        landlordName,
        `temp_${Date.now()}`, // Temporary firebase_id, will be updated after Firestore migration
        lat ? parseFloat(lat) : null,
        lng ? parseFloat(lng) : null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create apartment" });
  }
});

// Update apartment
// PUT /api/apartments/:id
/**
 * UPDATE /api/apartments/:id
 * With Security Watcher: Auto-invalidate verification if sensitive fields change
 */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Fetch current apartment to check verification status
    const currentAptResult = await db.query(
      `SELECT id, verification_status, landlord_id FROM apartments 
       WHERE id::text = $1 OR firebase_id = $1`,
      [id]
    );

    if (currentAptResult.rows.length === 0) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    const currentApt = currentAptResult.rows[0];
    const isVerified = currentApt.verification_status === 'verified';

    // Sensitive fields that trigger verification invalidation
    const sensitiveFields = ["title", "address", "wilaya", "wilaya_id", "lat", "lng", "latitude", "longitude"];
    const updatingsSensitiveField = sensitiveFields.some(field => updates.hasOwnProperty(field));

    // Build dynamic update query
    const allowedFields = [
      "title",
      "description",
      "images",
      "price",
      "price_unit",
      "property_type",
      "wilaya",
      "wilaya_id",
      "municipality",
      "rooms",
      "bathrooms",
      "area",
      "amenities",
      "is_featured",
      "is_active",
      "landlord_phone",
      "landlord_name",
      "status",
      "verification_docs",
      "verification_status",
      "verification_feedback",
      "lat",
      "lng",
    ];

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        
        // Handle JSON fields
        if (key === "images" || key === "amenities" || key === "verification_docs") {
          updateValues.push(JSON.stringify(value));
        } else if (key === "price" || key === "area") {
          updateValues.push(parseFloat(value));
        } else if (key === "rooms" || key === "bathrooms" || key === "wilaya_id") {
          updateValues.push(parseInt(value));
        } else if (key === "is_featured" || key === "is_active") {
          updateValues.push(Boolean(value));
        } else {
          updateValues.push(value);
        }
        
        paramCount++;
      }
    }

    // SECURITY WATCHER: Auto-invalidate verification
    if (isVerified && updatingsSensitiveField) {
      updateFields.push(`verification_status = $${paramCount}`);
      updateValues.push('pending');
      paramCount++;

      updateFields.push(`verification_feedback = $${paramCount}`);
      updateValues.push(null);
      paramCount++;

      // Log for debugging
      console.log(`[SECURITY WATCHER] Verification invalidated for apartment ${id} due to sensitive field update`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Add updated_at to query
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const query = `UPDATE apartments SET ${updateFields.join(", ")} 
                   WHERE id::text = $${paramCount} OR firebase_id = $${paramCount}
                   RETURNING *`;

    const result = await db.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    const updatedApartment = result.rows[0];

    // Send notification if verification was invalidated
    if (isVerified && updatingsSensitiveField) {
      try {
        await createNotification(
          currentApt.landlord_id,
          null,
          'system',
          updatedApartment.id,
          'تم إعادة تعيين حالة التوثيق للمراجعة بسبب تعديل بيانات أساسية في الشقة.',
          `/apartment/${updatedApartment.id}`
        );
      } catch (err) {
        console.error('Error creating notification:', err);
      }
    }

    res.json(updatedApartment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update apartment" });
  }
});

// Toggle apartment status
// PATCH /api/apartments/:id/status
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive must be a boolean" });
    }

    const result = await db.query(
      "UPDATE apartments SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id::text = $2 OR firebase_id = $2 RETURNING *",
      [isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle status" });
  }
});

// Increment phone clicks
// PATCH /api/apartments/:id/phone-click
router.patch("/:id/phone-click", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "UPDATE apartments SET phone_clicks = phone_clicks + 1, updated_at = CURRENT_TIMESTAMP WHERE id::text = $1 OR firebase_id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to increment phone clicks" });
  }
});

// Delete apartment
// DELETE /api/apartments/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Deleting apartment:", id);

    // Check if apartment exists (match by id::text or firebase_id for flexibility)
    const check = await db.query(
      "SELECT id, firebase_id FROM apartments WHERE id::text = $1 OR firebase_id = $1",
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    const apt_id = check.rows[0].id;
    const firebase_id = check.rows[0].firebase_id;

    // Delete favorites (using firebase_id since that's what favorites table references)
    await db.query("DELETE FROM favorites WHERE apartment_id = $1", [firebase_id]);

    // Delete apartment
    const result = await db.query(
      "DELETE FROM apartments WHERE id::text = $1 RETURNING *",
      [apt_id]
    );

    console.log("✅ Deleted apartment:", apt_id);
    res.json({ message: "Apartment deleted successfully", apartment: result.rows[0] });
  } catch (err) {
    console.error("❌ Delete error:", err.message);
    res.status(500).json({ error: "Failed to delete apartment", msg: err.message });
  }
});

module.exports = router;

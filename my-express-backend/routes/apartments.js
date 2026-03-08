const express = require("express");
const router = express.Router();
const db = require("../db");

// Get all apartments (with filters)
// GET /api/apartments?wilayaId=&rooms=&minPrice=&maxPrice=&priceUnit=
router.get("/", async (req, res) => {
  try {
    const { wilayaId, rooms, minPrice, maxPrice, priceUnit, isFeatured, limit = 50, offset = 0 } = req.query;

    let query = "SELECT * FROM apartments WHERE is_active = true";
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

    // Order by creation date (newest first), add pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);
    
    // Also get total count for pagination metadata
    let countQuery = "SELECT COUNT(*) as total FROM apartments WHERE is_active = true";
    let countParams = [];
    let countParamCount = 1;

    if (wilayaId) {
      countQuery += ` AND wilaya_id = $${countParamCount}`;
      countParams.push(parseInt(wilayaId));
      countParamCount++;
    }
    if (priceUnit) {
      countQuery += ` AND price_unit = $${countParamCount}`;
      countParams.push(priceUnit);
      countParamCount++;
    }
    if (rooms) {
      if (parseInt(rooms) >= 4) {
        countQuery += ` AND rooms >= $${countParamCount}`;
      } else {
        countQuery += ` AND rooms = $${countParamCount}`;
      }
      countParams.push(parseInt(rooms));
      countParamCount++;
    }
    if (minPrice) {
      countQuery += ` AND price >= $${countParamCount}`;
      countParams.push(parseFloat(minPrice));
      countParamCount++;
    }
    if (maxPrice) {
      countQuery += ` AND price <= $${countParamCount}`;
      countParams.push(parseFloat(maxPrice));
      countParamCount++;
    }
    if (isFeatured === "true") {
      countQuery += ` AND is_featured = true`;
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      apartments: result.rows,
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
      "SELECT * FROM apartments WHERE is_active = true AND is_featured = true ORDER BY created_at DESC LIMIT 6"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch featured apartments" });
  }
});

// Get apartment by ID
// GET /api/apartments/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try both UUID and firebase_id
    const result = await db.query(
      "SELECT * FROM apartments WHERE id = $1 OR firebase_id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    const apartment = result.rows[0];

    // Increment views counter
    await db.query(
      "UPDATE apartments SET views = views + 1 WHERE id = $1",
      [apartment.id]
    );

    res.json(apartment);
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
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      images = [],
      price,
      priceUnit = "month",
      wilaya,
      wilayaId,
      municipality,
      rooms,
      bathrooms,
      area,
      amenities = [],
      isFeatured = false,
      isActive = true,
      landlordId,
      landlordPhone,
      landlordName,
    } = req.body;

    // Validation
    if (!title || !landlordId || !price || !rooms || !bathrooms || !area) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await db.query(
      `INSERT INTO apartments (
        title, description, images, price, price_unit, wilaya, wilaya_id,
        municipality, rooms, bathrooms, area, amenities, is_featured, is_active,
        landlord_id, landlord_phone, landlord_name, firebase_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        title,
        description,
        JSON.stringify(images),
        parseFloat(price),
        priceUnit,
        wilaya,
        wilayaId,
        municipality,
        parseInt(rooms),
        parseInt(bathrooms),
        parseFloat(area),
        JSON.stringify(amenities),
        isFeatured,
        isActive,
        landlordId,
        landlordPhone,
        landlordName,
        `temp_${Date.now()}`, // Temporary firebase_id, will be updated after Firestore migration
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
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const allowedFields = [
      "title",
      "description",
      "images",
      "price",
      "price_unit",
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
    ];

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        
        // Handle JSON fields
        if (key === "images" || key === "amenities") {
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

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Add id and updated_at to query
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const query = `UPDATE apartments SET ${updateFields.join(", ")} 
                   WHERE id = $${paramCount} OR firebase_id = $${paramCount}
                   RETURNING *`;

    const result = await db.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update apartment" });
  }
});

// Toggle apartment status
// PATCH /api/apartments/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive must be a boolean" });
    }

    const result = await db.query(
      "UPDATE apartments SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 OR firebase_id = $2 RETURNING *",
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
      "UPDATE apartments SET phone_clicks = phone_clicks + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 OR firebase_id = $1 RETURNING *",
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
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM apartments WHERE id = $1 OR firebase_id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    res.json({ message: "Apartment deleted successfully", apartment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete apartment" });
  }
});

module.exports = router;

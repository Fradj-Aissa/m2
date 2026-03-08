const admin = require("firebase-admin");
const { Pool } = require("pg");
require("dotenv").config();

// Initialize Firebase Admin SDK
// Make sure to download your Firebase service account JSON file
// and save it in the project root as serviceAccountKey.json
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const firestore = admin.firestore();

// Initialize PostgreSQL Pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Helper function to execute queries with transaction support
const query = (text, params) => pool.query(text, params);

// Migrate Users
async function migrateUsers() {
  console.log("🔄 Starting users migration...");
  try {
    const snapshot = await firestore.collection("users").get();
    let migratedCount = 0;
    let skippedCount = 0;

    for (const doc of snapshot.docs) {
      const firestoreUser = doc.data();
      const uid = doc.id;

      try {
        await query(
          `INSERT INTO users (uid, firebase_id, email, name, phone, type, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (uid) DO UPDATE SET
           email = $3, name = $4, phone = $5, type = $6, updated_at = CURRENT_TIMESTAMP`,
          [
            uid,
            uid, // firebase_id maps to the Firestore UID
            firestoreUser.email,
            firestoreUser.name,
            firestoreUser.phone,
            firestoreUser.type || "renter",
            new Date(firestoreUser.createdAt?.toDate?.() || firestoreUser.createdAt || new Date()),
          ]
        );
        migratedCount++;
      } catch (err) {
        console.error(`⚠️  Error migrating user ${uid}:`, err.message);
        skippedCount++;
      }
    }

    console.log(
      `✅ Users migration completed: ${migratedCount} migrated, ${skippedCount} skipped`
    );
  } catch (err) {
    console.error("❌ Error during users migration:", err);
    throw err;
  }
}

// Migrate Apartments
async function migrateApartments() {
  console.log("🔄 Starting apartments migration...");
  try {
    const snapshot = await firestore.collection("apartments").get();
    let migratedCount = 0;
    let skippedCount = 0;

    for (const doc of snapshot.docs) {
      const firestoreApt = doc.data();
      const firestoreId = doc.id;

      try {
        await query(
          `INSERT INTO apartments (
            firebase_id, title, description, images, price, price_unit, 
            wilaya, wilaya_id, municipality, rooms, bathrooms, area, 
            amenities, is_featured, is_active, views, phone_clicks, 
            created_at, landlord_id, landlord_phone, landlord_name, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          ON CONFLICT (firebase_id) DO UPDATE SET
          title = $2, description = $3, images = $4, price = $5, 
          price_unit = $6, wilaya = $7, wilaya_id = $8, municipality = $9,
          rooms = $10, bathrooms = $11, area = $12, amenities = $13,
          is_featured = $14, is_active = $15, views = $16, phone_clicks = $17,
          landlord_phone = $20, landlord_name = $21, status = $22,
          updated_at = CURRENT_TIMESTAMP`,
          [
            firestoreId,
            firestoreApt.title,
            firestoreApt.description,
            JSON.stringify(firestoreApt.images || []),
            parseFloat(firestoreApt.price),
            firestoreApt.priceUnit || "month",
            firestoreApt.wilaya,
            firestoreApt.wilayaId,
            firestoreApt.municipality,
            firestoreApt.rooms,
            firestoreApt.bathrooms,
            parseFloat(firestoreApt.area),
            JSON.stringify(firestoreApt.amenities || []),
            firestoreApt.isFeatured || false,
            firestoreApt.isActive === undefined ? true : firestoreApt.isActive,
            firestoreApt.views || 0,
            firestoreApt.phoneClicks || 0,
            new Date(firestoreApt.createdAt?.toDate?.() || firestoreApt.createdAt || new Date()),
            firestoreApt.landlordId,
            firestoreApt.landlordPhone,
            firestoreApt.landlordName,
            firestoreApt.status || "approved",
          ]
        );
        migratedCount++;
      } catch (err) {
        console.error(`⚠️  Error migrating apartment ${firestoreId}:`, err.message);
        skippedCount++;
      }
    }

    console.log(
      `✅ Apartments migration completed: ${migratedCount} migrated, ${skippedCount} skipped`
    );
  } catch (err) {
    console.error("❌ Error during apartments migration:", err);
    throw err;
  }
}

// Migrate Favorites
async function migrateFavorites() {
  console.log("🔄 Starting favorites migration...");
  try {
    const snapshot = await firestore.collection("favorites").get();
    let migratedCount = 0;
    let skippedCount = 0;

    for (const doc of snapshot.docs) {
      const firestoreFav = doc.data();
      const firestoreId = doc.id;

      try {
        await query(
          `INSERT INTO favorites (firebase_id, user_id, apartment_id, created_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (firebase_id) DO NOTHING`,
          [
            firestoreId,
            firestoreFav.userId,
            firestoreFav.apartmentId,
            new Date(firestoreFav.createdAt?.toDate?.() || firestoreFav.createdAt || new Date()),
          ]
        );
        migratedCount++;
      } catch (err) {
        console.error(`⚠️  Error migrating favorite ${firestoreId}:`, err.message);
        skippedCount++;
      }
    }

    console.log(
      `✅ Favorites migration completed: ${migratedCount} migrated, ${skippedCount} skipped`
    );
  } catch (err) {
    console.error("❌ Error during favorites migration:", err);
    throw err;
  }
}

// Main migration function
async function runMigration() {
  console.log("🚀 Starting Firestore to PostgreSQL migration...\n");

  try {
    // Step 1: Verify database connection
    const testResult = await query("SELECT NOW()");
    console.log("✅ Successfully connected to PostgreSQL\n");

    // Step 2: Run migrations in order (users first, then apartments, then favorites)
    await migrateUsers();
    console.log();
    await migrateApartments();
    console.log();
    await migrateFavorites();

    console.log("\n✅ Migration completed successfully!\n");
  } catch (err) {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
    await admin.app().delete();
  }
}

// Run the migration
runMigration();

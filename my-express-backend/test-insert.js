const db = require('./db');
async function testInsert() {
  try {
    const res = await db.query(
      `INSERT INTO apartments (
        title, description, images, price, price_unit, wilaya, wilaya_id,
        municipality, rooms, bathrooms, area, amenities, verification_docs, is_featured, is_active,
        landlord_id, landlord_phone, landlord_name, firebase_id, lat, lng
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        'Test Title', 'Test Desc', '[]', 1000, 'month', 'Alger', 16,
        'Alger Centre', 2, 1, 50, '[]', '[]', false, true,
        'test_user', '0600000000', 'Test', 'temp_123', null, null
      ]
    );
    console.log('SUCCESS');
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    process.exit(0);
  }
}
testInsert();

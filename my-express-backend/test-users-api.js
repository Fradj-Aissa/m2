const db = require('./db');

async function testUserEndpoint() {
  try {
    console.log('\n🧪 TESTING POST /api/users\n');

    // Prepare test data
    const testUser = {
      uid: 'test_user_123',
      email: 'testuser@example.com',
      name: 'Test User',
      phone: '+213612345678',
      type: 'landlord'
    };

    console.log('📝 Test Data:');
    console.log(JSON.stringify(testUser, null, 2));

    // Execute the same query as the endpoint
    console.log('\n⏳ Executing INSERT query...');
    const result = await db.query(
      `INSERT INTO users (uid, firebase_id, email, name, phone, type)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (uid) DO UPDATE SET
       email = $3, name = $4, phone = $5, type = $6, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [testUser.uid, testUser.uid, testUser.email, testUser.name, testUser.phone, testUser.type]
    );

    console.log('\n✅ SUCCESS! User created/updated:');
    console.log(JSON.stringify(result.rows[0], null, 2));

    // Verify it exists
    console.log('\n🔍 Verifying user in database...');
    const verify = await db.query('SELECT * FROM users WHERE uid = $1', [testUser.uid]);
    
    if (verify.rows.length > 0) {
      console.log('✅ User verified in database');
      console.log('\n📊 Current users count:');
      const count = await db.query('SELECT COUNT(*) as total FROM users');
      console.log(`   Total: ${count.rows[0].total} users`);
    }

    console.log('\n✨ Test Complete - POST /api/users is working!\n');

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('\nFull Error:', err);
  } finally {
    process.exit(0);
  }
}

testUserEndpoint();

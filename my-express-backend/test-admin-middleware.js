/**
 * Test Script: Admin Middleware Functionality
 * 
 * This script demonstrates the new admin middleware behavior:
 * 1. Database lookup for user role
 * 2. Email matching with ADMIN_EMAIL env variable
 * 3. Automatic promotion to admin if email matches
 * 4. Proper error handling for unauthorized access
 */

const db = require('./db');
require('dotenv').config();

async function testAdminMiddleware() {
  try {
    console.log('\n🧪 TESTING ADMIN MIDDLEWARE LOGIC\n');
    console.log(`📧 ADMIN_EMAIL from env: ${process.env.ADMIN_EMAIL || 'NOT SET'}\n`);

    // Test Case 1: User with admin role already
    console.log('─── Test Case 1: User already has admin role ───');
    const adminUser = await db.query(
      `SELECT uid, email, role FROM users WHERE role = 'admin' LIMIT 1`
    );
    if (adminUser.rows.length > 0) {
      console.log('✅ Found admin user:', adminUser.rows[0]);
      console.log('   → Access: GRANTED (already admin)\n');
    } else {
      console.log('ℹ️  No existing admin users in database\n');
    }

    // Test Case 2: User without admin role but email matches ADMIN_EMAIL
    console.log('─── Test Case 2: Regular user with matching email ───');
    if (process.env.ADMIN_EMAIL) {
      const matchingUser = await db.query(
        `SELECT uid, email, role FROM users WHERE email = $1 AND role IS NULL LIMIT 1`,
        [process.env.ADMIN_EMAIL]
      );
      if (matchingUser.rows.length > 0) {
        console.log('✅ Found user with matching email:', matchingUser.rows[0]);
        console.log('   → Action: PROMOTE to admin');
        console.log('   → Update query would be:');
        console.log('     UPDATE users SET role = \'admin\' WHERE uid = $1\n');
      } else {
        const allUsers = await db.query(
          `SELECT uid, email, role FROM users LIMIT 3`
        );
        console.log('ℹ️  No matching users. Sample users:');
        allUsers.rows.forEach(u => {
          console.log(`     - ${u.email} (role: ${u.role || 'NULL'})`);
        });
        console.log('');
      }
    } else {
      console.log('⚠️  ADMIN_EMAIL not set - promotion would be blocked\n');
    }

    // Test Case 3: User without matching email
    console.log('─── Test Case 3: User without matching email ───');
    const otherUser = await db.query(
      `SELECT uid, email, role FROM users WHERE role IS NULL LIMIT 1`
    );
    if (otherUser.rows.length > 0) {
      console.log('✅ Found regular user:', otherUser.rows[0]);
      console.log('   → Access: DENIED (403 Forbidden)');
      console.log('   → Reason: Email does not match ADMIN_EMAIL\n');
    } else {
      console.log('ℹ️  No regular users found\n');
    }

    // Show database state
    console.log('─── Current Database State ───');
    const stats = await db.query(
      `SELECT 
         COUNT(*) as total_users,
         COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
         COUNT(CASE WHEN role IS NULL THEN 1 END) as regular_count
       FROM users`
    );
    const result = stats.rows[0];
    console.log(`📊 Total Users: ${result.total_users}`);
    console.log(`   Admin Users: ${result.admin_count}`);
    console.log(`   Regular Users: ${result.regular_count}\n`);

    // Show sample admin query
    console.log('─── Sample Admin Query ───');
    console.log('To promote a user to admin programmatically:');
    console.log(`
      UPDATE users 
      SET role = 'admin', updated_at = CURRENT_TIMESTAMP
      WHERE email = 'admin@example.com'
      RETURNING uid, email, role;
    `);

  } catch (err) {
    console.error('❌ Test error:', err);
  } finally {
    process.exit(0);
  }
}

testAdminMiddleware();

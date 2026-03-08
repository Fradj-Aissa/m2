const db = require('./db');

async function checkDatabase() {
  try {
    // Check tables
    const tables = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('\n📊 TABLES IN DATABASE:');
    if (tables.rows.length === 0) {
      console.log('❌ NO TABLES FOUND - Schema not applied!');
      console.log('\nTo apply schema, run:');
      console.log('  psql -U postgres -d smartrent_db -f schema.sql');
    } else {
      tables.rows.forEach(t => console.log(`  ✅ ${t.table_name}`));
    }

    // If users table exists, check structure
    if (tables.rows.some(t => t.table_name === 'users')) {
      console.log('\n👤 USERS TABLE COLUMNS:');
      const columns = await db.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      columns.rows.forEach(c => {
        console.log(`  - ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? '(NOT NULL)' : '(nullable)'}`);
      });

      // Count users
      const count = await db.query('SELECT COUNT(*) as count FROM users');
      console.log(`\n  Total users: ${count.rows[0].count}`);
    }

    // If apartments table exists, check count
    if (tables.rows.some(t => t.table_name === 'apartments')) {
      const count = await db.query('SELECT COUNT(*) as count FROM apartments');
      console.log(`\n🏠 APARTMENTS TABLE:`);
      console.log(`  Total apartments: ${count.rows[0].count}`);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkDatabase();

const db = require('./db');

async function inspectUserTable() {
  try {
    console.log('\n📋 EXISTING USER TABLE STRUCTURE:\n');
    
    const columns = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'User'
      ORDER BY ordinal_position
    `);

    console.log('Columns:');
    columns.rows.forEach(c => {
      const nullable = c.is_nullable === 'NO' ? '❌ NOT NULL' : '✓ nullable';
      const defaultVal = c.column_default ? ` (default: ${c.column_default})` : '';
      console.log(`  • ${c.column_name}: ${c.data_type} [${nullable}]${defaultVal}`);
    });

    // Check a sample record
    const sample = await db.query('SELECT * FROM "User" LIMIT 1');
    if (sample.rows.length > 0) {
      console.log('\n📌 Sample Record:');
      console.log(JSON.stringify(sample.rows[0], null, 2));
    }

    const count = await db.query('SELECT COUNT(*) as count FROM "User"');
    console.log(`\n📊 Total records: ${count.rows[0].count}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

inspectUserTable();

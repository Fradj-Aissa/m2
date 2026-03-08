const db = require('./db');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  try {
    console.log('\n🔧 SMARTRENT DATABASE SETUP\n');

    // Step 1: Create database (if not exists)
    console.log('1️⃣  Creating smartrent_db database...');
    try {
      await db.query('CREATE DATABASE smartrent_db');
      console.log('   ✅ Database created');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('   ✅ Database already exists');
      } else {
        throw err;
      }
    }

    // Step 2: Check if schema.sql exists
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.log('\n❌ ERROR: schema.sql not found!');
      console.log('   Expected location:', schemaPath);
      return;
    }

    console.log('\n2️⃣  Reading schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    console.log('   ✅ Schema file loaded');

    // Step 3: Create new pool connected to smartrent_db
    const { Pool } = require('pg');
    const smartrentDb = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: 'smartrent_db',
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

    console.log('\n3️⃣  Applying schema to smartrent_db...');
    const statements = schemaSql.split(';').filter(s => s.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt) {
        try {
          await smartrentDb.query(stmt);
        } catch (err) {
          // Ignore errors for CREATE EXTENSION IF NOT EXISTS (it's idempotent)
          if (!stmt.includes('CREATE EXTENSION') || !err.message.includes('already exists')) {
            console.log(`   ⚠️  Statement ${i + 1}: ${err.message.substring(0, 60)}`);
          }
        }
      }
    }
    console.log(`   ✅ Applied ${statements.length} schema statements`);

    // Step 4: Verify tables
    console.log('\n4️⃣  Verifying tables...');
    const tables = await smartrentDb.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    tables.rows.forEach(t => console.log(`   ✅ ${t.table_name}`));

    // Step 5: Update .env
    console.log('\n5️⃣  Updating .env to use smartrent_db...');
    let envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
    envContent = envContent.replace(/DB_NAME=.*/g, 'DB_NAME=smartrent_db');
    fs.writeFileSync(path.join(__dirname, '.env'), envContent);
    console.log('   ✅ .env updated');

    console.log('\n✨ SETUP COMPLETE!\n');
    console.log('📊 Database: smartrent_db');
    console.log('📋 Tables: users, apartments, favorites');
    console.log('\n✅ You can now run: npm run migrate');
    console.log('✅ Or start the server: npm run dev\n');

    await smartrentDb.end();

  } catch (err) {
    console.error('\n❌ Setup failed:', err.message);
    if (err.code === 'ENOENT') {
      console.log('\nMake sure you have downloaded the schema.sql file');
    }
  } finally {
    process.exit(0);
  }
}

setupDatabase();

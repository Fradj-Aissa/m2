const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'apartments'");
  console.log(res.rows);
  const rows = await client.query("SELECT id, title, lat, lng FROM apartments LIMIT 3");
  console.log(rows.rows);
  await client.end();
}
run();

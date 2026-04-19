const { Client } = require('pg'); 
require('dotenv').config(); 
const client = new Client({ connectionString: process.env.DATABASE_URL }); 
async function run() { 
  await client.connect(); 
  const res = await client.query(`SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'users_current_plan_check'`); 
  console.log(res.rows[0].pg_get_constraintdef); 
  await client.end(); 
} 
run();

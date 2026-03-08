const { Pool } = require('pg');
require('dotenv').config();

// إنشاء مخزن اتصالات (Pool) بدلاً من اتصال واحد لزيادة الأداء
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// وظيفة لتنفيذ الاستعلامات وتصديرها لاستخدامها في ملفات أخرى
module.exports = {
  query: (text, params) => pool.query(text, params),
};
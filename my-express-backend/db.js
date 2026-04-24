const { Pool } = require('pg');
const { loadEnvironment } = require('./config/runtime');

loadEnvironment();

// Use DATABASE_URL if set, otherwise use individual DB env vars
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    };

// إنشاء مخزن اتصالات (Pool) بدلاً من اتصال واحد لزيادة الأداء
const pool = new Pool(poolConfig);

// وظيفة لتنفيذ الاستعلامات وتصديرها لاستخدامها في ملفات أخرى
module.exports = {
  query: (text, params) => pool.query(text, params),
};

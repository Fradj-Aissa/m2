const fs = require('fs');
const path = require('path');

function loadEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  // Load local env only for non-production environments.
  // Render injects environment variables at the system level.
  require('dotenv').config({ path: envPath });
}

function getAllowedOrigins() {
  const localhostOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
  ];

  // Production origins (Render, Vercel, etc.)
  const productionOrigins = [
    'https://m2-3.onrender.com',           // Render backend
    process.env.FRONTEND_URL,               // From environment
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null, // Vercel auto
  ].filter(Boolean);

  return [...new Set([...localhostOrigins, ...productionOrigins])];
}

module.exports = {
  getAllowedOrigins,
  loadEnvironment,
};

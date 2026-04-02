const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('./db'); // استيراد ملف الاتصال الذي أنشأناه
require('dotenv').config();

// Import route modules
const authRouter = require('./routes/auth');
const apartmentsRouter = require('./routes/apartments');
const usersRouter = require('./routes/users');
const favoritesRouter = require('./routes/favorites');
const adminRouter = require('./routes/admin');
const reviewsRouter = require('./routes/reviews');

const app = express();
app.use(express.json());

// CORS middleware (enable if frontend is on different origin)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Cross-Origin-Opener-Policy', 'same-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// Test database connection endpoint
app.get('/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      message: "✅ متصل بقاعدة البيانات بنجاح!",
      time: result.rows[0].now
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ خطأ في الاتصال بقاعدة البيانات");
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/apartments', apartmentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/reviews', reviewsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

async function initializeDatabase() {
  try {
    const filePath = path.resolve(__dirname, 'init-db.sql');
    const sql = fs.readFileSync(filePath, 'utf-8');
    await db.query(sql);
    console.log('Database tables checked/created successfully.');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Server is running : http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();
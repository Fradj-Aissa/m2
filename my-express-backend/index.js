const express = require('express');
const http = require('http');
const path = require('path');
const db = require('./db');
const { initializeSocketServer } = require('./socket');
const { runMigrations } = require('./database/init-db');
require('dotenv').config();

const authRouter = require('./routes/auth');
const apartmentsRouter = require('./routes/apartments');
const usersRouter = require('./routes/users');
const favoritesRouter = require('./routes/favorites');
const adminRouter = require('./routes/admin');
const notificationsRouter = require('./routes/notifications');
const reviewsRouter = require('./routes/reviews');
const subscriptionsRouter = require('./routes/subscriptions');
const predictionsRouter = require('./routes/predictions');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Cross-Origin-Opener-Policy', 'same-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      message: 'تم الاتصال بقاعدة البيانات بنجاح',
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).send('فشل الاتصال بقاعدة البيانات');
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.use('/api/auth', authRouter);
app.use('/api/apartments', apartmentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api', predictionsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await runMigrations();
    initializeSocketServer(server);

    server.listen(PORT, () => {
      console.log(`Server is running : http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();

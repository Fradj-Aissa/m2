-- my-express-backend/init-db.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
  uid VARCHAR(255) PRIMARY KEY,
  firebase_id VARCHAR(255) UNIQUE NOT NULL,
  google_id VARCHAR(255) UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255),
  profile_pic TEXT,
  avatar TEXT,
  account_type VARCHAR(50) CHECK (account_type IN ('renter', 'landlord')),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('renter', 'landlord')),
  role VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Apartments table
CREATE TABLE IF NOT EXISTS apartments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_id VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  images JSONB DEFAULT '[]',
  price NUMERIC(10, 2) NOT NULL,
  price_unit VARCHAR(50) NOT NULL CHECK (price_unit IN ('day', 'week', 'month')),
  wilaya VARCHAR(255) NOT NULL,
  wilaya_id INTEGER NOT NULL,
  municipality VARCHAR(255) NOT NULL,
  rooms INTEGER NOT NULL,
  bathrooms INTEGER NOT NULL,
  area NUMERIC(10, 2) NOT NULL,
  amenities JSONB DEFAULT '[]',
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  views INTEGER DEFAULT 0,
  phone_clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  landlord_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  landlord_phone VARCHAR(20) NOT NULL,
  landlord_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected'))
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_id VARCHAR(255) UNIQUE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  apartment_id VARCHAR(255) NOT NULL REFERENCES apartments(firebase_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, apartment_id)
);

-- Reviews table (per requested schema)
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  apartment_id VARCHAR(255) NOT NULL REFERENCES apartments(firebase_id) ON DELETE CASCADE,
  renter_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  owner_id VARCHAR(255) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  report_count INTEGER DEFAULT 0,
  is_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

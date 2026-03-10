-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (migrated from Firestore 'users' collection)
CREATE TABLE IF NOT EXISTS users (
  uid VARCHAR(255) PRIMARY KEY,
  firebase_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('renter', 'landlord')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Apartments table (migrated from Firestore 'apartments' collection)
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

-- Favorites table (migrated from Firestore 'favorites' collection)
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_id VARCHAR(255) UNIQUE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  apartment_id VARCHAR(255) NOT NULL REFERENCES apartments(firebase_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, apartment_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_apartments_landlord_id ON apartments(landlord_id);
CREATE INDEX IF NOT EXISTS idx_apartments_wilaya_id ON apartments(wilaya_id);
CREATE INDEX IF NOT EXISTS idx_apartments_is_active ON apartments(is_active);
CREATE INDEX IF NOT EXISTS idx_apartments_is_featured ON apartments(is_featured);
CREATE INDEX IF NOT EXISTS idx_apartments_created_at ON apartments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apartments_status ON apartments(status);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_apartment_id ON favorites(apartment_id);

-- Comment on tables for documentation
COMMENT ON TABLE users IS 'Stores user information (renters and landlords)';
COMMENT ON TABLE apartments IS 'Stores apartment listings with details, images, and metadata';
COMMENT ON TABLE favorites IS 'Stores user favorite apartment relationships';
COMMENT ON COLUMN apartments.firebase_id IS 'Maps to original Firestore document ID for reference tracking';
COMMENT ON COLUMN users.firebase_id IS 'Maps to original Firestore UID for reference tracking';
COMMENT ON COLUMN favorites.firebase_id IS 'Maps to original Firestore document ID for reference tracking';

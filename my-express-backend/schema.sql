CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  CREATE TYPE notification_type AS ENUM ('rating', 'contact', 'approval', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE subscription_status AS ENUM ('pending','active','expired','rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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
  current_plan VARCHAR(20) NOT NULL DEFAULT 'Free',
  subscription_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS apartments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_id VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  images JSONB DEFAULT '[]',
  price NUMERIC(10, 2) NOT NULL,
  price_unit VARCHAR(50) NOT NULL CHECK (price_unit IN ('day', 'week', 'month')),
  property_type VARCHAR(20) CHECK (property_type IN ('Apartment', 'House', 'Studio')),
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

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_id VARCHAR(255) UNIQUE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  apartment_id VARCHAR(255) NOT NULL REFERENCES apartments(firebase_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, apartment_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  apartment_id VARCHAR(255) NOT NULL REFERENCES apartments(firebase_id) ON DELETE CASCADE,
  renter_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  owner_id VARCHAR(255) NOT NULL,
  parent_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  report_count INTEGER DEFAULT 0,
  is_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  sender_id VARCHAR(255) REFERENCES users(uid) ON DELETE SET NULL,
  type notification_type NOT NULL,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  plan_name VARCHAR(20) NOT NULL CHECK (plan_name IN ('Free','Basic','Pro')),
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  receipt_image TEXT,
  status subscription_status NOT NULL DEFAULT 'pending',
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_apartments_landlord_id ON apartments(landlord_id);
CREATE INDEX IF NOT EXISTS idx_apartments_wilaya_id ON apartments(wilaya_id);
CREATE INDEX IF NOT EXISTS idx_apartments_is_active ON apartments(is_active);
CREATE INDEX IF NOT EXISTS idx_apartments_is_featured ON apartments(is_featured);
CREATE INDEX IF NOT EXISTS idx_apartments_created_at ON apartments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apartments_status ON apartments(status);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_apartment_id ON favorites(apartment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_parent_id ON reviews(parent_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

COMMENT ON TABLE users IS 'Stores user information (renters and landlords)';
COMMENT ON TABLE apartments IS 'Stores apartment listings with details, images, and metadata';
COMMENT ON TABLE favorites IS 'Stores user favorite apartment relationships';
COMMENT ON TABLE reviews IS 'Stores apartment reviews and owner replies';
COMMENT ON TABLE notifications IS 'Stores real-time and in-app notifications for users';
COMMENT ON COLUMN apartments.firebase_id IS 'Maps to original Firestore document ID for reference tracking';
COMMENT ON COLUMN users.firebase_id IS 'Maps to original Firestore UID for reference tracking';
COMMENT ON COLUMN favorites.firebase_id IS 'Maps to original Firestore document ID for reference tracking';

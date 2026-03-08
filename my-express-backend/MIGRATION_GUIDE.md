# Firebase to PostgreSQL Migration Guide

This guide will help you migrate from Firebase/Firestore to PostgreSQL for the SmartRent project.

## 🔧 What Was Created

### 1. **schema.sql** - PostgreSQL Database Schema
Contains CREATE TABLE statements for:
- `users` - User accounts (renters & landlords)
- `apartments` - Apartment listings
- `favorites` - User favorite apartments

### 2. **migrate.js** - Firestore to PostgreSQL Migration Script
Automatically reads all data from Firestore collections and inserts into PostgreSQL

### 3. **routes/** - Express.js API Routes
- `routes/apartments.js` - Apartment CRUD operations
- `routes/users.js` - User management
- `routes/favorites.js` - Favorite management

### 4. **.env.example** - Environment Configuration Template

---

## 📋 Setup Instructions

### Step 1: Install Dependencies

```bash
cd my-express-backend
npm install
```

This installs:
- `express` - Web framework
- `pg` - PostgreSQL driver
- `firebase-admin` - Firebase Admin SDK for data migration
- `dotenv` - Environment variables

### Step 2: Create PostgreSQL Database

First, ensure PostgreSQL is running on your machine. Then create the database:

```bash
psql -U postgres
```

In the PostgreSQL shell:
```sql
CREATE DATABASE smartrent_db;
\c smartrent_db
```

Then run the schema file:
```bash
psql -U postgres -d smartrent_db -f schema.sql
```

Or copy and paste the contents of `schema.sql` directly in the psql shell.

### Step 3: Configure Environment Variables

Copy `.env.example` to `.env` and fill in your PostgreSQL credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
DB_USER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_PASSWORD=your_postgres_password
DB_NAME=smartrent_db
PORT=3000
NODE_ENV=development
```

### Step 4: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `smartrent-bd358`
3. Go to **Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file as `serviceAccountKey.json` in `my-express-backend/` folder
6. **⚠️ IMPORTANT: Add `serviceAccountKey.json` to `.gitignore` (never commit this file!)**

### Step 5: Run the Migration

```bash
npm run migrate
```

This will:
1. Connect to Firestore
2. Read all documents from `users`, `apartments`, and `favorites` collections
3. Insert them into PostgreSQL
4. Map Firestore document IDs to `firebase_id` columns for tracking

**Progress Output Example:**
```
🚀 Starting Firestore to PostgreSQL migration...
✅ Successfully connected to PostgreSQL

🔄 Starting users migration...
✅ Users migration completed: 15 migrated, 0 skipped

🔄 Starting apartments migration...
✅ Apartments migration completed: 42 migrated, 0 skipped

🔄 Starting favorites migration...
✅ Favorites migration completed: 128 migrated, 0 skipped

✅ Migration completed successfully!
```

---

## 🚀 Starting the Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

Check if it's working:
```bash
curl http://localhost:3000/test-db
```

Expected response:
```json
{
  "message": "✅ متصل بقاعدة البيانات بنجاح!",
  "time": "2026-03-08T..."
}
```

---

## 📡 API Endpoints

### Apartments
- `GET /api/apartments` - Get all apartments (with filters)
- `GET /api/apartments/featured` - Get featured apartments
- `GET /api/apartments/:id` - Get apartment by ID
- `GET /api/apartments/landlord/:landlordId` - Get landlord's apartments
- `GET /api/apartments/wilaya/:wilayaId` - Get apartments by wilaya
- `POST /api/apartments` - Create new apartment
- `PUT /api/apartments/:id` - Update apartment
- `PATCH /api/apartments/:id/status` - Toggle active status
- `PATCH /api/apartments/:id/phone-click` - Increment phone clicks
- `DELETE /api/apartments/:id` - Delete apartment

### Users
- `GET /api/users` - Get all users (optional filter by type)
- `GET /api/users/:uid` - Get user by UID
- `POST /api/users` - Create/update user
- `PUT /api/users/:uid` - Update user details
- `DELETE /api/users/:uid` - Delete user

### Favorites
- `GET /api/favorites/:userId` - Get user's favorite apartment IDs
- `GET /api/favorites/:userId/apartments` - Get full apartment details for favorites
- `GET /api/favorites/:userId/check/:apartmentId` - Check if apartment is favorited
- `POST /api/favorites` - Add to favorites
- `DELETE /api/favorites/:userId/:apartmentId` - Remove from favorites
- `DELETE /api/favorites/remove/:id` - Remove favorite by ID

---

## 🔄 Updating React Frontend

After migration, update the React app to use the new PostgreSQL backend instead of Firestore.

### Example: Replace apartmentService.ts

**Before (Firestore):**
```typescript
export const getAllApartments = async (): Promise<FirebaseApartment[]> => {
  const q = query(collection(db, APARTMENTS_COLLECTION), where("isActive", "==", true));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FirebaseApartment[];
};
```

**After (PostgreSQL):**
```typescript
export const getAllApartments = async (): Promise<Apartment[]> => {
  const response = await fetch('http://localhost:3000/api/apartments');
  const data = await response.json();
  return data.apartments;
};
```

---

## ⚠️ Important Notes

1. **Firebase IDs Preserved**: The `firebase_id` column keeps track of original Firestore document IDs. This helps with data integrity and debugging.

2. **Timestamps**: Firestore Timestamps are converted to PostgreSQL TIMESTAMP format automatically.

3. **Arrays & Objects**: 
   - `images` array → stored as JSONB
   - `amenities` array → stored as JSONB
   - All JSON strings are properly escaped

4. **Foreign Keys**: 
   - `apartments.landlord_id` references `users.uid`
   - `favorites.user_id` references `users.uid`
   - `favorites.apartment_id` references `apartments.firebase_id`

5. **Indexes**: Created for frequently queried columns (landlord_id, wilaya_id, is_active, created_at, etc.)

---

## 🧪 Testing the Database

Connect to PostgreSQL to verify data:

```bash
psql -U postgres -d smartrent_db

-- Check users
SELECT * FROM users;

-- Check apartments
SELECT * FROM apartments;

-- Check favorites
SELECT * FROM favorites;

-- Count records
SELECT COUNT(*) FROM apartments;
```

---

## 📝 Environment Checklist

Before running migration:

- [ ] PostgreSQL installed and running
- [ ] `smartrent_db` database created
- [ ] `schema.sql` applied to database
- [ ] `.env` file configured with DB credentials
- [ ] `serviceAccountKey.json` downloaded from Firebase
- [ ] `serviceAccountKey.json` added to `.gitignore`
- [ ] `npm install` completed in `my-express-backend` folder

---

## 🐛 Troubleshooting

### "Cannot find module 'firebase-admin'"
```bash
npm install firebase-admin
```

### "ECONNREFUSED - Connection refused"
- Check if PostgreSQL is running
- Verify DB_HOST, DB_PORT, and DB_NAME in .env
- Test: `psql -U postgres -d smartrent_db`

### "Error: ENOENT: no such file or directory 'serviceAccountKey.json'"
- Download Firebase service account key from Firebase Console
- Save to `my-express-backend/` directory

### "Migration completes but no data inserted"
- Check if Firestore has data
- Verify Firebase credentials are correct
- Check PostgreSQL user has INSERT permissions

---

## 🎯 Next Steps

1. **Migrate Frontend**: Update React components to call PostgreSQL API instead of Firestore
2. **Authentication**: Implement JWT tokens for API authentication
3. **Error Handling**: Add comprehensive error handling in routes
4. **Validation**: Add input validation middleware
5. **Logging**: Implement request logging for debugging
6. **Deployment**: Deploy to cloud (AWS, Heroku, DigitalOcean, etc.)

---

For questions or issues, check the route files and schema for detailed implementation.

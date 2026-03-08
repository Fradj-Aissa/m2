# 🚀 GETTING STARTED CHECKLIST

Follow these steps in order to complete your Firebase → PostgreSQL migration.

---

## ✅ Pre-Migration Setup (Do This First!)

### Step 1: Prepare PostgreSQL
- [ ] Install PostgreSQL 12+ if not already installed
- [ ] Start PostgreSQL service
- [ ] Verify installation: `psql --version`

### Step 2: Create Database
```bash
# Open PostgreSQL prompt
psql -U postgres -h localhost

# In psql shell:
CREATE DATABASE smartrent_db;
\q
```

- [ ] Database `smartrent_db` created

### Step 3: Apply Database Schema
```bash
# From my-express-backend directory
psql -U postgres -d smartrent_db -f schema.sql
```

- [ ] Schema applied successfully
- [ ] Tables created: users, apartments, favorites

### Step 4: Get Firebase Service Account Key
1. [ ] Go to: https://console.firebase.google.com
2. [ ] Select project: `smartrent-bd358`
3. [ ] Navigate to: **Settings** → **Service Accounts**
4. [ ] Click: **Generate New Private Key**
5. [ ] Save file as: `my-express-backend/serviceAccountKey.json`
6. [ ] **IMPORTANT:** Add to `.gitignore` - NEVER commit this file!

### Step 5: Configure Environment Variables
```bash
cd my-express-backend
cp .env.example .env
```

Edit `.env` file:
```
DB_USER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE
DB_NAME=smartrent_db
PORT=3000
NODE_ENV=development
```

- [ ] `.env` file created and configured
- [ ] All PostgreSQL credentials filled in
- [ ] `serviceAccountKey.json` in project root

### Step 6: Install Dependencies
```bash
cd my-express-backend
npm install
```

- [ ] All packages installed successfully
- [ ] No installation errors

---

## 🔄 Migration Execution

### Step 7: Run Migration Script
```bash
npm run migrate
```

**Expected Output:**
```
🚀 Starting Firestore to PostgreSQL migration...
✅ Successfully connected to PostgreSQL

🔄 Starting users migration...
✅ Users migration completed: X migrated, 0 skipped

🔄 Starting apartments migration...
✅ Apartments migration completed: X migrated, 0 skipped

🔄 Starting favorites migration...
✅ Favorites migration completed: X migrated, 0 skipped

✅ Migration completed successfully!
```

- [ ] Migration completes without errors
- [ ] All data types migrated correctly
- [ ] No failed migrations

### Step 8: Verify Migration (Optional but Recommended)
```bash
# Connect to PostgreSQL
psql -U postgres -d smartrent_db

# Check record counts
SELECT COUNT(*) AS user_count FROM users;
SELECT COUNT(*) AS apartment_count FROM apartments;
SELECT COUNT(*) AS favorite_count FROM favorites;

# Check a sample record
SELECT * FROM users LIMIT 1;
SELECT * FROM apartments LIMIT 1;

# If satisfied, quit
\q
```

- [ ] User count matches Firestore collection
- [ ] Apartment count matches Firestore collection
- [ ] Favorite count matches Firestore collection
- [ ] Sample records look correct

---

## 🚀 Start Your Backend Server

### Step 9: Run Development Server
```bash
npm run dev
```

**Expected Output:**
```
🚀 السيرفر يعمل على: http://localhost:3000
```

- [ ] Server starts without errors
- [ ] Listening on port 3000

### Step 10: Test Server Connection
In a new terminal:

```bash
# Test database connection
curl http://localhost:3000/test-db

# Test health check
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "message": "✅ متصل بقاعدة البيانات بنجاح!",
  "time": "2026-03-08T10:30:45.123Z"
}
```

- [ ] `/test-db` responds successfully
- [ ] Database connection working

---

## 📡 Test API Endpoints

### Step 11: Test Apartments API
```bash
# Get all apartments
curl http://localhost:3000/api/apartments?limit=5

# Get featured apartments
curl http://localhost:3000/api/apartments/featured

# Get apartment by ID (replace ID with real ID from migration)
curl http://localhost:3000/api/apartments/[apartment_id]
```

- [ ] Apartment endpoints return data
- [ ] Pagination works correctly
- [ ] Filters work (wilayaId, rooms, etc.)

### Step 12: Test Users API
```bash
# Get all users
curl http://localhost:3000/api/users

# Get specific user
curl http://localhost:3000/api/users/[user_uid]
```

- [ ] User endpoints return data
- [ ] Can filter by user type (landlord/renter)

### Step 13: Test Favorites API
```bash
# Get user's favorite apartment IDs
curl http://localhost:3000/api/favorites/[user_uid]

# Get full apartment details for user's favorites
curl http://localhost:3000/api/favorites/[user_uid]/apartments
```

- [ ] Favorite endpoints return data
- [ ] Gets correct apartments for user

---

## 📝 Update Frontend (React)

Once backend is working, update your React app:

### Step 14: Update Firestore Service Imports
In `src/services/apartmentService.ts`:

**Old (Firestore):**
```typescript
import { collection, getDocs } from "firebase/firestore";
```

**New (API):**
```typescript
const API_URL = 'http://localhost:3000/api';
```

### Step 15: Replace API Calls
Example for `getAllApartments`:

**Old:**
```typescript
const querySnapshot = await getDocs(collection(db, "apartments"));
```

**New:**
```typescript
const response = await fetch(`${API_URL}/apartments`);
const data = await response.json();
return data.apartments;
```

- [ ] Replace Firestore calls with API calls
- [ ] Update environment for production API URL
- [ ] Test all CRUD operations
- [ ] Verify data displays correctly

### Step 16: Update Authentication (Optional)
Consider whether to keep Firebase Auth or move to backend JWT:

- [ ] Firebase Auth: Keep as-is, just update data layer
- [ ] Backend Auth: Implement JWT tokens in backend

---

## ✨ Final Verification

### Step 17: Full System Test
- [ ] Server running on http://localhost:3000
- [ ] Database connected and responding
- [ ] All 3 data types (apartments, users, favorites) accessible via API
- [ ] Frontend successfully loads data from new backend
- [ ] Create new apartment is stored in PostgreSQL
- [ ] Edit apartment updates PostgreSQL
- [ ] Delete apartment removes from PostgreSQL
- [ ] Add/remove favorites works correctly

---

## 🎯 Completion Markers

When you see all these checkmarks, you're ready:

```
✅ PostgreSQL installed and running
✅ Database schema applied
✅ Service account key configured
✅ Environment variables set
✅ Dependencies installed
✅ Migration script ran successfully
✅ Backend server running
✅ API endpoints responding
✅ Frontend updated with new API
✅ All CRUD operations working
✅ Data persists in PostgreSQL
```

---

## 🆘 Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| `psql: command not found` | Install PostgreSQL or add to PATH |
| `ECONNREFUSED - Cannot connect to DB` | Check PostgreSQL is running: `sudo service postgresql start` |
| `Error: ENOENT 'serviceAccountKey.json'` | Download and place service account file in project root |
| `Migration completes but no data` | Verify Firestore has data, check Firebase credentials |
| `Port 3000 already in use` | Change PORT in `.env` or kill process: `lsof -ti:3000 \| xargs kill -9` |
| `CORS errors in React` | Update API_URL in frontend after deployment |

---

## 📚 Documentation Reference

- **MIGRATION_GUIDE.md** - Detailed setup instructions
- **API_REFERENCE.md** - All API endpoints with examples
- **MIGRATION_SUMMARY.md** - What was created and why
- **schema.sql** - Database structure details

---

## 🎓 Key Files to Know About

| File | Purpose |
|------|---------|
| `schema.sql` | PostgreSQL table definitions |
| `migrate.js` | Firestore → PostgreSQL data transfer |
| `index.js` | Express server with route imports |
| `routes/apartments.js` | Apartment CRUD endpoints |
| `routes/users.js` | User management endpoints |
| `routes/favorites.js` | Favorites management endpoints |
| `.env` | Configuration (passwords, DB info) |
| `package.json` | Dependencies and scripts |

---

## ⏱️ Estimated Time

- Pre-migration setup: 15-20 minutes
- Running migration: 2-5 minutes
- Testing API: 10 minutes
- Frontend updates: 30-60 minutes (depends on app complexity)
- **Total: ~1-2 hours**

---

## 💡 Pro Tips

1. **Keep Firestore Running** - Don't delete Firestore data until production is stable
2. **Backup Database** - Create PostgreSQL backup before major changes
3. **Test in Staging** - Test everything on a separate database first
4. **Monitor Logs** - Watch server console for errors during testing
5. **Use API Tools** - Use Postman or Insomnia to test endpoints easily
6. **Keep Service Key Safe** - Never commit `serviceAccountKey.json` to git

---

## 🎉 You're All Set!

Once you've completed all steps, your migration is done!

**Next:**
- Deploy backend to production server
- Update React app API URLs to production
- Monitor error logs in production
- Celebrate! 🎊

---

**Last Updated:** March 8, 2026  
**Questions?** Refer to the detailed documentation files in the project.

# Frontend-Backend JWT Integration - Quick Reference

## 📋 What Changed

### Frontend (smartrentdz)
- ✅ Replaced Firebase Auth with JWT tokens
- ✅ Replaced Fetch API with Axios (automatic token injection)
- ✅ Uses localStorage for token persistence
- ✅ Same user experience, different backend

### Backend (my-express-backend)
- ✅ New `/api/auth` endpoints (login, register, verify)
- ✅ JWT token generation with 7-day expiration
- ✅ bcrypt password hashing
- ✅ Protected routes with authMiddleware
- ✅ PostgreSQL stores passwords and user data

---

## 🔐 How It Works

### 1️⃣ **User Registration**
```
Frontend: 
  POST /register → {email, password, name, phone, type}
         ↓
Backend:
  - Hash password
  - Create user in PostgreSQL
  - Generate JWT token
  - Return {token, user}
         ↓
Frontend:
  - Save token to localStorage
  - Redirect to /dashboard
```

### 2️⃣ **User Login**
```
Frontend:
  POST /login → {email, password}
         ↓
Backend:
  - Find user
  - Compare password
  - Generate JWT token
  - Return {token, user}
         ↓
Frontend:
  - Save token to localStorage
  - Redirect to /dashboard
```

### 3️⃣ **Protected Requests**
```
Frontend:
  axios.post('/apartments', data)
         ↓
Interceptor:
  Authorization: Bearer <token from localStorage>
         ↓
Backend:
  - Verify token
  - If valid → execute
  - If invalid → 401 error → user redirected to /login
```

---

## 🧪 How to Test

### Test Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "phone": "+213123456789",
    "type": "landlord"
  }'
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "uid": "user_1709994023_abc123",
    "email": "test@example.com",
    "name": "Test User",
    "phone": "+213123456789",
    "type": "landlord",
    "created_at": "2026-03-10T12:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Protected Route (Create Apartment)
```bash
curl -X POST http://localhost:3000/api/apartments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "title": "Beautiful Apartment",
    "description": "...",
    "images": [],
    "price": 50000,
    "priceUnit": "month",
    "wilaya": "Algiers",
    "wilayaId": 16,
    "municipality": "Algiers Center",
    "rooms": 2,
    "bathrooms": 1,
    "area": 80,
    "landlordId": "user_123",
    "landlordPhone": "+213123456789",
    "landlordName": "Test User"
  }'
```

---

## 🗂️ Project Structure

### Backend Authentication
```
my-express-backend/
├── routes/
│   ├── auth.js          ← NEW: /register, /login, /verify
│   └── apartments.js    ← UPDATED: Protected with authMiddleware
├── middleware/
│   └── authMiddleware.js ← NEW: JWT verification
├── .env                 ← UPDATED: JWT_SECRET
└── schema.sql           ← UPDATED: password column in users
```

### Frontend Authentication
```
smartrentdz/
├── src/
│   ├── lib/
│   │   ├── api.ts                ← UPDATED: Axios + interceptors
│   │   └── firebase.ts           ← NOT USED FOR AUTH
│   ├── contexts/
│   │   └── AuthContext.tsx       ← REFACTORED: JWT instead of Firebase
│   └── pages/
│       ├── Login.tsx             ← UPDATED: Error handling
│       └── Register.tsx          ← UPDATED: Error handling
└── package.json         ← UPDATED: Added axios
```

---

## 🔑 Key Concepts

### JWT Token Structure
```
Header.Payload.Signature

Payload contains:
{
  uid: "user_1709994023_abc123",
  email: "user@example.com",
  iat: 1709994023,
  exp: 1710598823  (7 days later)
}
```

### localStorage Keys
```javascript
localStorage.authToken   // JWT token
localStorage.userData    // Stringified user object
```

### HTTP Headers
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

---

## ✅ Checklist: What Works

- ✅ User Registration
- ✅ User Login
- ✅ Session Persistence (refresh page)
- ✅ Token Auto-injection via Interceptor
- ✅ Protected Routes (apartments CRUD)
- ✅ Image Upload (with auth)
- ✅ Logout + Clear localStorage
- ✅ Auto-redirect on token expiration
- ✅ Error Messages from Backend

---

## ⚠️ Known Limitations

- Settings page still references Firebase (updatePassword, delete account)
- No password reset functionality yet
- No token refresh (tokens expire in 7 days)
- No 2FA support
- Tokens stored in localStorage (use httpOnly cookies in production)

---

## 🚀 Next Features (Optional)

1. **Password Reset**
   - POST /api/auth/forgot-password
   - POST /api/auth/reset-password

2. **Token Refresh**
   - Backend generates refresh + access tokens
   - Implement token refresh middleware

3. **Change Password**
   - POST /api/auth/change-password (requires current password)

4. **Delete Account**
   - DELETE /api/auth/account (cascade delete from PostgreSQL)

---

## 🐛 Troubleshooting

### Issue: "Missing or invalid Authorization header"
**Solution:** Make sure token is saved in localStorage.authToken after login

### Issue: "Invalid or expired token"
**Solution:** Token may have expired (7 days). User needs to login again.

### Issue: Frontend shows blank page after login
**Solution:** Check that React Router redirects to /dashboard properly. Verify AuthProvider wraps entire app.

### Issue: Backend returns "Email already registered"
**Solution:** User with that email already exists in PostgreSQL. Use different email or login.

### Issue: "Password must be at least 6 characters"
**Solution:** Frontend validation should check this before sending, but backend also enforces it.

---

## 📞 Support

For questions about:
- **Backend JWT**: See my-express-backend/routes/auth.js
- **Frontend Auth**: See smartrentdz/src/contexts/AuthContext.tsx
- **API Integration**: See smartrentdz/src/lib/api.ts
- **Middleware**: See my-express-backend/middleware/authMiddleware.js

---

**Last Updated:** March 10, 2026
**Version:** 1.0.0 - JWT Complete

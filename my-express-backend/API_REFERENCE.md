# API Quick Reference

## Base URL
```
http://localhost:3000/api
```

---

## 🏢 Apartments API

### Get All Apartments
```
GET /apartments
```

**Query Parameters:**
- `limit` (default: 50) - Items per page
- `offset` (default: 0) - Pagination offset
- `wilayaId` - Filter by wilaya
- `rooms` - Filter by room count
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `priceUnit` - 'day' | 'week' | 'month'
- `isFeatured` - 'true' | 'false'

**Example:**
```bash
GET /apartments?wilayaId=16&rooms=2&minPrice=50000&maxPrice=200000&priceUnit=month&limit=20&offset=0
```

### Get Featured Apartments
```
GET /apartments/featured
```

### Get Apartment by ID
```
GET /apartments/:id
```

### Get Apartments by Landlord
```
GET /apartments/landlord/:landlordId
```

### Get Apartments by Wilaya
```
GET /apartments/wilaya/:wilayaId
```

### Create Apartment
```
POST /apartments
```

**Body:**
```json
{
  "title": "Apartment title",
  "description": "Full description",
  "images": ["url1", "url2"],
  "price": 150000,
  "priceUnit": "month",
  "wilaya": "Algiers",
  "wilayaId": 16,
  "municipality": "New Town",
  "rooms": 2,
  "bathrooms": 1,
  "area": 85.5,
  "amenities": ["wifi", "parking", "kitchen"],
  "isFeatured": false,
  "isActive": true,
  "landlordId": "user_uid",
  "landlordPhone": "+213612345678",
  "landlordName": "John Doe"
}
```

### Update Apartment
```
PUT /apartments/:id
```

**Body:** (send only fields to update)
```json
{
  "price": 160000,
  "isFeatured": true,
  "description": "Updated description"
}
```

### Toggle Active Status
```
PATCH /apartments/:id/status
```

**Body:**
```json
{
  "isActive": false
}
```

### Increment Phone Clicks
```
PATCH /apartments/:id/phone-click
```

### Delete Apartment
```
DELETE /apartments/:id
```

---

## 👤 Users API

### Get All Users
```
GET /users
```

**Query Parameters:**
- `type` - 'renter' | 'landlord'

### Get User by UID
```
GET /users/:uid
```

### Create/Update User
```
POST /users
```

**Body:**
```json
{
  "uid": "firebase_uid",
  "email": "user@example.com",
  "name": "User Name",
  "phone": "+213612345678",
  "type": "landlord"
}
```

### Update User
```
PUT /users/:uid
```

**Body:** (at least one field required)
```json
{
  "name": "New Name",
  "phone": "+213612345678",
  "type": "renter"
}
```

### Delete User
```
DELETE /users/:uid
```

---

## ❤️ Favorites API

### Get User's Favorite IDs
```
GET /favorites/:userId
```

**Returns:** Array of apartment IDs
```json
["apto_id_1", "apto_id_2"]
```

### Get User's Favorite Apartments (with details)
```
GET /favorites/:userId/apartments
```

**Returns:** Full apartment objects

### Check if Apartment is Favorited
```
GET /favorites/:userId/check/:apartmentId
```

**Returns:**
```json
{
  "isFavorited": true,
  "favoriteId": "uuid"
}
```

### Add to Favorites
```
POST /favorites
```

**Body:**
```json
{
  "userId": "user_uid",
  "apartmentId": "apartment_firebase_id"
}
```

### Remove from Favorites
```
DELETE /favorites/:userId/:apartmentId
```

### Remove Favorite by ID
```
DELETE /favorites/remove/:id
```

---

## Response Formats

### Success Response
```json
{
  "id": "uuid",
  "title": "...",
  "...": "..."
}
```

### Error Response
```json
{
  "error": "Error message description"
}
```

### Paginated Response (Apartments)
```json
{
  "apartments": [
    { "id": "...", "..." },
    { "id": "...", "..." }
  ],
  "pagination": {
    "total": 125,
    "limit": 20,
    "offset": 0,
    "pages": 7
  }
}
```

---

## Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Request successful, no content to return
- `400 Bad Request` - Invalid input
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Example cURL Requests

### Get all apartments in Algiers
```bash
curl "http://localhost:3000/api/apartments?wilayaId=16&limit=10"
```

### Create apartment
```bash
curl -X POST http://localhost:3000/api/apartments \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Beautiful 2BR Apartment",
    "description": "In the heart of the city",
    "images": ["https://..."],
    "price": 150000,
    "priceUnit": "month",
    "wilaya": "Algiers",
    "wilayaId": 16,
    "municipality": "Downtown",
    "rooms": 2,
    "bathrooms": 1,
    "area": 85,
    "amenities": ["wifi", "parking"],
    "landlordId": "uid123",
    "landlordPhone": "+213612345678",
    "landlordName": "Ahmed Hassan"
  }'
```

### Add to favorites
```bash
curl -X POST http://localhost:3000/api/favorites \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_uid",
    "apartmentId": "apartment_firebase_id"
  }'
```

### Remove from favorites
```bash
curl -X DELETE http://localhost:3000/api/favorites/user_uid/apartment_firebase_id
```

---

## Database Column Reference

### apartments table
- `id` (UUID) - Primary key
- `firebase_id` (VARCHAR) - Original Firestore ID
- `title`, `description` - Text fields
- `images`, `amenities` - JSONB arrays
- `price` - NUMERIC (decimal)
- `price_unit` - VARCHAR ('day'|'week'|'month')
- `wilaya`, `municipality` - VARCHAR
- `wilaya_id` - INTEGER
- `rooms`, `bathrooms` - INTEGER
- `area` - NUMERIC
- `is_featured`, `is_active` - BOOLEAN
- `views`, `phone_clicks` - INTEGER (counters)
- `landlord_id` - VARCHAR (FK → users.uid)
- `landlord_phone`, `landlord_name` - VARCHAR
- `status` - VARCHAR ('approved'|'pending'|'rejected')
- `created_at`, `updated_at` - TIMESTAMP

### users table
- `uid` (VARCHAR) - Primary key
- `firebase_id` (VARCHAR) - Original Firestore UID
- `email` - VARCHAR (UNIQUE)
- `name`, `phone` - VARCHAR
- `type` - VARCHAR ('renter'|'landlord')
- `created_at`, `updated_at` - TIMESTAMP

### favorites table
- `id` (UUID) - Primary key
- `firebase_id` (VARCHAR) - Original Firestore ID
- `user_id` (VARCHAR) - FK → users.uid
- `apartment_id` (VARCHAR) - FK → apartments.firebase_id
- `created_at` - TIMESTAMP

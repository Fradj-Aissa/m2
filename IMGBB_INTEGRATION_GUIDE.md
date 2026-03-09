# ImgBB Image Upload Integration Guide

## 📋 Overview

This guide documents the migration from Firebase Storage / Cloudinary to **ImgBB API v1** for image uploads in the SmartRent project.

### What Changed

| Component | Before | After |
|-----------|--------|-------|
| **Image Hosting** | Cloudinary / Firebase Storage | ImgBB API |
| **Upload Location** | Frontend (React) | Backend (Express.js) |
| **File Processing** | Browser FormData to Cloudinary | Multer memory storage → Base64 → ImgBB |
| **Data Storage** | URLs in PostgreSQL JSONB | URLs in PostgreSQL JSONB (same) |

---

## 🔧 Backend Setup

### 1. Environment Configuration

Add the ImgBB API key to `.env`:

```env
IMGBB_API_KEY=2b9649d3f37e8e3d0e022476f7772eea
```

Or use the `.env.example` template and update with your own API key:

```bash
cp .env.example .env
```

### 2. Install Dependencies

Dependencies are already installed (added earlier):
```bash
npm install multer axios
```

- **multer** - Handles multipart file uploads in Express
- **axios** - HTTP client for ImgBB API requests

### 3. Image Upload Endpoint

**Route:** `POST /api/apartments/upload-images`

**Request Format:**
```
Content-Type: multipart/form-data
Field name: images
Field value: Multiple File objects
```

**Request Example (cURL):**
```bash
curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  http://localhost:3000/api/apartments/upload-images
```

**Response Format:**
```json
{
  "urls": [
    "https://i.ibb.co/w9m7nV1/image1.jpg",
    "https://i.ibb.co/K7d8nV2/image2.jpg"
  ]
}
```

**How It Works (Backend Flow):**

```
1. Frontend sends File objects via FormData
   ↓
2. Multer captures files in memory (buffer)
   ↓
3. For each file:
   - Convert buffer to Base64
   - Send Base64 string + API key to ImgBB API
   - Extract `data.url` from ImgBB response
   ↓
4. Return array of ImgBB URLs to frontend
   ↓
5. Frontend saves URLs to PostgreSQL `apartments.images` (JSONB)
```

---

## 🎨 Frontend Implementation

### 1. Cloud Image Service

**File:** `src/services/cloudinaryService.ts`

Updated to upload through the backend:

```typescript
/**
 * Upload multiple images to ImgBB via Express backend
 */
export const uploadMultipleToCloudinary = async (
  files: File[],
  folder: string,
  subfolder?: string
): Promise<string[]> => {
  // Create FormData with files
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("images", file);
  });

  // Send to backend endpoint
  const response = await fetch(`${API_BASE_URL}/apartments/upload-images`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  return data.urls;
};
```

**Key Points:**
- Function name remains `uploadMultipleToCloudinary` for backward compatibility
- Sends raw File objects (not Base64)
- Backend converts to Base64 and uploads to ImgBB
- Returns array of ImgBB URLs

### 2. Add Apartment Component

**File:** `src/pages/AddApartment.tsx`

Updated imports and usage:

```typescript
import { createApartment } from "@/services/apartmentService";
import { uploadMultipleToCloudinary } from "@/services/cloudinaryService";

// In handleSubmit:
const imageUrls = await uploadMultipleToCloudinary(
  imageFiles,
  'apartments',
  currentUser.uid
);

// Then create apartment with URLs
await createApartment({
  title: formData.title,
  description: formData.description,
  images: imageUrls,  // Array of ImgBB URLs
  // ... other fields
});
```

### 3. Edit Apartment Component

**File:** `src/pages/EditApartment.tsx`

Same pattern as AddApartment when updating images.

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                           │
│  AddApartment.tsx / EditApartment.tsx                       │
│  - User selects image files                                 │
│  - Calls uploadMultipleToCloudinary(files)                  │
└────────────────┬────────────────────────────────────────────┘
                 │ multipart/form-data (raw Files)
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                  Express Backend                            │
│  POST /api/apartments/upload-images                         │
│  - Multer receives files in memory                          │
│  - Convert each buffer to Base64 string                     │
│  - Send Base64 to ImgBB API with API key                    │
│  - Extract `.data.url` from ImgBB response                  │
│  - Return array of ImgBB URLs                               │
└────────────────┬────────────────────────────────────────────┘
                 │ JSON array of URLs
                 ↓
┌─────────────────────────────────────────────────────────────┐
│              Frontend (continues)                           │
│  - Receives array of ImgBB URLs                             │
│  - Passes to createApartment() function                     │
│  - API saves URLs to PostgreSQL JSONB                       │
└────────────────┬────────────────────────────────────────────┘
                 │ SQL INSERT
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                        │
│  apartments table:                                          │
│  - images column (JSONB type)                               │
│  - Stores: ["https://i.ibb.co/...", ...]                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### 1. Test the Backend Endpoint

Create a simple test with sample images:

```bash
# Using curl
curl -X POST \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  http://localhost:3000/api/apartments/upload-images
```

Or use the provided test script:

```bash
cd my-express-backend
npm install form-data  # if not already installed
node test-imgbb-upload.js
```

### 2. Test the Frontend

1. Start the React app:
   ```bash
   cd smartrentdz
   npm run dev
   ```

2. Navigate to **Add Apartment** page

3. Upload test images

4. Check browser console for network requests

5. Verify images were uploaded to ImgBB:
   - Check if response contains valid `https://i.ibb.co/...` URLs
   - Verify URLs are accessible

6. Check PostgreSQL to confirm URLs are saved:
   ```sql
   SELECT id, title, images FROM apartments ORDER BY created_at DESC LIMIT 1;
   ```

### 3. Troubleshooting

**Issue:** 400 Bad Request
- Check if `IMGBB_API_KEY` is set in `.env`
- Verify API key is active at https://imgbb.com

**Issue:** Upload fails silently
- Check browser console for fetch errors
- Check backend logs for ImgBB API response details
- Ensure files are valid image formats

**Issue:** URLs not saving to database
- Verify PostgreSQL `apartments.images` column accepts JSONB
- Check apartment creation request payload includes image URLs
- Verify API call to `/api/apartments` is successful

---

## 🔐 Security Considerations

### API Key Management
- ✅ Store `IMGBB_API_KEY` in `.env` (on backend)
- ✅ Include `.env` in `.gitignore`
- ❌ Never expose API key in frontend code
- ❌ Never commit `serviceAccountKey.json` to git

### File Upload Validation
- Multer limits file size (configurable per project needs)
- Validate file types on backend before uploading to ImgBB
- Consider adding image processing (resize, optimize) before upload

### Database Storage
- PostgreSQL JSONB safely stores URL strings
- No PII or sensitive data in image URLs
- URLs are public (ImgBB doesn't require authentication to view)

---

## 📈 Performance Notes

### Advantages Over Previous Setup
1. **Faster Uploads** - Backend uploads in parallel to ImgBB
2. **No Frontend Processing** - Browser doesn't need to encode/compress images
3. **Simple Integration** - Multer handles multipart parsing
4. **Reliable** - ImgBB is dedicated image hosting service

### Limitations
1. **ImgBB Free Tier** - Limited storage and upload frequency
2. **No Real-time Deletion** - Free tier doesn't support API deletion
3. **Manual Cleanup** - Old images must be deleted manually from ImgBB dashboard

---

## 🔄 Future Improvements

1. **Image Optimization**
   ```javascript
   // Add image compression before ImgBB upload
   const sharp = require('sharp');
   const optimized = await sharp(file.buffer).resize(1200, 800).toBuffer();
   ```

2. **Detailed Error Handling**
   - Log failed uploads for monitoring
   - Send detailed error messages to frontend

3. **Paid Tier Features**
   - Implement API-based deletion for old images
   - Add image expiration handling

4. **CDN Integration**
   - Cache ImgBB URLs with a CDN like Cloudflare
   - Reduce response times for frequently accessed images

---

## ✅ Checklist

- [x] Add `IMGBB_API_KEY` to `.env`
- [x] Update `routes/apartments.js` with upload endpoint
- [x] Install `multer` and `axios` dependencies
- [x] Update `cloudinaryService.ts` to use backend endpoint
- [x] Update `AddApartment.tsx` to send files to backend
- [x] Update `EditApartment.tsx` to send files to backend
- [x] Remove Firebase Storage references (already done)
- [x] Test image upload flow
- [ ] Monitor ImgBB account for upload limits
- [ ] Document in team knowledge base
- [ ] Train team on new upload flow

---

## 📚 Resources

- **ImgBB API Docs:** https://api.imgbb.com/
- **Multer Docs:** https://github.com/expressjs/multer
- **Axios Docs:** https://axios-http.com/
- **PostgreSQL JSONB:** https://www.postgresql.org/docs/current/datatype-json.html

---

**Last Updated:** March 9, 2026
**Version:** 1.0.0

# User Profile Management - API Contract & Specifications

## API Endpoints Reference

### Base URL
```
Backend: http://localhost:3000/api
Frontend: Configured in VITE_API_URL
```

---

## Authentication
All endpoints (except public endpoints) require JWT token:
```
Headers: Authorization: Bearer <JWT_TOKEN>
```

---

## 1. AVATAR UPLOAD

### Endpoint
```
PATCH /users/{uid}/avatar
```

### Authentication
✅ Required (Bearer Token)

### Request
```
Content-Type: multipart/form-data

Form Data:
- image (File) - Required
  - Type: image/* (JPG, PNG, GIF)
  - Size: Max 5MB
  - Name: "image" (form field name)
```

### Response (200 OK)
```json
{
  "message": "Avatar uploaded successfully",
  "user": {
    "uid": "user_abc123",
    "email": "user@example.com",
    "name": "Ahmed",
    "phone": "0541234567",
    "profile_image": "https://i.ibb.co/abc123/avatar.jpg",
    "avatar": null,
    "type": "renter",
    "created_at": "2026-04-20T10:00:00Z"
  },
  "imageUrl": "https://i.ibb.co/abc123/avatar.jpg"
}
```

### Errors
```json
// 400 - No file provided
{ "error": "No image file provided" }

// 400 - Invalid file type
{ "error": "Only image files are allowed" }

// 403 - Unauthorized
{ "error": "Unauthorized to update this user's avatar" }

// 404 - User not found
{ "error": "User not found" }

// 500 - Upload failed
{ "error": "Failed to upload image to ImgBB" }
```

### Example (cURL)
```bash
curl -X PATCH http://localhost:3000/api/users/user_123/avatar \
  -H "Authorization: Bearer eyJ..." \
  -F "image=@/path/to/avatar.jpg"
```

### Example (JavaScript)
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch('/api/users/user_123/avatar', {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const data = await response.json();
console.log(data.imageUrl); // https://i.ibb.co/...
```

---

## 2. CHANGE PASSWORD

### Endpoint
```
POST /auth/change-password
```

### Authentication
✅ Required (Bearer Token)

### Request
```json
{
  "currentPassword": "string (6+ chars)",
  "newPassword": "string (6+ chars)"
}
```

### Validation Rules
- `currentPassword`: Required, must match existing password
- `newPassword`: Required, 6+ characters, cannot equal currentPassword

### Response (200 OK)
```json
{
  "message": "Password changed successfully",
  "user": {
    "uid": "user_abc123",
    "email": "user@example.com",
    "name": "Ahmed"
  }
}
```

### Errors
```json
// 400 - Missing fields
{ "error": "Missing required fields: currentPassword, newPassword" }

// 400 - Password too short
{ "error": "New password must be at least 6 characters long" }

// 400 - Same password
{ "error": "New password must be different from current password" }

// 400 - No password set
{ "error": "User does not have a password set. Please complete your profile first." }

// 401 - Wrong current password
{ "error": "Current password is incorrect" }

// 404 - User not found
{ "error": "User not found" }
```

### Example (cURL)
```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "oldpass123",
    "newPassword": "newpass456"
  }'
```

### Example (JavaScript)
```javascript
import { apiPost } from "@/lib/api";

const response = await apiPost('/auth/change-password', {
  currentPassword: 'oldpass123',
  newPassword: 'newpass456'
});

console.log(response.message); // "Password changed successfully"
```

---

## 3. DELETE ACCOUNT

### Endpoint
```
DELETE /auth/account
```

### Authentication
✅ Required (Bearer Token)

### Request
```json
{
  "password": "string (user's password)"
}
```

### Validation Rules
- `password`: Required, must match user's current password
- User must have password set

### Response (200 OK)
```json
{
  "message": "Account deleted successfully",
  "deletedUser": {
    "uid": "user_abc123",
    "email": "user@example.com"
  }
}
```

### Errors
```json
// 400 - Missing password
{ "error": "Password is required for account deletion confirmation" }

// 400 - No password set
{ "error": "Cannot delete account. User does not have a password set." }

// 401 - Wrong password
{ "error": "Password is incorrect" }

// 404 - User not found
{ "error": "Failed to delete user" }
```

### Important Notes
- ⚠️ This is irreversible
- All user data will be deleted
- Associated apartments deleted (cascade)
- User will be automatically logged out
- Frontend should redirect to home page

### Example (cURL)
```bash
curl -X DELETE http://localhost:3000/api/auth/account \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{ "password": "userpassword123" }'
```

### Example (JavaScript)
```javascript
import { apiDelete } from "@/lib/api";

const response = await apiDelete('/auth/account', {
  data: { password: 'userpassword123' }
});

console.log(response.message); // "Account deleted successfully"
// Clear storage and logout
localStorage.clear();
window.location.href = '/';
```

---

## 4. UPDATE PHONE NUMBER

### Endpoint
```
PATCH /users/{uid}/phone
```

### Authentication
✅ Required (Bearer Token)

### Request
```json
{
  "phone": "string (Algerian format)"
}
```

### Phone Format (Algerian)
Valid formats:
- `0541234567` - Domestic
- `0641234567` - Domestic
- `0741234567` - Domestic
- `+213541234567` - International
- `+213 541 234 567` - International with spaces

Regex: `/^(?:\+213|0)[5-7]\d{8}$/`

### Response (200 OK)
```json
{
  "message": "Phone number updated successfully",
  "user": {
    "uid": "user_abc123",
    "email": "user@example.com",
    "name": "Ahmed",
    "phone": "0541234567",
    "type": "renter",
    "created_at": "2026-04-20T10:00:00Z"
  }
}
```

### Errors
```json
// 400 - Missing phone
{ "error": "Phone number is required" }

// 400 - Invalid format
{ "error": "Invalid phone number. Algerian numbers must start with 05, 06, or 07" }

// 403 - Unauthorized
{ "error": "Unauthorized to update this user's phone" }

// 404 - User not found
{ "error": "User not found" }
```

### Example (cURL)
```bash
curl -X PATCH http://localhost:3000/api/users/user_123/phone \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{ "phone": "0541234567" }'
```

### Example (JavaScript)
```javascript
import { apiPatch } from "@/lib/api";

const response = await apiPatch('/users/user_123/phone', {
  phone: '0541234567'
});

console.log(response.user.phone); // "0541234567"
```

---

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes
| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Missing fields, validation failed |
| 401 | Unauthorized | Invalid/expired token, wrong password |
| 403 | Forbidden | User not authorized for this action |
| 404 | Not Found | User/resource doesn't exist |
| 500 | Server Error | Internal server error |

### Frontend Error Handling Pattern
```typescript
try {
  const response = await apiPatch('/auth/change-password', data);
  toast({ title: "Success", description: response.message });
} catch (error: any) {
  const errorMsg = error.response?.data?.error || 'Unknown error';
  toast({ title: "Error", description: errorMsg, variant: "destructive" });
}
```

---

## Request/Response Formats

### Content Types
```
Request:
- application/json (for JSON bodies)
- multipart/form-data (for file uploads)

Response:
- application/json (all endpoints)
```

### Header Requirements
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json (or multipart/form-data for file uploads)
```

---

## Rate Limiting
Currently no rate limiting implemented. Consider adding:
- Max 5 avatar uploads per 24 hours
- Max 3 password change attempts per 24 hours
- Max 1 account deletion per user (non-revertable)

---

## Security Considerations

### Password Security
- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ Never returned in API responses
- ✅ Current password verified before changes
- ✅ Minimum 6 characters required

### Avatar Security
- ✅ File type validation (images only)
- ✅ File size limit (5MB max)
- ✅ Hosted on ImgBB (external CDN)
- ✅ User can only update own avatar

### Account Deletion
- ✅ Password confirmation required
- ✅ Cascading delete for related data
- ✅ Complete data wipe
- ✅ Automatic logout

### Phone Validation
- ✅ Format validation
- ✅ Country-specific rules
- ✅ No sensitive data exposure

---

## Testing Endpoints

### Postman Collection
```json
{
  "info": {
    "name": "User Profile Management",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Upload Avatar",
      "request": {
        "method": "PATCH",
        "url": "{{base_url}}/users/{{uid}}/avatar",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }]
      }
    },
    {
      "name": "Change Password",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/auth/change-password",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "body": {
          "mode": "raw",
          "raw": "{ \"currentPassword\": \"old\", \"newPassword\": \"new\" }"
        }
      }
    },
    {
      "name": "Delete Account",
      "request": {
        "method": "DELETE",
        "url": "{{base_url}}/auth/account",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "body": {
          "mode": "raw",
          "raw": "{ \"password\": \"password123\" }"
        }
      }
    },
    {
      "name": "Update Phone",
      "request": {
        "method": "PATCH",
        "url": "{{base_url}}/users/{{uid}}/phone",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "body": {
          "mode": "raw",
          "raw": "{ \"phone\": \"0541234567\" }"
        }
      }
    }
  ]
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-26 | Initial release |

---

## Support & Questions

For issues or questions, check:
1. Implementation guide: `USER_PROFILE_MANAGEMENT_GUIDE.md`
2. Repository memory: `/memories/repo/user-profile-management-system.md`
3. Frontend code: `smartrentdz/src/pages/Settings.tsx`
4. Backend code: `my-express-backend/routes/{users,auth}.js`

Generated: April 26, 2026
Last Updated: April 26, 2026

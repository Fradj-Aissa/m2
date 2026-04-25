# Admin Middleware Implementation Guide

## نظرة عامة

تم تطوير نظام admin middleware ذكي يقوم بـ:
1. البحث عن المستخدم في قاعدة البيانات
2. التحقق من الـ role الحالي
3. مقارنة البريد الإلكتروني مع `ADMIN_EMAIL` من البيئة
4. ترقية المستخدم تلقائياً إلى admin إذا تطابق البريد
5. السماح أو رفع الطلب بناءً على النتيجة

---

## التغييرات الرئيسية

### 1. **Middleware File: `middleware/isAdmin.js`**

#### السلوك الجديد:

```javascript
// في حالة وجود ADMIN_EMAIL في البيئة:
if (userEmail === process.env.ADMIN_EMAIL && userRole !== 'admin') {
  // تحديث المستخدم إلى admin
  UPDATE users SET role = 'admin' WHERE uid = $1
  
  // السماح بالدخول
  next()
}
```

#### مخطط القرار (Decision Flow):

```
User Request to Protected Route
         ↓
   Is User Authenticated?
   ├── NO  → Return 401
   └── YES ↓
   
   Get User from Database
   ├── Not Found → Return 404
   └── Found ↓
   
   Is User Already Admin (role = 'admin')?
   ├── YES → Return next() ✅
   └── NO ↓
   
   Is ADMIN_EMAIL Set?
   ├── NO  → Return 403 ⚠️
   └── YES ↓
   
   Does Email Match ADMIN_EMAIL?
   ├── NO  → Return 403 ❌
   └── YES ↓
   
   Promote User to Admin
   (UPDATE users SET role = 'admin')
   
   Return next() ✅
```

### 2. **Database Schema Changes**

#### جدول Users - عمود جديد:
```sql
ALTER TABLE users
ADD COLUMN role VARCHAR(50) DEFAULT NULL CHECK (role IN ('admin', NULL));
```

**الخصائص:**
- `NULL` = مستخدم عادي
- `'admin'` = مسؤول النظام
- يتم تعيينه تلقائياً عند تطابق البريد الإلكتروني

#### Prisma Model:
```prisma
model User {
  // ... existing fields
  role            String?        @default(null)
  // ... other fields
}
```

### 3. **Migration File: `migrations/add_role_column_to_users.js`**

تم إنشاء migration تلقائي لإضافة العمود إلى قاعدة البيانات الموجودة:
```bash
node database/init-db.js
# أو
npx prisma migrate deploy
```

---

## المتطلبات البيئية

### في ملف `.env`:

```env
# البريد الإلكتروني للمسؤول الأساسي
ADMIN_EMAIL=admin@smartrent.com

# باقي المتطلبات
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_key
# ... إلخ
```

**ملاحظة مهمة:** يجب تعيين `ADMIN_EMAIL` حتى يعمل الـ middleware الجديد بشكل صحيح.

---

## كيفية الاستخدام

### 1. تحديث قاعدة البيانات (أول مرة)

```bash
# تطبيق جميع migrations
node database/init-db.js
```

### 2. في Route Files:

```javascript
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');

// حماية المسار بـ authentication ثم admin check
router.get('/admin/stats', authMiddleware, isAdmin, async (req, res) => {
  // هنا يكون المستخدم بالفعل admin أو تم ترقيته للتو
  res.json({ stats: 'admin only' });
});
```

### 3. اختبار الـ Middleware:

```bash
# تشغيل script الاختبار
node test-admin-middleware.js
```

---

## حالات الاستخدام

### Case 1: مستخدم عادي يحاول الوصول

```
Request Headers:
Authorization: Bearer <token_for_regular_user>

User Email: user@example.com
ADMIN_EMAIL: admin@smartrent.com

Result: 403 Forbidden
Reason: Email does not match ADMIN_EMAIL
```

### Case 2: المسؤول الأول يحاول الوصول

```
Request Headers:
Authorization: Bearer <token_for_admin>

User Email: admin@smartrent.com
ADMIN_EMAIL: admin@smartrent.com
Current Role: NULL

Database Query:
SELECT uid, email, role FROM users WHERE uid = $1
Result: { uid: '...', email: 'admin@smartrent.com', role: NULL }

Action Taken:
UPDATE users SET role = 'admin' WHERE uid = $1

Result: 200 OK ✅
Message: Access Granted
```

### Case 3: مسؤول مُسجل مسبقاً يحاول الوصول

```
Request Headers:
Authorization: Bearer <token_for_admin>

Current Role: 'admin'

Action: Direct Access (no database update needed)
Result: 200 OK ✅
```

---

## Logs والرسائل

### في Console Logs:

```
✅ Promoting user@example.com to admin role
🎉 User user@example.com is now admin and access granted
🚫 Admin access denied for user@example.com (expected: admin@smartrent.com)
⚠️ ADMIN_EMAIL environment variable is not set
```

### استجابات الخطأ:

#### 401 Unauthorized
```json
{
  "error": "User not authenticated"
}
```

#### 403 Forbidden - Email Mismatch
```json
{
  "error": "Access denied: Admin role required",
  "details": "Email does not match admin email"
}
```

#### 403 Forbidden - Missing ADMIN_EMAIL
```json
{
  "error": "Access denied: Admin role required",
  "details": "ADMIN_EMAIL not configured"
}
```

#### 404 Not Found
```json
{
  "error": "User not found"
}
```

---

## التدفق الكامل للطلب

```
1. User makes request to /api/admin/stats with Bearer token
   ↓
2. authMiddleware validates token and sets req.user
   ↓
3. isAdmin middleware:
   a. Checks if user is authenticated (req.user.uid exists)
   b. Queries database: SELECT uid, email, role FROM users WHERE uid = $1
   c. If role = 'admin' → next()
   d. If role != 'admin':
      - Check if ADMIN_EMAIL is set
      - Compare user.email with ADMIN_EMAIL
      - If match: UPDATE users SET role = 'admin'
      - If no match: Return 403 Forbidden
   ↓
4. Route handler executes with admin user context
```

---

## الفوائس

✅ **أمان محسّن** - التحقق من البريد الإلكتروني من البيئة
✅ **ترقية تلقائية** - لا حاجة لـ manual database updates
✅ **سجلات واضحة** - logging مفصل لكل إجراء
✅ **سهولة الصيانة** - middleware واحد يتعامل مع كل شيء
✅ **مرونة** - يمكن تعديل ADMIN_EMAIL بدون تعديل الـ code

---

## متطلبات إضافية

### 1. Ensure pgcrypto Extension:
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 2. Verify Database Connection:
```bash
# Test database connection
npm run test-db
# or manually
node -e "const db = require('./db'); db.query('SELECT NOW()').then(r => console.log('✅ Connected:', r.rows[0]))"
```

### 3. Check Environment Variables:
```bash
# Verify ADMIN_EMAIL is set
echo $ADMIN_EMAIL
# Should output: admin@smartrent.com (or your admin email)
```

---

## Troubleshooting

### المشكلة: "ADMIN_EMAIL environment variable is not set"

**الحل:**
1. تأكد من تعريف `ADMIN_EMAIL` في `.env`:
   ```env
   ADMIN_EMAIL=admin@smartrent.com
   ```
2. أعد تشغيل الخادم بعد التحديث

### المشكلة: "Access denied: Admin role required" لأدمن حقيقي

**الحل:**
1. تحقق من تطابق البريد الإلكتروني بالضبط (case-sensitive قد لا يكون مشكلة في البعض)
2. تأكد من تطبيق migration:
   ```bash
   node database/init-db.js
   ```
3. تحقق من أن عمود `role` موجود:
   ```sql
   SELECT * FROM information_schema.columns 
   WHERE table_name = 'users' AND column_name = 'role';
   ```

### المشكلة: "User not found"

**الحل:**
1. تأكد من وجود المستخدم في قاعدة البيانات
2. تحقق من صحة الـ token والـ uid فيه:
   ```bash
   node -e "console.log(require('jsonwebtoken').decode('<YOUR_TOKEN>'))"
   ```

---

## النسخة الكاملة من Middleware

انظر: `middleware/isAdmin.js`

```javascript
/**
 * Admin Middleware - Checks and validates admin role
 * Must be used AFTER authMiddleware
 * 
 * Logic:
 * 1. Check if user is already admin in database
 * 2. If not admin, check if user email matches ADMIN_EMAIL env variable
 * 3. If email matches, promote user to admin and store in database
 * 4. Allow request to proceed; otherwise return 403 Forbidden
 */
```

---

## الخطوات التالية

1. ✅ تحديث الـ middleware
2. ✅ إضافة عمود `role` إلى Schema
3. ✅ إنشاء Migration
4. ✅ تطبيق Migration على قاعدة البيانات
5. ✅ تعيين `ADMIN_EMAIL` في `.env`
6. ✅ اختبار المسارات المحمية بـ `isAdmin`

---

## اختبار المسارات

```bash
# اختبار مسار محمي بـ admin
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/admin/stats
```

---

## ملاحظات أمنية

⚠️ **تحذير:** لا تضع `ADMIN_EMAIL` في الـ frontend code
⚠️ **تحذير:** تأكد من أن `authMiddleware` يعمل قبل `isAdmin`
⚠️ **تحذير:** استخدم HTTPS في الإنتاج
⚠️ **تحذير:** احفظ `ADMIN_EMAIL` في متغيرات البيئة الآمنة فقط


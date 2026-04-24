# 🔗 API Connection Guide - SmartRentDZ

## تحديثات الاتصال (Frontend ↔ Backend)

### ✅ تم إنجازه:

#### **الفرونت إند (Vite React)**
- ✅ تم إضافة `withCredentials: true` في axios instance ([src/lib/api.ts](src/lib/api.ts))
- ✅ تم إنشاء ملف config مركزي ([src/config/api.ts](src/config/api.ts))
- ✅ متغير البيئة `VITE_API_URL=https://m2-3.onrender.com/api` موجود في [.env](.env)

#### **الباك إند (Express.js)**
- ✅ تم تحديث CORS لدعم Render و Vercel ([config/runtime.js](config/runtime.js))
- ✅ تم إضافة `FRONTEND_URL` في [.env](.env)
- ✅ Headers مركبة: `['Content-Type', 'Authorization']`
- ✅ Methods مفعلة: `['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']`

---

## 🛠️ الإعدادات الحالية

### Backend (Render)
```
URL: https://m2-3.onrender.com
API Base: https://m2-3.onrender.com/api
```

### Frontend (Vercel) - مثال
```
URL: https://smart-rent-dz.vercel.app
API_URL: https://m2-3.onrender.com/api (من VITE_API_URL)
```

### Environment Variables

#### في الفرونت إند ([smartrentdz/.env](smartrentdz/.env)):
```env
VITE_API_URL=https://m2-3.onrender.com/api
```

#### في الباك إند ([my-express-backend/.env](my-express-backend/.env)):
```env
FRONTEND_URL=https://smart-rent-dz.vercel.app
VERCEL_URL=<سيتم إضافته تلقائياً من Vercel>
```

---

## 📋 قائمة الـ Endpoints المدعومة

### Authentication
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
```

### Apartments
```
GET  /api/apartments
POST /api/apartments
GET  /api/apartments/:id
PUT  /api/apartments/:id
DELETE /api/apartments/:id
```

### Subscriptions
```
POST /api/subscriptions/request
GET  /api/subscriptions/mine
GET  /api/subscriptions/admin/pending
PATCH /api/admin/subscriptions/:id/status
```

---

## 🔒 معلومات أمان

### CORS Headers
```
Access-Control-Allow-Origin: <من الـ allowedOrigins>
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Authentication
- جميع الطلبات تستخدم JWT Token في header: `Authorization: Bearer <token>`
- Token يتم تخزينه في localStorage
- عند انتهاء الجلسة (401)، يتم إعادة توجيه للـ login

---

## 🧪 اختبار الاتصال

### 1️⃣ اختبار الصحة (Health Check)
```bash
curl https://m2-3.onrender.com/health
```

### 2️⃣ اختبار قاعدة البيانات
```bash
curl https://m2-3.onrender.com/test-db
```

### 3️⃣ اختبار CORS (من الفرونت إند)
```javascript
// في console الفرونت إند
fetch('https://m2-3.onrender.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include'
})
```

---

## ⚠️ ملاحظات مهمة

1. **VERCEL_URL**: سيتم تعيينه تلقائياً من قبل Vercel في بيئة الإنتاج
2. **localhost**: مدعوم بالكامل في التطوير
3. **withCredentials**: ضروري عند استخدام Cookies أو Sessions
4. **CORS**: مفعل تلقائياً في `index.js`

---

## 📞 استكشاف الأخطاء

### خطأ CORS
```
Access to XMLHttpRequest at 'https://...' from origin 'https://...' 
has been blocked by CORS policy
```
**الحل**: تأكد من أن الـ origin موجود في `getAllowedOrigins()` في [config/runtime.js](my-express-backend/config/runtime.js)

### خطأ 401 Unauthorized
```
Token expired or invalid
```
**الحل**: تحقق من صلاحية الـ JWT token أو أعد تسجيل الدخول

### خطأ Connection Timeout
```
ECONNREFUSED or timeout
```
**الحل**: 
- تأكد من أن الباك إند يعمل على Render
- تحقق من متغير `VITE_API_URL` في الفرونت إند

---

## 🔄 تحديثات مستقبلية مطلوبة

عند نشر الفرونت إند على Vercel، قم بـ:
1. إضافة Vercel URL في `FRONTEND_URL` بالباك إند (أو سيتم اكتشافه تلقائياً)
2. تحديث متغيرات البيئة على Vercel و Render من لوحة التحكم
3. اختبار جميع الـ API endpoints

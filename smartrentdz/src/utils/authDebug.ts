/**
 * اختبار التحقق من Admin Role
 * Testing Admin Role Access
 * 
 * يمكن استخدام هذا الملف للاختبار اليدوي في Console
 */

// ============================================
// 1. فحص JWT Token
// ============================================

function decodeJWT(token) {
  if (!token) {
    console.error("❌ لا يوجد token في localStorage");
    return null;
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    const payload = JSON.parse(atob(parts[1]));
    console.log("✅ JWT Decoded:", payload);
    return payload;
  } catch (err) {
    console.error("❌ خطأ في فك تشفير JWT:", err);
    return null;
  }
}

// الاستخدام:
// const token = localStorage.getItem('token');
// decodeJWT(token);

// ============================================
// 2. فحص userData
// ============================================

function checkUserData() {
  const userDataStr = localStorage.getItem("userData");
  
  if (!userDataStr) {
    console.error("❌ لا توجد بيانات مستخدم في localStorage");
    return null;
  }

  try {
    const userData = JSON.parse(userDataStr);
    console.log("✅ User Data:", userData);
    
    // تحقق من حقل role
    if (userData.role) {
      console.log(`✅ Role Found: "${userData.role}"`);
      const isAdmin = userData.role.toLowerCase() === "admin";
      console.log(`🔐 Is Admin: ${isAdmin}`);
    } else {
      console.warn("⚠️ حقل role غير موجود في userData");
    }
    
    return userData;
  } catch (err) {
    console.error("❌ خطأ في قراءة userData:", err);
    return null;
  }
}

// الاستخدام:
// checkUserData();

// ============================================
// 3. فحص شامل (Comprehensive Check)
// ============================================

function comprehensiveAuthCheck() {
  console.log("═══════════════════════════════════════════");
  console.log("🔍 فحص شامل للمصادقة");
  console.log("═══════════════════════════════════════════\n");

  // 1. فحص Token
  console.log("1️⃣  فحص JWT Token:");
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("❌ لا يوجد token");
    return;
  }
  console.log("✅ Token موجود");
  
  const jwtPayload = decodeJWT(token);
  if (!jwtPayload) return;

  // 2. فحص userData
  console.log("\n2️⃣  فحص User Data:");
  const userData = checkUserData();
  if (!userData) return;

  // 3. مقارنة البيانات
  console.log("\n3️⃣  مقارنة البيانات:");
  console.log(`Token Role: "${jwtPayload.role || 'undefined'}"`);
  console.log(`UserData Role: "${userData.role || 'undefined'}"`);
  
  if (jwtPayload.role === userData.role) {
    console.log("✅ Roles متطابقة");
  } else {
    console.warn("⚠️ Roles غير متطابقة!");
  }

  // 4. فحص Admin Status
  console.log("\n4️⃣  فحص حالة Admin:");
  const isAdminFromJWT = jwtPayload.role && jwtPayload.role.toLowerCase() === "admin";
  const isAdminFromUserData = userData.role && userData.role.toLowerCase() === "admin";
  
  console.log(`Admin (from JWT): ${isAdminFromJWT}`);
  console.log(`Admin (from UserData): ${isAdminFromUserData}`);
  
  if (isAdminFromJWT || isAdminFromUserData) {
    console.log("✅ المستخدم له صلاحيات admin");
  } else {
    console.log("ℹ️ المستخدم ليس admin");
  }

  console.log("\n═══════════════════════════════════════════\n");
}

// الاستخدام:
// comprehensiveAuthCheck();

// ============================================
// 4. اختبار الوصول إلى مسارات Admin
// ============================================

async function testAdminAccess() {
  console.log("🔐 اختبار الوصول إلى مسارات Admin...\n");

  const token = localStorage.getItem("token");
  if (!token) {
    console.error("❌ لا يوجد token - يجب تسجيل الدخول أولاً");
    return;
  }

  try {
    // اختبر طلب للـ admin API
    const response = await fetch(
      "http://localhost:3001/api/admin/dashboard",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log("✅ نجح الوصول إلى admin API:");
      console.log(data);
    } else if (response.status === 403) {
      console.error("❌ تم رفض الوصول (403 Forbidden)");
      console.error("- قد لا تكون admin");
      console.error("- أو الـ role في JWT غير محدثة");
    } else if (response.status === 401) {
      console.error("❌ لم يتم المصادقة (401 Unauthorized)");
      console.error("- قد يكون Token منتهي الصلاحية");
    } else {
      console.error(`❌ خطأ ${response.status}:`, response.statusText);
    }
  } catch (error) {
    console.error("❌ خطأ في الاتصال:", error);
  }
}

// الاستخدام:
// testAdminAccess();

// ============================================
// 5. مسح البيانات (للاختبار)
// ============================================

function clearAuthData() {
  console.log("🗑️  مسح بيانات المصادقة...");
  
  localStorage.removeItem("token");
  localStorage.removeItem("userData");
  localStorage.removeItem("isAdmin");
  
  console.log("✅ تم مسح جميع البيانات");
  console.log("⚠️  يجب تسجيل الدخول مرة أخرى");
}

// الاستخدام:
// clearAuthData();

// ============================================
// 6. عرض جميع بيانات localStorage
// ============================================

function displayAllLocalStorage() {
  console.log("📦 جميع بيانات localStorage:");
  console.log("═══════════════════════════════════════════\n");

  const items = {
    token: localStorage.getItem("token"),
    userData: localStorage.getItem("userData"),
    isAdmin: localStorage.getItem("isAdmin"),
  };

  for (const [key, value] of Object.entries(items)) {
    if (value) {
      console.log(`✅ ${key}:`);
      try {
        if (key === "userData") {
          console.log(JSON.parse(value));
        } else if (key === "token") {
          console.log(`${value.substring(0, 50)}...`);
          const decoded = decodeJWT(value);
          if (decoded) {
            console.log("Decoded:", decoded);
          }
        } else {
          console.log(value);
        }
      } catch (e) {
        console.log(value);
      }
    } else {
      console.log(`❌ ${key}: غير موجود`);
    }
    console.log();
  }

  console.log("═══════════════════════════════════════════\n");
}

// الاستخدام:
// displayAllLocalStorage();

// ============================================
// 7. دليل الاختبار السريع
// ============================================

function testingGuide() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          دليل الاختبار السريع - Quick Testing Guide       ║
╚════════════════════════════════════════════════════════════╝

📋 الخطوات:

1. سجل دخول باستخدام إيميل admin:
   Email: admin@smartrent.com (أو القيمة المعرفة في ADMIN_EMAIL)
   
2. بعد تسجيل الدخول، افتح Console وأدخل:
   
   ✨ للفحص الشامل:
   > comprehensiveAuthCheck()
   
   🔍 للفحص السريع للـ role:
   > checkUserData()
   
   🔐 لاختبار الوصول إلى API:
   > testAdminAccess()
   
   📦 لعرض جميع البيانات:
   > displayAllLocalStorage()

3. النتائج المتوقعة:
   ✅ role: "admin"
   ✅ يمكن الوصول إلى /admin/* routes
   ✅ JWT يحتوي على role: "admin"

════════════════════════════════════════════════════════════

⚠️ استكشاف الأخطاء:

إذا لم تتمكن من الوصول إلى مسارات admin:

1. تحقق من إيميل التسجيل:
   > userData = checkUserData()
   > userData.email
   
2. تحقق من متغير ADMIN_EMAIL في الباك أند:
   - يجب أن يطابق الإيميل المستخدم

3. تحقق من JWT:
   > token = localStorage.getItem('token')
   > decodeJWT(token)
   > يجب أن يحتوي على: role: "admin"

4. امسح البيانات وسجل دخول مرة أخرى:
   > clearAuthData()
   ثم سجل دخول جديد

════════════════════════════════════════════════════════════
  `);
}

// الاستخدام:
// testingGuide();

// ============================================
// 8. Export للاستخدام
// ============================================

// اجعلها متاحة في Window object
window.authDebug = {
  decodeJWT,
  checkUserData,
  comprehensiveAuthCheck,
  testAdminAccess,
  clearAuthData,
  displayAllLocalStorage,
  testingGuide,
};

console.log(`
✅ أدوات الاختبار جاهزة!

استخدم: window.authDebug.comprehensiveAuthCheck()
أو اختصار: authDebug.comprehensiveAuthCheck()

للحصول على دليل سريع: authDebug.testingGuide()
`);

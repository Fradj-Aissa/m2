# QUICK_START.md - دليل البدء السريع

ابدأ مع SmartRentDZ في 5 دقائق!

## 🏃 البدء السريع المحلي (Windows/Mac/Linux)

### المرحلة 1: التثبيت (3 دقائق)

```bash
# 1. استنساخ أو تحميل المشروع
cd SMART-RENT-ML-API

# 2. إنشاء محيط وهمي
python -m venv venv

# 3. تفعيل البيئة الوهمية
# على Windows:
venv\Scripts\activate
# على Linux/Mac:
source venv/bin/activate

# 4. تثبيت المتطلبات
pip install -r requirements.txt
```

### المرحلة 2: تدريب النموذج (1-2 دقيقة)

```bash
# تأكد بأن البيانات موجودة
ls airbnb_algeria_data.json

# شغل برنامج التدريب
python scripts/train_model.py

# ستجد ملفات النموذج في models/
ls models/
```

### المرحلة 3: تشغيل API (فوري!)

```bash
# شغل FastAPI
python -m uvicorn app.main:app --reload --port 8000
```

سيظهر:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

---

## 📡 اختبار الـ API

### في نافذة terminal جديدة:

```bash
# 1. فحص الصحة
curl http://localhost:8000/health

# 2. الحصول على معلومات النموذج
curl http://localhost:8000/model-info

# 3. عمل تنبؤ
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "accommodates": 4,
    "bedrooms": 2,
    "bathrooms": 1.5,
    "wilaya": "Alger",
    "property_type": "Apartment",
    "minimum_nights": 1,
    "number_of_reviews": 10,
    "review_scores_rating": 4.5,
    "availability_365": 300,
    "price_per_person": 5000
  }'
```

### عبر المتصفح:

زر هذه الروابط مباشرة:
- **توثيق Swagger:** http://localhost:8000/docs
- **توثيق ReDoc:** http://localhost:8000/redoc
- **الصيانة JSON:** http://localhost:8000/openapi.json

---

## 🚀 النشر على Linux (الإنتاج)

### الخطوة الأولى: تحضير الخادم

```bash
# سجل الدخول كـ root
sudo su -

# شغل سكريبت التثبيت
bash /path/to/scripts/setup_linux.sh
```

### الخطوة الثانية: نسخ البيانات والتدريب

```bash
# نسخ البيانات
cp airbnb_algeria_data.json /opt/smartrentdz/

# تدريب النموذج
sudo -u smartrentdz bash -c 'cd /opt/smartrentdz && source venv/bin/activate && python scripts/train_model.py'
```

### الخطوة الثالثة: بدء الخدمة

```bash
# بدء الخدمة
systemctl start smartrentdz

# التحقق من الحالة
systemctl status smartrentdz

# عرض السجلات
journalctl -u smartrentdz -f
```

### الخطوة الرابعة: الوصول للـ API

```bash
# اختبار محلي
curl http://localhost:8000/health

# عبر Nginx (إذا تم إعداده)
curl http://api.smartrentdz.com/health
```

---

## 🔗 التكامل مع Laravel

### في مشروع Laravel الخاص بك:

**1. إنشاء ملف config:**

```php
// config/smartrent.php
return [
    'api_url' => env('SMARTRENT_API_URL', 'http://localhost:8000'),
    'api_timeout' => env('SMARTRENT_API_TIMEOUT', 30),
];
```

**2. إضافة المراجع في .env:**

```
SMARTRENT_API_URL=http://api.smartrentdz.com
SMARTRENT_API_TIMEOUT=30
```

**3. نسخ وحدة التحكم:**

```bash
cp laravel/SmartRentPredictionController.php app/Http/Controllers/
```

**4. إضافة المسارات:**

```php
// routes/api.php
use App\Http\Controllers\SmartRentPredictionController;

Route::post('/predict', [SmartRentPredictionController::class, 'predict']);
Route::get('/health', [SmartRentPredictionController::class, 'healthCheck']);
```

**5. الاستخدام في المنطق:**

```php
class PropertyController extends Controller
{
    public function estimatePrice($propertyId)
    {
        $property = Property::find($propertyId);
        
        $prediction = (new SmartRentPredictionController())->predict(
            new Request([
                'accommodates' => $property->accommodates,
                'bedrooms' => $property->bedrooms,
                'bathrooms' => $property->bathrooms,
                'wilaya' => $property->wilaya,
                'property_type' => $property->type,
                'minimum_nights' => $property->min_nights,
                'number_of_reviews' => $property->reviews_count,
                'review_scores_rating' => $property->rating,
                'availability_365' => $property->available_days,
                'price_per_person' => $property->price_per_person,
            ])
        );
        
        return response()->json($prediction);
    }
}
```

---

## 📚 الملفات المهمة

| الملف | الغرض |
|------|--------|
| `scripts/train_model.py` | برنامج تدريب النموذج |
| `app/main.py` | تطبيق FastAPI |
| `requirements.txt` | المكتبات المطلوبة |
| `config/gunicorn_config.py` | إعدادات الخادم |
| `config/nginx.conf` | إعدادات Nginx |
| `models/` | النماذج المدربة |

---

## 🔑 الأوامر الأساسية

### التطوير

```bash
# تفعيل البيئة الوهمية
source venv/bin/activate

# تشغيل مع reload تلقائي
python -m uvicorn app.main:app --reload

# تشغيل مع port مختلف
python -m uvicorn app.main:app --port 8001
```

### الإنتاج

```bash
# بدء الخدمة
sudo systemctl start smartrentdz

# إيقاف الخدمة
sudo systemctl stop smartrentdz

# إعادة التشغيل
sudo systemctl restart smartrentdz

# عرض السجلات
sudo journalctl -u smartrentdz -f

# إعادة التدريب
sudo -u smartrentdz bash -c 'cd /opt/smartrentdz && source venv/bin/activate && python scripts/train_model.py'
```

### الصيانة

```bash
# فحص صحة API
curl http://localhost:8000/health

# عرض معلومات النموذج
curl http://localhost:8000/model-info

# حجم ملفات النموذج
du -sh /opt/smartrentdz/models/

# استخدام الموارد
watch -n 1 'ps aux | grep gunicorn'
```

---

## 🆘 المشاكل الشائعة

| المشكلة | الحل |
|--------|------|
| `ModuleNotFoundError` | `pip install -r requirements.txt` |
| "Model not loaded" | `python scripts/train_model.py` |
| Connection refused | `systemctl start smartrentdz` |
| Port already in use | `sudo kill -9 $(lsof -t -i :8000)` |
| Out of memory | قلل عدد `workers` في `gunicorn_config.py` |

---

## 📞 المراجع السريعة

- **Swagger UI:** http://localhost:8000/docs
- **API Docs:** [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **التثبيت الكامل:** [DEPLOYMENT.md](DEPLOYMENT.md)
- **استكشاف الأخطاء:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## ✅ قائمة التحقق

- [ ] تثبيت المتطلبات
- [ ] تدريب النموذج
- [ ] تشغيل API
- [ ] اختبار تنبؤ واحد
- [ ] تفعيل CORS إذا لزم الأمر
- [ ] إعدادات Nginx للإنتاج
- [ ] إعدادات SSL
- [ ] بدء Systemd service
- [ ] اختبار من Laravel

---

🎉 **تهانينا! أنت الآن جاهز لاستخدام SmartRentDZ!**

---

**آخر تحديث:** 2026-04-15

# SmartRentDZ - نظام ذكاء اصطناعي لتنبؤ أسعار الإيجار

نظام متكامل وجاهز للإنتاج لتنبؤ أسعار إيجار الشقق في الجزائر باستخدام تقنيات التعلم الآلي.

## 🎯 المميزات الرئيسية

- ✅ **Pipeline كامل للبيانات**: تحميل وتنظيف وتحويل البيانات
- ✅ **نموذج Random Forest**: نموذج تعلم آلي قوي وموثوق
- ✅ **API FastAPI**: تطبيق ويب سريع وآمن
- ✅ **التكامل مع Laravel**: وحدة تحكم جاهزة للاستخدام
- ✅ **الإنتاج والتشغيل**: إعدادات Gunicorn و Systemd و Nginx
- ✅ **معالجة الأخطاء**: نظام شامل لمعالجة الأخطاء والاستثناءات
- ✅ **توثيق كامل**: توثيق شامل وأمثلة استخدام

## 📁 هيكل المشروع

```
SMART-RENT-ML-API/
├── scripts/
│   ├── train_model.py          # Pipeline تدريب النموذج
│   └── setup_linux.sh          # سكريبت إعداد البيئة (Linux)
├── app/
│   └── main.py                 # تطبيق FastAPI
├── models/                     # مجلد حفظ النماذج المدربة
├── config/
│   ├── settings.ini            # إعدادات التطبيق
│   ├── gunicorn_config.py      # إعدادات Gunicorn
│   ├── nginx.conf              # إعدادات Nginx
│   └── smartrentdz.service     # خدمة Systemd
├── laravel/
│   ├── SmartRentPredictionController.php  # وحدة التحكم Laravel
│   └── routes.php              # المسارات
├── logs/                       # ملفات السجلات
├── requirements.txt            # متطلبات Python
├── .env.example                # مثال على متغيرات البيئة
└── airbnb_algeria_data.json    # بيانات التدريب
```

## ⚙️ المتطلبات

- **Python 3.9+**
- **Linux (Ubuntu/Debian)** للإنتاج
- **Nginx** كـ reverse proxy
- **PostgreSQL** (اختياري للمستقبل)
- **pip** ومحيط وهمي Python

## 🚀 البدء السريع

### 1. التثبيت المحلي (Development)

```bash
# استنساخ المشروع
cd SMART-RENT-ML-API

# إنشاء محيط وهمي
python -m venv venv
source venv/bin/activate  # Linux/Mac
# أو
venv\Scripts\activate     # Windows

# تثبيت المتطلبات
pip install -r requirements.txt

# تدريب النموذج
python scripts/train_model.py

# تشغيل API
python -m uvicorn app.main:app --reload --port 8000
```

### 2. التثبيت على Linux (Production)

```bash
# شغل سكريبت الإعداد كـ root
sudo bash scripts/setup_linux.sh

# نسخ البيانات
sudo cp airbnb_algeria_data.json /opt/smartrentdz/

# تدريب النموذج
sudo -u smartrentdz bash -c 'cd /opt/smartrentdz && source venv/bin/activate && python scripts/train_model.py'

# بدء الخدمة
sudo systemctl start smartrentdz

# التحقق من الحالة
sudo systemctl status smartrentdz
```

## 📚 التوثيق

- [DEPLOYMENT.md](DEPLOYMENT.md) - دليل النشر والتثبيت
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - توثيق API كامل
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - استكشاف الأخطاء

## 🔗 نقاط النهاية (Endpoints)

| الوجهة | الطريقة | الوصف |
|-------|---------|--------|
| `/predict` | POST | تنبؤ بسعر الشقة |
| `/predict-batch` | POST | تنبؤ متعدد |
| `/health` | GET | فحص صحة الخدمة |
| `/model-info` | GET | معلومات النموذج |
| `/docs` | GET | توثيق Swagger |
| `/redoc` | GET | توثيق ReDoc |

### مثال على الطلب

```bash
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

## 🔗 التكامل مع Laravel

استخدم وحدة التحكم المرفقة `SmartRentPredictionController`:

```php
use App\Http\Controllers\SmartRentPredictionController;

Route::post('/api/predict', [SmartRentPredictionController::class, 'predict']);
Route::get('/api/health', [SmartRentPredictionController::class, 'healthCheck']);
```

انظر [laravel/SmartRentPredictionController.php](laravel/SmartRentPredictionController.php) للتفاصيل الكاملة.

## 📊 بيانات النموذج

يستخدم النموذج المتغيرات التالية:

**متغيرات الإدخال:**
- `accommodates`: عدد الضيوف الذين يمكن للشقة استيعابهم
- `bedrooms`: عدد غرف النوم
- `bathrooms`: عدد الحمامات
- `wilaya`: الولاية (تم ترميزها)
- `property_type`: نوع العقار (تم ترميزه)
- `minimum_nights`: الحد الأدنى للليالي
- `number_of_reviews`: عدد التقييمات
- `review_scores_rating`: متوسط درجة التقييم
- `availability_365`: عدد أيام التوفر
- `price_per_person`: السعر للشخص الواحد

**المتغير المستهدف:**
- `price`: سعر الإيجار بالدينار الجزائري (DZD)

## 🔐 الأمان

- ✅ تفعيل CORS مع قائمة الأصول البيضاء
- ✅ التحقق من صحة الإدخال باستخدام Pydantic
- ✅ معالجة الأخطاء والاستثناءات الشاملة
- ✅ التسجيل والمراقبة
- ✅ timeout والحماية من الحمل الزائد

## 📈 الأداء

- **القوة الحاسوبية**: استخدام جميع أنوية المعالج
- **العمال المتزامنين**: Gunicorn مع عمال Uvicorn متعددين
- **الضغط**: Gzip على Nginx
- **الذاكرة المؤقتة**: دعم Redis للذاكرة المؤقتة المستقبلية

## 🛠️ الصيانة

### عرض السجلات
```bash
# All logs
journalctl -u smartrentdz -f

# Access logs only
tail -f /var/log/smartrentdz/access.log
```

### إعادة تدريب النموذج
```bash
sudo -u smartrentdz bash -c 'cd /opt/smartrentdz && source venv/bin/activate && python scripts/train_model.py'
```

### إعادة تشغيل الخدمة
```bash
sudo systemctl restart smartrentdz
```

## 📊 مراقبة الموارد

```bash
# CPU والذاكرة
watch -n 1 'ps aux | grep gunicorn'

# عدد الاتصالات
netstat -an | grep ESTABLISHED | wc -l
```

## 🤝 المساهمة

نرحب بالمساهمات والاقتراحات!

## 📄 الترخيص

هذا المشروع مرخص بموجب MIT License.

## 📞 الدعم

للمزيد من المعلومات، راجع ملفات التوثيق:
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

**آخر تحديث:** 2026-04-15
**الإصدار:** 1.0.0

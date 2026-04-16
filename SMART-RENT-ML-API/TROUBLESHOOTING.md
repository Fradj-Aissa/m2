# TROUBLESHOOTING.md - استكشاف وحل الأخطاء

دليل شامل لحل المشاكل الشائعة في SmartRentDZ.

## 🔍 المشاكل الشائعة والحلول

### 1. الخدمة لا تبدأ

**الأعراض:**
```
systemctl start smartrentdz
Job for smartrentdz.service failed because the control process exited with error code.
```

**الحلول المحتملة:**

#### أ) فحص الأخطاء
```bash
# عرض تفاصيل الخطأ
systemctl status smartrentdz -l

# عرض السجلات الكاملة
journalctl -u smartrentdz -n 100

# فحص ملف الخدمة
systemctl cat smartrentdz
```

#### ب) مشاكل الأذونات
```bash
# تصحيح أذونات المجلدات
sudo chown -R smartrentdz:smartrentdz /opt/smartrentdz
sudo chown -R smartrentdz:smartrentdz /var/log/smartrentdz
sudo chmod 755 /opt/smartrentdz

# إعادة المحاولة
systemctl start smartrentdz
```

#### ج) مشاكل البيئة الوهمية
```bash
# فحص المجموعة الافتراضية
ls -la /opt/smartrentdz/venv/bin/python

# إعادة إنشاء venv
cd /opt/smartrentdz
rm -rf venv
python3.9 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

### 2. "Model not loaded" - النموذج لم يتم تحميله

**الأعراض:**
```json
{
  "detail": "Model not loaded. Please train the model first."
}
```

**الحل:**

```bash
# التحقق من وجود ملفات النموذج
ls -la /opt/smartrentdz/models/

# تدريب النموذج
sudo -u smartrentdz bash -c 'cd /opt/smartrentdz && source venv/bin/activate && python scripts/train_model.py'

# التحقق من النتيجة
ls -la /opt/smartrentdz/models/

# إعادة تشغيل الخدمة
systemctl restart smartrentdz
```

---

### 3. الاتصال برفض (Connection Refused)

**الأعراض:**
```
curl: (7) Failed to connect to localhost port 8000: Connection refused
```

**الحلول:**

#### أ) فحص حالة الخدمة
```bash
systemctl status smartrentdz

# إذا كانت معطلة
systemctl start smartrentdz

# في حالة الفشل، انظر المشكلة الأولى
```

#### ب) فحص البورت
```bash
# التحقق من استخدام البورت
sudo netstat -tlnp | grep 8000

# قتل العملية الأخرى إن وجدت
sudo kill -9 <PID>

# إعادة التشغيل
systemctl restart smartrentdz
```

#### ج) فحص جدار الحماية
```bash
# السماح بالبورت
sudo ufw allow 8000/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# إعادة التحديث
sudo ufw reload

# التحقق
sudo ufw status
```

---

### 4. خطأ "ModuleNotFoundError"

**الأعراض:**
```
ModuleNotFoundError: No module named 'fastapi'
```

**الحل:**

```bash
# التأكد من تفعيل venv
source /opt/smartrentdz/venv/bin/activate

# إعادة تثبيت المتطلبات
pip install -r /opt/smartrentdz/requirements.txt

# التحقق من التثبيت
python -c "import fastapi; print(fastapi.__version__)"

# إعادة تشغيل الخدمة
systemctl restart smartrentdz
```

---

### 5. "Port is already in use" - البورت مستخدم

**الأعراض:**
```
OSError: [Errno 48] Address already in use
```

**الحل:**

```bash
# إيجاد العملية المستخدمة
sudo lsof -i :8000

# قتل العملية
sudo kill -9 <PID>

# أو تغيير البورت في gunicorn_config.py
nano /opt/smartrentdz/config/gunicorn_config.py
# غير: bind = ["0.0.0.0:8001"]

# إعادة التشغيل
systemctl restart smartrentdz
```

---

### 6. Nginx Error: "502 Bad Gateway"

**الأعراض:**
```
502 Bad Gateway
upstream prematurely closed connection
```

**الحل:**

```bash
# فحص حالة الخدمة
systemctl status smartrentdz

# فحص تشغيل gunicorn
ps aux | grep gunicorn

# فحص الأخطاء
journalctl -u smartrentdz -f

# فحص تكوين Nginx
nginx -t

# إعادة التشغيل
systemctl restart smartrentdz
systemctl restart nginx
```

---

### 7. استخدام الذاكرة مرتفع

**الأعراض:**
```
Python process using 80% of memory
```

**الحل:**

#### أ) تقليل عدد العمال
```bash
# تعديل gunicorn_config.py
nano /opt/smartrentdz/config/gunicorn_config.py

# تقليل workers
workers = 2  # بدلاً من: multiprocessing.cpu_count() * 2 + 1

# إعادة التشغيل
systemctl restart smartrentdz
```

#### ب) تحديد حد الذاكرة
```bash
# في smartrentdz.service
MemoryLimit=1G

# ثم
systemctl daemon-reload
systemctl restart smartrentdz
```

#### ج) مراقبة الذاكرة
```bash
# مراقبة مستمرة
watch -n 1 'free -h && ps aux | grep gunicorn | grep -v grep'

# معلومات مفصلة
top -u smartrentdz
```

---

### 8. بطء الاستجابة

**الأعراض:**
```
الطلب يستغرق أكثر من 30 ثانية
```

**الحل:**

#### أ) زيادة عدد العمال
```bash
# تعديل gunicorn_config.py
workers = multiprocessing.cpu_count() * 3

systemctl restart smartrentdz
```

#### ب) فحص استخدام CPU
```bash
top -b -n 1 | grep gunicorn

# إذا كان عالياً جداً
# أعد تدريب النموذج أو قلل حجم الطلب
```

#### ج) تمكين الذاكرة المؤقتة (Redis)
```bash
# تثبيت Redis
sudo apt-get install -y redis-server

# تشغيل Redis
systemctl start redis-server
systemctl enable redis-server

# تعديل التطبيق لاستخدام Redis (مستقبلي)
```

---

### 9. خطأ في التدريب: "Out of Memory"

**الأعراض:**
```
MemoryError: Unable to allocate memory
```

**الحل:**

```bash
# تقليل حجم الدفعة أثناء التدريب
# تعديل scripts/train_model.py
# إضافة جزء العينات:

# قراءة البيانات على دفعات
chunk_size = 10000
```

---

### 10. CORS Error - مشاكل المصدر المسموح

**الأعراض:**
```
Access to XMLHttpRequest at 'http://api.smartrentdz.com/predict'
from origin 'http://example.com' has been blocked by CORS policy
```

**الحل:**

```bash
# تعديل app/main.py
# إضافة المصدر المسموح

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://yourdomain.com",  # أضف دومينك هنا
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# إعادة التشغيل
systemctl restart smartrentdz
```

---

## 📋 قائمة التحقق من التشخيص

### بدء التشخيص السريع

```bash
#!/bin/bash
echo "=== SmartRentDZ Diagnostic ==="

# 1. حالة الخدمة
echo "1. Service Status:"
systemctl status smartrentdz --no-pager

# 2. استخدام المشافظ
echo -e "\n2. Port Binding:"
netstat -tlnp 2>/dev/null | grep 8000

# 3. استخدام الموارد
echo -e "\n3. Resource Usage:"
ps aux | grep gunicorn | grep -v grep

# 4. ملفات النموذج
echo -e "\n4. Model Files:"
ls -lah /opt/smartrentdz/models/

# 5. الأخطاء الأخيرة
echo -e "\n5. Recent Errors:"
journalctl -u smartrentdz -p err --no-pager -n 10

# 6. اختبار API
echo -e "\n6. API Health:"
curl -s http://localhost:8000/health | python -m json.tool

echo -e "\n=== End of Diagnostic ==="
```

احفظ هذا الملف كـ `diagnostic.sh` وشغله:
```bash
chmod +x diagnostic.sh
./diagnostic.sh
```

---

## 🔧 أوامر تصحيح سريعة

### إعادة تشغيل كاملة
```bash
systemctl restart smartrentdz
systemctl restart nginx
```

### مسح السجلات
```bash
journalctl -u smartrentdz --vacuum-time=3d
```

### مسح ملفات ذاكرة التخزين المؤقت
```bash
find /opt/smartrentdz -name "*.pyc" -delete
find /opt/smartrentdz -type d -name "__pycache__" -delete
```

### فحص صحة كامل
```bash
# 1. النموذج
python -c "import joblib; m = joblib.load('/opt/smartrentdz/models/random_forest_model.joblib'); print('Model OK')"

# 2. المكتبات
pip check

# 3. الملفات
ls -la /opt/smartrentdz/models/
```

---

## 📞 الدعم المتقدم

إذا استمرت المشاكل:

1. **جمع المعلومات:**
   ```bash
   journalctl -u smartrentdz > smartrentdz.log
   systemctl status smartrentdz > service_status.log
   dmesg > system.log
   ```

2. **التحقق من السجلات:**
   - `/var/log/smartrentdz/access.log`
   - `/var/log/smartrentdz/error.log`
   - `journalctl -u smartrentdz`

3. **الاتصال بالدعم:**
   شارك السجلات مع فريق الدعم.

---

**آخر تحديث:** 2026-04-15

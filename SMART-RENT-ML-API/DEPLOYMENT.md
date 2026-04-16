# DEPLOYMENT.md - دليل النشر والتثبيت

نشر SmartRentDZ على خادم Linux جاهز للإنتاج.

## 📋 المتطلبات الأساسية

- خادم Linux (Ubuntu 20.04+ أو Debian 10+)
- صلاحيات root أو sudoer
- اتصال إنترنت مستقر
- دومين (اختياري - SSL)

## 🚀 خطوات التثبيت

### الخطوة 1: إعداد البيئة

```bash
# تسجيل الدخول كـ root
sudo su -

# تحديث النظام
apt-get update && apt-get upgrade -y

# تثبيت المعتمديات الأساسية
apt-get install -y \
    python3.9 python3.9-venv python3.9-dev \
    build-essential libssl-dev libffi-dev \
    nginx postgresql git curl wget supervisor
```

### الخطوة 2: إنشاء مستخدم المشروع

```bash
# إنشاء مستخدم خاص بالمشروع
useradd -r -s /bin/bash -d /opt/smartrentdz -m smartrentdz

# إنشاء المجلدات المطلوبة
mkdir -p /opt/smartrentdz/{logs,models}
mkdir -p /var/log/smartrentdz /var/run/smartrentdz

# تعيين الأذونات
chown -R smartrentdz:smartrentdz /opt/smartrentdz
chown -R smartrentdz:smartrentdz /var/log/smartrentdz
chown -R smartrentdz:smartrentdz /var/run/smartrentdz

chmod 755 /opt/smartrentdz /var/log/smartrentdz /var/run/smartrentdz
```

### الخطوة 3: نسخ ملفات المشروع

```bash
# نسخ المشروع إلى مجلد التثبيت
cd /tmp
git clone <repository-url> smartrentdz-repo
cp -r smartrentdz-repo/* /opt/smartrentdz/
rm -rf smartrentdz-repo

# تعديل الأذونات
chown -R smartrentdz:smartrentdz /opt/smartrentdz
```

### الخطوة 4: إنشاء محيط Python الوهمي

```bash
# الانتقال إلى مجلد المشروع
cd /opt/smartrentdz

# إنشاء venv
python3.9 -m venv venv

# تفعيل venv
source venv/bin/activate

# ترقية pip و setuptools
pip install --upgrade pip setuptools wheel

# تثبيت المتطلبات
pip install -r requirements.txt

# الخروج من venv
deactivate
```

### الخطوة 5: تجهيز البيانات وتدريب النموذج

```bash
# نسخ ملف البيانات
cp /path/to/airbnb_algeria_data.json /opt/smartrentdz/

# التبديل إلى مستخدم المشروع
sudo -u smartrentdz bash << 'EOF'
cd /opt/smartrentdz
source venv/bin/activate
python scripts/train_model.py
EOF
```

### الخطوة 6: إعداد Gunicorn

```bash
# نسخ ملف إعدادات Gunicorn
cp /opt/smartrentdz/config/gunicorn_config.py /opt/smartrentdz/

# إنشاء مجلد sockets
mkdir -p /var/run/smartrentdz
chown smartrentdz:smartrentdz /var/run/smartrentdz
chmod 755 /var/run/smartrentdz
```

### الخطوة 7: إعداد Nginx

```bash
# نسخ إعدادات Nginx
cp /opt/smartrentdz/config/nginx.conf /etc/nginx/sites-available/smartrentdz

# تفعيل الموقع
ln -sf /etc/nginx/sites-available/smartrentdz /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# اختبار الإعدادات
nginx -t

# إعادة تشغيل Nginx
systemctl restart nginx
```

### الخطوة 8: إعداد Systemd Service

```bash
# نسخ ملف الخدمة
cp /opt/smartrentdz/config/smartrentdz.service /etc/systemd/system/

# تفعيل الخدمة
systemctl daemon-reload
systemctl enable smartrentdz.service

# بدء الخدمة
systemctl start smartrentdz

# التحقق من الحالة
systemctl status smartrentdz
```

### الخطوة 9: إعداد SSL (Let's Encrypt)

```bash
# تثبيت Certbot
apt-get install -y certbot python3-certbot-nginx

# الحصول على شهادة SSL
certbot certonly --nginx -d api.smartrentdz.com

# التحديث الآلي للشهادة
systemctl enable certbot.timer
systemctl start certbot.timer
```

### الخطوة 10: إعداد Logrotate

```bash
# إنشاء ملف logrotate
cat > /etc/logrotate.d/smartrentdz << 'EOF'
/var/log/smartrentdz/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 smartrentdz smartrentdz
    sharedscripts
    postrotate
        systemctl reload smartrentdz > /dev/null 2>&1 || true
    endscript
}
EOF
```

## ✅ التحقق من التثبيت

```bash
# فحص حالة الخدمة
systemctl status smartrentdz

# اختبار API
curl http://localhost:8000/health

# عرض السجلات
journalctl -u smartrentdz -f

# اختبار التنبؤ
curl -X POST http://localhost:8000/predict \
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

## 🔧 الإعدادات الإضافية

### زيادة عدد العمال

تعديل `config/gunicorn_config.py`:

```python
# احسبها بناءً على عدد أنوية المعالج
workers = multiprocessing.cpu_count() * 2 + 1
```

### إعادة موازنة الحمل

تعديل `config/nginx.conf`:

```nginx
upstream smartrentdz_api {
    server 127.0.0.1:8000 weight=1;
    server 127.0.0.1:8001 weight=1;
    server 127.0.0.1:8002 weight=1;
    keepalive 32;
}
```

### المراقبة والتنبيهات

```bash
# مراقبة استخدام الموارد
watch -n 1 'ps aux | grep gunicorn'

# عدد الاتصالات النشطة
netstat -an | grep ESTABLISHED | wc -l

# حجم الذاكرة
free -h
```

## 🛠️ المتطلبات الروتينية

### إعادة التدريب

```bash
# تشغيل سكريبت إعادة التدريب
sudo -u smartrentdz bash -c 'cd /opt/smartrentdz && source venv/bin/activate && python scripts/train_model.py'

# إعادة تشغيل الخدمة (اختياري)
systemctl restart smartrentdz
```

### التحديث

```bash
# تنزيل التحديثات
cd /opt/smartrentdz
git pull origin main

# تثبيت أي متطلبات جديدة
source venv/bin/activate
pip install -r requirements.txt
pip install --upgrade pip

# إعادة تشغيل الخدمة
systemctl restart smartrentdz
```

### النسخ الاحتياطي

```bash
# نسخ احتياطي للنماذج والبيانات
tar -czf smartrentdz-backup-$(date +%Y%m%d).tar.gz \
    /opt/smartrentdz/models \
    /opt/smartrentdz/airbnb_algeria_data.json

# نقل النسخة الاحتياطية إلى مخزن آمن
mv smartrentdz-backup-*.tar.gz /backup/location/
```

## 📊 مراقبة الأداء

### استخدام الموارد

```bash
# CPU والذاكرة والعمليات
top -b -n 1 | grep gunicorn

# استخدام الشبكة
iftop

# استخدام القرص
df -h
du -sh /opt/smartrentdz/*
```

### تحليل السجلات

```bash
# آخر 50 سطر من السجلات
journalctl -u smartrentdz -n 50

# متابعة السجلات الحية
journalctl -u smartrentdz -f

# الأخطاء فقط
journalctl -u smartrentdz -p err

# سجلات الوصول
tail -f /var/log/smartrentdz/access.log

# عد الطلبات
tail -f /var/log/smartrentdz/access.log | wc -l
```

## 🆘 استكشاف الأخطاء

### الخدمة لا تبدأ

```bash
# فحص الأخطاء
systemctl status smartrentdz -l

# فحص اليوميات
journalctl -u smartrentdz -n 100
```

### مشاكل الأداء

```bash
# فحص استخدام الموارد
htop

# عدد الملفات المفتوحة
lsof -p $(pgrep -f gunicorn) | wc -l

# الاتصالات النشطة
netstat -an | grep smartrentdz

# إعادة تشغيل الخدمة
systemctl restart smartrentdz
```

### مشاكل قاعدة البيانات

```bash
# فحص اتصال PostgreSQL
sudo -u postgres psql -c "SELECT 1"

# إعادة تشغيل PostgreSQL
systemctl restart postgresql
```

## 📞 الدعم

للمزيد من المساعدة، انظر إلى:
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

**آخر تحديث:** 2026-04-15

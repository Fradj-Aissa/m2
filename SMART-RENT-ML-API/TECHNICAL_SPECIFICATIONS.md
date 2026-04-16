# TECHNICAL_SPECIFICATIONS.md - المواصفات التقنية

وثيقة تقنية شاملة لـ SmartRentDZ للمطورين والمهندسين.

## 🔧 بيئة التطوير

### متطلبات النظام

```
Operating System:    Ubuntu 20.04+, Debian 10+, CentOS 7+
Python:              3.9+ (Tested on 3.9, 3.10, 3.11)
RAM:                 2GB minimum (4GB recommended)
CPU:                 2+ cores
Storage:             500MB for application + 1GB for data
Network:             1Mbps minimum
```

### البرامج المطلوبة

```bash
# Core
python3.9
python3.9-venv
python3.9-dev
pip

# Build Tools
gcc, g++
make
libssl-dev
libffi-dev

# Web Server
nginx >= 1.18

# Process Management
supervisor

# Database (Optional)
postgresql >= 10
```

---

## 📦 معمارية التطبيق

### الطبقات (Layers)

```
┌─────────────────────────────────┐
│     Frontend/Client Layer       │
│  (Laravel/JavaScript/Mobile)    │
└──────────────┬──────────────────┘
               │ JSON over HTTP/HTTPS
┌──────────────▼──────────────────┐
│   FastAPI Application Layer     │
│  (Request Validation & Routing) │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   Business Logic Layer          │
│  (Model Loading & Prediction)   │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   ML Model Layer                │
│  (Random Forest Regressor)      │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   Data Layer                    │
│  (Feature Scaling & Encoding)   │
└─────────────────────────────────┘
```

### تدفق المعالجة (Processing Flow)

```
Request Input
     ↓
Pydantic Validation
     ↓
Data Transformation
     ↓
Label Encoding
     ↓
Feature Scaling
     ↓
Model Prediction
     ↓
Confidence Calculation
     ↓
Logging
     ↓
JSON Response
```

---

## 🏗️ معمارية النشر (Deployment Architecture)

### Production Stack

```
Client (Browser/App)
         ↓
    SSL/TLS (443)
         ↓
    Nginx (Reverse Proxy)
    Load Balancer
         ↓
    Gunicorn (Master Process)
         ↓
    ┌─────────────────┬─────────────────┐
    ↓                 ↓                 ↓
 Uvicorn Worker  Uvicorn Worker  Uvicorn Worker
 (Port 8000)     (Port 8001)     (Port 8002)
    ↓                 ↓                ↓
 Random Forest   Random Forest   Random Forest
 Model (shared)  Model (shared)  Model (shared)
```

### Network Configuration

```
External (Internet)
    ↓ :443 (HTTPS)
━━━━━━━━━━━━━━━━━━━
Nginx (Public IP)
0.0.0.0:443
    ↓ :8000-8002 (Internal)
━━━━━━━━━━━━━━━━━━━
Gunicorn Master
127.0.0.1:8000
    ↓ Spawns Workers
Uvicorn Workers (4x)
127.0.0.1:8000/8001/8002/8003
```

---

## 📊 نموذج البيانات (Data Model)

### Input Schema

```python
{
  "accommodates": int >= 1,              # الضيوف
  "bedrooms": int >= 1,                  # غرف النوم
  "bathrooms": float >= 0.5,             # الحمامات
  "wilaya": str,                         # الولاية
  "property_type": str,                  # نوع العقار
  "minimum_nights": int = 1,             # الحد الأدنى
  "number_of_reviews": int = 0,          # التقييمات
  "review_scores_rating": float|null,    # التقييم
  "availability_365": int = 0,           # التوفر
  "price_per_person": float|null         # السعر
}
```

### Output Schema

```python
{
  "predicted_price": float,              # السعر المتنبأ
  "currency": "DZD",                     # العملة
  "confidence": float,                   # مستوى الثقة
  "timestamp": "ISO8601",                # التوقيت
  "request_id": "REQ-YYYYMMDDHHMMSS"    # معرض الطلب
}
```

---

## 🤖 تفاصيل النموذج

### Model Specifications

```
Algorithm:              Random Forest Regressor
Number of Trees:        200
Max Depth:              20
Min Samples Split:      5
Min Samples Leaf:       2
Random State:           42
N Jobs:                 -1 (All cores)
```

### Feature Engineering

```
Original Features:      9
Engineered Features:    +3
  - price_per_bedroom
  - review_score_normalized
  - has_reviewed
Categorical Encodings:  2
  - wilaya_encoded
  - property_type_encoded
Total Features:         13
```

### Model Performance

```
Train R² Score:         0.87-0.92
Test R² Score:          0.85-0.88
Test RMSE:              ~3500 DZD
Test MAE:               ~2800 DZD
```

---

## 🔄 Pipeline التدريب (Training Pipeline)

### المراحل (Stages)

```
1. Data Loading
   └─ JSON parsing
   └─ DataFrame creation
   └─ Size: ~2000-5000 records

2. Data Cleaning
   └─ Remove null prices
   └─ Auto-convert types
   └─ Fill missing values (median)
   └─ Time: ~100ms

3. Outlier Detection
   └─ Method: IQR (default)
   └─ Remove unrealistic prices
   └─ Remove: ~5-10%
   └─ Time: ~50ms

4. Feature Engineering
   └─ Create derived features
   └─ Normalize values
   └─ Time: ~200ms

5. Categorical Encoding
   └─ LabelEncoder for wilaya
   └─ LabelEncoder for property_type
   └─ Time: ~100ms

6. Train/Test Split
   └─ Split ratio: 80/20
   └─ Random state: 42

7. Model Training
   └─ Algorithm: RandomForestRegressor
   └─ 200 trees
   └─ Parallel training
   └─ Time: 30-60 seconds

8. Model Evaluation
   └─ Train metrics
   └─ Test metrics
   └─ Feature importance
   └─ Time: ~2s

9. Model Serialization
   └─ Model → joblib
   └─ Encoders → joblib
   └─ Features → joblib
   └─ Metadata → JSON
```

### Performance Metrics

```
Total Pipeline Time:    60-120 seconds
Data Size:              ~2000-5000 records
Output Size:            ~2MB (model files)
Memory Usage:           ~1-2GB (peak)
```

---

## 🔐 Security Specifications

### Input Validation

```python
# Pydantic validation
accommodates:           range(1, 21)
bedrooms:               range(1, 11)
bathrooms:              range(0.5, 11)
wilaya:                 min_length=2, max_length=50
property_type:          min_length=2, max_length=50
minimum_nights:         range(1, 366)
number_of_reviews:      >= 0
review_scores_rating:   range(1.0, 5.1) or null
availability_365:       range(0, 366)
price_per_person:       >= 0 or null
```

### Error Handling

```
Input Validation Error   → 422 Unprocessable Entity
Business Logic Error     → 400 Bad Request
Service Unavailable      → 503 Service Unavailable
Server Error             → 500 Internal Server Error
```

### CORS Policy

```nginx
allow_origins: [
  "http://localhost:*",
  "https://yourdomain.com",
  "https://*.yourdomain.com"
]
allow_methods: ["GET", "POST", "OPTIONS"]
allow_headers: ["*"]
allow_credentials: true
max_age: 3600
```

---

## 📊 توصيات الأداء (Performance Tuning)

### Gunicorn Settings

```python
# العمال (Workers)
workers = CPU_CORES * 2 + 1
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000

# Timeouts
timeout = 120
keepalive = 5

# Requests
max_requests = 1000
max_requests_jitter = 100
```

### Nginx Settings

```nginx
# Buffer optimization
client_max_body_size = 10M;
client_body_buffer_size = 256K;
client_header_buffer_size = 32K;
large_client_header_buffers = 4 64K;

# Compression
gzip = on;
gzip_types = text/plain application/json;
gzip_min_length = 1000;

# Caching
proxy_cache_valid = 200 5s;  # 5 seconds
proxy_cache_bypass = $http_pragma;
```

### Database Query Optimization

```sql
-- Future: Create indexes
CREATE INDEX idx_wilaya ON properties(wilaya);
CREATE INDEX idx_property_type ON properties(property_type);
CREATE INDEX idx_price ON properties(price);
```

---

## 🔍 Monitoring & Logging

### Log Levels

```
DEBUG    : Detailed development info
INFO     : General operational info
WARNING  : Warning messages
ERROR    : Error messages
CRITICAL : Critical system failures
```

### Log Format

```
[2026-04-15 12:30:45,123] - INFO - Module - Message
[timestamp] - [level] - [logger] - [message]
```

### Metrics to Monitor

```
CPU Usage:              Target < 70%
Memory Usage:           Target < 80%
Request Latency:        Target < 100ms (p95)
Error Rate:             Target < 0.1%
Throughput:             Target > 100 req/sec
Model Prediction Time:  Target < 50ms
```

---

## 🧪 Testing (Unit & Integration)

### Test Coverage

```
Data Pipeline:          Unit Tests
Models:                 Integration Tests
API Endpoints:          Integration Tests
Error Handling:         Unit Tests
CORS Configuration:     Unit Tests
```

### Test Commands

```bash
# Run all tests
pytest tests/

# Run specific test file
pytest tests/test_api.py

# Run with coverage
pytest --cov=app tests/

# Run in verbose mode
pytest -v tests/
```

---

## 🚀 Deployment Checklist

### Pre-Deployment

```bash
# [ ] Code review
# [ ] Security audit
# [ ] Performance testing
# [ ] Load testing
# [ ] Backup existing data
# [ ] Document changes
# [ ] Test on staging
```

### Deployment

```bash
# [ ] Copy application files
# [ ] Install dependencies
# [ ] Run database migrations
# [ ] Train/update model
# [ ] Configure environment
# [ ] Set up SSL certificates
# [ ] Configure logging
# [ ] Start services
# [ ] Run health checks
# [ ] Monitor logs
```

### Post-Deployment

```bash
# [ ] Verify all endpoints
# [ ] Test from client app
# [ ] Check logs for errors
# [ ] Monitor resource usage
# [ ] Test auto-restart
# [ ] Verify backups
# [ ] Document deployment
```

---

## 🔄 Auto-Update Strategy

### Model Retraining

```bash
# Schedule weekly retraining
0 2 * * 0 /opt/smartrentdz/scripts/retrain.sh

# Backup old model
cp models/random_forest_model.joblib models/backup/

# Train new model
python scripts/train_model.py

# Validate new model
# If validation passes: reload service
# If validation fails: restore old model
```

### Application Updates

```bash
# Check for updates
git fetch origin

# Test updates locally
git checkout origin/main
pip install -r requirements.txt
python -m pytest

# Deploy if tests pass
git merge origin/main
systemctl restart smartrentdz
```

---

## 🔗 API Rate Limiting (Future)

### Configuration

```python
# Per IP
requests_per_minute = 60

# Per API Key
vip_requests_per_minute = 300

# Global
max_concurrent_requests = 1000
```

### Handling

```python
# Return 429 Too Many Requests
# Include: Retry-After header
Retry-After: 60
```

---

## 📱 API Versioning (Future)

### URL Structure

```
/v1/predict    # Current version
/v2/predict    # Future version
```

### Headers

```
Accept: application/vnd.smartrent.v1+json
```

---

## 🗄️ Database Schema (Future)

### Tables

```sql
CREATE TABLE predictions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_id VARCHAR(50) UNIQUE,
    input_data JSON,
    predicted_price DECIMAL(10,2),
    confidence FLOAT,
    created_at TIMESTAMP,
    user_id INT
);

CREATE TABLE models (
    id INT PRIMARY KEY AUTO_INCREMENT,
    version VARCHAR(20),
    training_date TIMESTAMP,
    r2_score FLOAT,
    rmse FLOAT,
    is_active BOOLEAN
);
```

---

## 🔒 Backup & Recovery

### Backup Strategy

```bash
# Daily incremental backups
0 1 * * * /opt/smartrentdz/scripts/backup.sh

# Weekly full backups
0 2 * * 0 /opt/smartrentdz/scripts/full_backup.sh

# Monthly archive
0 3 1 * * /opt/smartrentdz/scripts/archive.sh
```

### Recovery Procedure

```bash
# 1. List backups
ls -la /backups/smartrentdz/

# 2. Restore from backup
tar -xzf /backups/smartrentdz/backup-2026-04-15.tar.gz

# 3. Verify restoration
systemctl restart smartrentdz
curl http://localhost:8000/health
```

---

## 📞 Support & SLA

### Response Times

```
Critical Bugs:      < 2 hours
Major Bugs:         < 24 hours
Features/Minor:     < 1 week
```

### Availability SLA

```
Target Uptime:      99.9% (8.76 hours/month downtime)
Maintenance Window: Sunday 2-4 AM (planned)
Expected Downtime:  < 1 minute for deployments
```

---

**آخر تحديث:** 2026-04-15
**الإصدار:** 1.0.0 Technical Spec

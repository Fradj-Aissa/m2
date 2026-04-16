# API_DOCUMENTATION.md - توثيق API الكامل

توثيق شامل لنقاط نهاية API الخاصة بـ SmartRentDZ.

## 📌 المقدمة

تم بناء API باستخدام FastAPI وهي توفر نقاط نهاية لتنبؤ أسعار الشقق في الجزائر بناءً على معلومات العقار.

**URL الأساسي:** `http://api.smartrentdz.com` أو `http://localhost:8000` (التطوير)

**إصدار API:** 1.0.0

## 🔐 المصادقة

API لا يتطلب مصادقة حالياً (اختياري في المستقبل).

## 📝 معايير الطلب والاستجابة

### Content-Type
```
Content-Type: application/json
```

### رموز الحالة HTTP

| الرمز | الوصف |
|------|--------|
| 200 | نجاح الطلب |
| 400 | طلب غير صحيح (خطأ في البيانات) |
| 422 | خطأ في التحقق من البيانات |
| 500 | خطأ في الخادم |
| 503 | الخدمة غير متاحة |

## 🔗 نقاط النهاية

### 1. GET `/` - معلومات الجذر

الحصول على معلومات أساسية عن API.

**الطلب:**
```bash
curl http://localhost:8000/
```

**الاستجابة:**
```json
{
  "name": "SmartRentDZ API",
  "version": "1.0.0",
  "description": "AI-powered apartment rental price prediction for Algeria",
  "endpoints": {
    "predict": "/predict (POST)",
    "health": "/health (GET)",
    "model-info": "/model-info (GET)"
  }
}
```

### 2. GET `/health` - فحص صحة الخدمة

التحقق من أن الخدمة تعمل بشكل صحيح.

**الطلب:**
```bash
curl http://localhost:8000/health
```

**الاستجابة الناجحة (200):**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "features_count": 13,
  "encoders_count": 2,
  "last_trained": "20260415_120000"
}
```

**الاستجابة عند عدم تحميل النموذج (503):**
```json
{
  "detail": "Model not loaded. Please train the model first."
}
```

### 3. GET `/model-info` - معلومات النموذج

الحصول على تفاصيل النموذج المدرب والمتغيرات المهمة.

**الطلب:**
```bash
curl http://localhost:8000/model-info
```

**الاستجابة:**
```json
{
  "model_type": "RandomForestRegressor",
  "n_estimators": 200,
  "training_date": "20260415_120000",
  "features_count": 13,
  "top_10_important_features": {
    "accommodation": 0.1234,
    "price_per_person": 0.1150,
    "bedrooms": 0.0987,
    "bathrooms": 0.0856,
    "review_scores_rating": 0.0743,
    "availability_365": 0.0687,
    "wilaya_encoded": 0.0652,
    "property_type_encoded": 0.0589,
    "minimum_nights": 0.0456,
    "number_of_reviews": 0.0389
  },
  "wilayas_supported": [
    "Alger",
    "Oran",
    "Constantine",
    ...
  ],
  "property_types_supported": [
    "Apartment",
    "House",
    "Loft",
    "Villa",
    ...
  ]
}
```

### 4. POST `/predict` - التنبؤ الفردي

التنبؤ بسعر شقة واحدة.

**نموذج الطلب:**

```json
{
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
}
```

**Parameters:**

| الحقل | النوع | مطلوب | الوصف | القيود |
|-------|-------|-------|--------|---------|
| `accommodates` | integer | ✓ | عدد الضيوف | 1-20 |
| `bedrooms` | integer | ✓ | عدد غرف النوم | 1-10 |
| `bathrooms` | float | ✓ | عدد الحمامات | 0.5-10 |
| `wilaya` | string | ✓ | الولاية الجزائرية | 2+ أحرف |
| `property_type` | string | ✓ | نوع العقار | 2+ أحرف |
| `minimum_nights` | integer | ✗ | الحد الأدنى للليالي | 1-365 (افتراضي: 1) |
| `number_of_reviews` | integer | ✗ | عدد التقييمات | 0+ (افتراضي: 0) |
| `review_scores_rating` | float | ✗ | متوسط التقييم | 1-5 |
| `availability_365` | integer | ✗ | أيام التوفر | 0-365 (افتراضي: 0) |
| `price_per_person` | float | ✗ | السعر للشخص الواحد | 0+ |

**مثال الطلب:**
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

**نموذج الاستجابة (200):**
```json
{
  "predicted_price": 18500.50,
  "currency": "DZD",
  "confidence": 0.8765,
  "timestamp": "2026-04-15T12:30:45.123456",
  "request_id": "REQ-20260415123045"
}
```

**مثال خطأ (422 - Validation Error):**
```json
{
  "detail": [
    {
      "loc": ["body", "accommodates"],
      "msg": "ensure this value is greater than 0",
      "type": "value_error.number.not_gt"
    }
  ]
}
```

### 5. POST `/predict-batch` - التنبؤ المتعدد

التنبؤ بأسعار عدة شقق في طلب واحد.

**نموذج الطلب:**
```json
{
  "requests": [
    {
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
    },
    {
      "accommodates": 6,
      "bedrooms": 3,
      "bathrooms": 2,
      "wilaya": "Oran",
      "property_type": "House",
      "minimum_nights": 2,
      "number_of_reviews": 15,
      "review_scores_rating": 4.7,
      "availability_365": 250,
      "price_per_person": 6000
    }
  ]
}
```

**مثال الطلب:**
```bash
curl -X POST "http://localhost:8000/predict-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {
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
      }
    ]
  }'
```

**الاستجابة (200):**
```json
{
  "batch_size": 2,
  "results": [
    {
      "index": 0,
      "predicted_price": 18500.50,
      "currency": "DZD",
      "status": "success"
    },
    {
      "index": 1,
      "predicted_price": 24750.75,
      "currency": "DZD",
      "status": "success"
    }
  ]
}
```

## 📚 أمثلة استخدام عملية

### Python

```python
import requests
import json

API_URL = "http://localhost:8000"

def predict_price(property_data):
    """التنبؤ بسعر شقة واحدة"""
    response = requests.post(
        f"{API_URL}/predict",
        json=property_data,
        timeout=30
    )
    response.raise_for_status()
    return response.json()

# البيانات
data = {
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
}

# الطلب
result = predict_price(data)
print(f"السعر المتنبأ به: {result['predicted_price']} {result['currency']}")
print(f"الثقة: {result['confidence']*100:.2f}%")
```

### JavaScript/Node.js

```javascript
const API_URL = "http://localhost:8000";

async function predictPrice(propertyData) {
  try {
    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(propertyData)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json();
    console.log(`السعر المتنبأ به: ${result.predicted_price} ${result.currency}`);
    console.log(`الثقة: ${(result.confidence * 100).toFixed(2)}%`);
    return result;
  } catch (error) {
    console.error('خطأ:', error);
  }
}

// الاستخدام
const propertyData = {
  accommodates: 4,
  bedrooms: 2,
  bathrooms: 1.5,
  wilaya: "Alger",
  property_type: "Apartment",
  minimum_nights: 1,
  number_of_reviews: 10,
  review_scores_rating: 4.5,
  availability_365: 300,
  price_per_person: 5000
};

predictPrice(propertyData);
```

### PHP (Laravel)

```php
use Illuminate\Support\Facades\Http;

class PricePredictor
{
    private $apiUrl = 'http://localhost:8000';
    
    public function predict($propertyData)
    {
        try {
            $response = Http::timeout(30)
                ->post("{$this->apiUrl}/predict", $propertyData);
            
            if (!$response->successful()) {
                throw new \Exception('API Error: ' . $response->status());
            }
            
            return $response->json();
        } catch (\Exception $e) {
            \Log::error('Price prediction error: ' . $e->getMessage());
            return null;
        }
    }
}

// الاستخدام
$predictor = new PricePredictor();
$data = [
    'accommodates' => 4,
    'bedrooms' => 2,
    'bathrooms' => 1.5,
    'wilaya' => 'Alger',
    'property_type' => 'Apartment',
    'minimum_nights' => 1,
    'number_of_reviews' => 10,
    'review_scores_rating' => 4.5,
    'availability_365' => 300,
    'price_per_person' => 5000
];

$result = $predictor->predict($data);
if ($result) {
    echo "السعر: {$result['predicted_price']} {$result['currency']}";
}
```

### cURL

```bash
# فحص الحالة
curl http://localhost:8000/health

# الحصول على معلومات النموذج
curl http://localhost:8000/model-info

# التنبؤ
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

# التنبؤ المتعدد
curl -X POST http://localhost:8000/predict-batch \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {"accommodates": 4, "bedrooms": 2, ...},
      {"accommodates": 6, "bedrooms": 3, ...}
    ]
  }'
```

## 🔄 معدلات التحديث والحدود

| القيد | الحد |
|------|------|
| timeout الطلب | 120 ثانية |
| حجم الطلب الأقصى | 10 MB |
| عدد الطلبات المتزامنة | 1000 |
| الحد الأدنى للوقت بين الطلبات | بدون حد |

*ملاحظة: يمكن تعديل هذه الحدود حسب احتياجات الإنتاج.*

## 📊 نماذج البيانات Pydantic

### PredictionRequest

```json
{
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
}
```

### PredictionResponse

```json
{
  "predicted_price": 18500.50,
  "currency": "DZD",
  "confidence": 0.8765,
  "timestamp": "2026-04-15T12:30:45.123456",
  "request_id": "REQ-20260415123045"
}
```

### HealthResponse

```json
{
  "status": "healthy",
  "model_loaded": true,
  "features_count": 13,
  "encoders_count": 2,
  "last_trained": "20260415_120000"
}
```

## 🆘 معالجة الأخطاء

### خطأ في التحقق من البيانات (422)

```json
{
  "detail": [
    {
      "loc": ["body", "bedrooms"],
      "msg": "ensure this value is greater than 0",
      "type": "value_error"
    }
  ]
}
```

**الحل:** تحقق من صحة البيانات المدخلة أم أنها تلبي متطلبات التحقق.

### خدمة غير متاحة (503)

```json
{
  "detail": "Model not loaded. Please train the model first."
}
```

**الحل:** تأكد من تدريب النموذج أولاً.

### خطأ في الخادم (500)

```json
{
  "error": "Internal server error",
  "detail": "Error message here"
}
```

**الحل:** انظر السجلات لمزيد من التفاصيل.

## 📖 المراجع الإضافية

- [Swagger UI](http://localhost:8000/docs)
- [ReDoc](http://localhost:8000/redoc)
- [OpenAPI Schema](http://localhost:8000/openapi.json)

---

**آخر تحديث:** 2026-04-15

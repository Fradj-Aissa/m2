# SmartRentDZ ML API - Real Estate Price Prediction

A comprehensive machine learning pipeline for predicting real estate prices in Algeria using advanced regression models and Arabic NLP techniques.

## Overview

**SmartRentDZ ML API** is a production-ready price prediction system built with:
- **XGBoost, CatBoost, and RandomForest** models
- **5-Fold Cross-Validation** for robust evaluation
- **Target Encoding** for categorical variables
- **Arabic text feature extraction** for natural language processing
- **FastAPI** for REST API exposure
- **Joblib serialization** for model persistence

## Key Features

### 🎯 Advanced Machine Learning
- Three state-of-the-art regression models
- Automatic model selection based on MAE
- Cross-validation with 5 folds for stability
- Target encoding with smoothing to prevent overfitting

### 🌍 Arabic NLP
Automatic extraction of features from Arabic property descriptions:
- `دوبلكس` (duplex), `بحر` (sea view), `مجهز` (furnished)
- `مكيف` (AC equipped), `طراز` (stylish), `واسع` (spacious)
- `مرآب` (garage), `حديقة` (garden), `شرفة` (balcony)
- And more...

### 📊 Rich API
- Single property prediction
- Batch prediction for multiple properties
- Model metadata and feature importance
- Data validation and sanitization
- Comprehensive error handling

### 🔧 Production Ready
- Docker support
- Comprehensive logging
- Input validation
- Error handling
- Performance monitoring

## Installation

### Prerequisites
- Python 3.8+
- pip or conda
- 1GB free disk space (for models)

### Setup

```bash
# Clone or navigate to project
cd SMART-RENT-ML-API

# Install dependencies
pip install -r requirements.txt

# Train the model (one-time)
python app/ml_pipeline.py

# Verify model files
ls models/
# Should show: xgboost_model.pkl, scaler.pkl, features.pkl, feature_encodings.pkl, metadata.json, feature_importance_chart.png
```

## Quick Start

### 1. Train the Model

```bash
python app/ml_pipeline.py
```

This will:
- Load 350 properties from `final_data_with_users.json`
- Extract Arabic features from titles and descriptions
- Apply target encoding to categorical variables
- Train 3 models with 5-fold cross-validation
- Save the best model and preprocessors
- Generate feature importance visualization

Expected output:
```
╔════════════════════════════════════════════════════════════════════════════╗
║                SmartRentDZ ML Pipeline - Price Prediction                 ║
╚════════════════════════════════════════════════════════════════════════════╝

================================================================================
STEP 1: LOADING DATA
================================================================================
✓ Loaded 350 properties
✓ Features: ['id', 'title', 'description', 'price', ...]
...
```

### 2. Run the API Server

```bash
# Development mode with auto-reload
python -m uvicorn app.api_prediction:app --reload

# Production mode
python -m uvicorn app.api_prediction:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at: `http://localhost:8000`

### 3. Test a Prediction

```bash
# Using Python
python
>>> from app.ml_pipeline import predict_price
>>> property = {
...     "title": "دوبلكس فاخر",
...     "description": "شقة مجهزة",
...     "beds": 3, "bedrooms": 2, "bathrooms": 2, "guests": 5,
...     "rating": 4.5, "reviewCount": 15,
...     "wilaya": "Algiers", "neighborhood": "الجزائر",
...     "lat": 36.7745, "lng": 3.0607
... }
>>> result = predict_price(property)
>>> print(result['predicted_price'])
7250.45
```

Or using cURL:
```bash
curl -X POST "http://localhost:8000/api/predict-price" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "دوبلكس فاخر",
    "description": "شقة مجهزة",
    "beds": 3, "bedrooms": 2, "bathrooms": 2, "guests": 5,
    "rating": 4.5, "reviewCount": 15,
    "wilaya": "Algiers", "neighborhood": "الجزائر",
    "lat": 36.7745, "lng": 3.0607
  }'
```

## Project Structure

```
SMART-RENT-ML-API/
├── app/
│   ├── __init__.py
│   ├── ml_pipeline.py           # Main ML pipeline
│   ├── api_prediction.py         # FastAPI endpoints
│   └── utilities.py              # Helper functions
├── models/                        # Trained models & preprocessors
│   ├── xgboost_model.pkl
│   ├── scaler.pkl
│   ├── features.pkl
│   ├── feature_encodings.pkl
│   ├── metadata.json
│   └── feature_importance_chart.png
├── final_data_with_users.json    # Training data (350 properties)
├── requirements.txt
├── test_ml_pipeline.py           # Test suite
├── ML_PIPELINE_GUIDE.md          # Detailed technical guide
├── DEPLOYMENT_GUIDE.md           # Deployment instructions
└── README.md                      # This file
```

## API Documentation

### Base URL
```
http://localhost:8000
```

### Endpoints

#### 1. Health Check
```http
GET /health

Response:
{
  "status": "healthy",
  "service": "SmartRentDZ Price Prediction API",
  "version": "1.0.0"
}
```

#### 2. Predict Price (Single Property)
```http
POST /api/predict-price

Request:
{
  "title": "string (Arabic)",
  "description": "string (Arabic)",
  "beds": int,
  "bedrooms": int,
  "bathrooms": int,
  "guests": int,
  "rating": float (0-5),
  "reviewCount": int,
  "wilaya": string,
  "neighborhood": string (optional),
  "lat": float,
  "lng": float
}

Response:
{
  "predicted_price": 7250.45,
  "lower_bound": 6162.88,
  "upper_bound": 8337.02,
  "currency": "DZD",
  "confidence": "Medium",
  "model": "XGBoost"
}
```

#### 3. Batch Prediction
```http
POST /api/predict-batch

Request:
{
  "properties": [
    { property_data_1 },
    { property_data_2 },
    ...
  ]
}

Response:
{
  "status": "success",
  "total": 3,
  "successful": 3,
  "failed": 0,
  "predictions": [
    { "index": 0, "prediction": { ... } },
    { "index": 1, "prediction": { ... } },
    { "index": 2, "prediction": { ... } }
  ]
}
```

#### 4. Model Metadata
```http
GET /api/models/metadata

Response:
{
  "status": "success",
  "data": {
    "model_name": "XGBoost",
    "features_count": 24,
    "best_cv_mae": 750.5,
    "cv_results": { ... },
    "dataset_samples": 350,
    "target_stats": {
      "mean": 5000,
      "std": 2500,
      "min": 1000,
      "max": 15000
    }
  }
}
```

#### 5. Feature List
```http
GET /api/features

Response:
{
  "status": "success",
  "total_features": 24,
  "numerical_features": ["beds", "bedrooms", ...],
  "text_features": ["arabic_duplex", "arabic_sea_view", ...],
  "all_features": [...]
}
```

#### 6. Feature Importance
```http
GET /api/feature-importance

Response:
{
  "status": "success",
  "top_features": [
    { "Feature": "bedrooms", "Importance": 0.25 },
    { "Feature": "beds", "Importance": 0.20 },
    ...
  ]
}
```

#### 7. Validate Data
```http
POST /api/validate-prediction

Request:
{ property_data }

Response:
{
  "status": "success",
  "is_valid": true,
  "warnings": null
}
```

## Data Schema

### Input (Property Data)
```python
{
    "id": "string",
    "title": "string (Arabic)",              # Property title
    "description": "string (Arabic)",        # Property description
    "beds": int,                             # Number of beds
    "bedrooms": int,                         # Number of bedrooms
    "bathrooms": int,                        # Number of bathrooms
    "guests": int,                           # Max guests
    "rating": float,                         # Rating 0-5
    "reviewCount": int,                      # Number of reviews
    "wilaya": "string",                      # Province (e.g., "Algiers")
    "neighborhood": "string",                # Neighborhood
    "lat": float,                            # Latitude
    "lng": float                             # Longitude
}
```

## Model Details

### Models Compared
1. **XGBoost** - Gradient boosting with regularization
2. **CatBoost** - Categorical boosting with native categorical handling
3. **RandomForest** - Ensemble of decision trees

### Evaluation Metric
- **Primary**: Mean Absolute Error (MAE) in DZD
- **Secondary**: RMSE, R² Score
- **Validation**: 5-Fold Cross-Validation

### Feature Engineering
- **Numerical**: 10 features (beds, bedrooms, bathrooms, guests, rating, reviewCount, lat, lng, wilaya_encoded, neighborhood_encoded)
- **Categorical**: 14 Arabic text features extracted via regex

### Performance Expectations
- **MAE**: 500-1500 DZD
- **RMSE**: 800-2200 DZD
- **R²**: 0.65-0.85
- **Dataset**: 350 properties

## Testing

### Run Tests
```bash
# Full test suite
python test_ml_pipeline.py

# Quick validation
python test_ml_pipeline.py quick
```

### Example Tests
```python
# Validate property data
from app.utilities import DataValidator

property = {...}
result = DataValidator.validate_property(property)
print(result['is_valid'])

# Analyze predictions
from app.utilities import PriceAnalyzer

predictions = [1000, 2000, 3000, 4000, 5000]
stats = PriceAnalyzer.analyze_predictions(predictions)
print(f"Mean: {stats['mean']}, Std: {stats['std']}")
```

## Integration Examples

### With Node.js/Express
See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#integration-with-nodejs-backend)

### With Python/Flask
```python
from app.ml_pipeline import predict_price
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict():
    property_data = request.json
    prediction = predict_price(property_data)
    return jsonify(prediction)
```

### With Docker
See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#docker-deployment)

## Performance Tuning

### Model Selection
- XGBoost: Best for speed and accuracy
- CatBoost: Best for categorical features
- RandomForest: Most stable, less overfitting

### Feature Importance
Top influencers on price:
1. Number of bedrooms
2. Geographic location (wilaya)
3. Number of beds
4. Furnished status
5. Property type (duplex/villa)

### Batch Processing
```python
from app.ml_pipeline import predict_price
import asyncio

properties = [...]  # 1000+ properties

# Process in batches for efficiency
batch_size = 100
for i in range(0, len(properties), batch_size):
    batch = properties[i:i+batch_size]
    predictions = [predict_price(p) for p in batch]
```

## Troubleshooting

### Issue: ModuleNotFoundError
```bash
pip install --upgrade xgboost catboost matplotlib seaborn
```

### Issue: Model not found
```bash
# Verify models exist
ls -la models/

# Retrain if needed
python app/ml_pipeline.py
```

### Issue: Slow predictions
- Use batch API for multiple properties
- Enable caching for frequently predicted properties
- Consider GPU acceleration for very large batches

## Documentation

- [ML Pipeline Guide](ML_PIPELINE_GUIDE.md) - Detailed technical documentation
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production deployment instructions
- [FastAPI Docs](http://localhost:8000/docs) - Interactive API documentation

## Contributing

For improvements or bug reports:
1. Test changes locally
2. Update documentation
3. Run test suite
4. Submit changes

## License

Proprietary - SmartRentDZ Platform

## Support

For issues or questions:
- Check [ML_PIPELINE_GUIDE.md](ML_PIPELINE_GUIDE.md)
- Review [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- Run tests: `python test_ml_pipeline.py quick`

## Changelog

### Version 1.0.0 (2026-04-19)
- Initial release
- 3 model comparison (XGBoost, CatBoost, RandomForest)
- Arabic feature extraction
- 5-fold cross-validation
- FastAPI REST endpoints
- Batch prediction support
- Feature importance analysis

---

**Built with ❤️ for SmartRentDZ**

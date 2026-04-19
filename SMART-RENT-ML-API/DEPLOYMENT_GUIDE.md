# SmartRentDZ ML Pipeline - Deployment Guide

## Quick Start

### 1. Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Train the model
python app/ml_pipeline.py
```

### 2. Running the API Server

```bash
# Start FastAPI server
python -m uvicorn app.api_prediction:app --reload --host 0.0.0.0 --port 8000
```

### 3. Testing Predictions

```bash
# Single prediction via cURL
curl -X POST "http://localhost:8000/api/predict-price" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "دوبلكس فاخر",
    "description": "شقة مجهزة",
    "beds": 3,
    "bedrooms": 2,
    "bathrooms": 2,
    "guests": 5,
    "rating": 4.5,
    "reviewCount": 15,
    "wilaya": "Algiers",
    "neighborhood": "الجزائر",
    "lat": 36.7745,
    "lng": 3.0607
  }'
```

## API Endpoints

### Health Check
```
GET /health
```

### Price Prediction
```
POST /api/predict-price
Content-Type: application/json

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
  "neighborhood": string,
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

### Batch Prediction
```
POST /api/predict-batch
Content-Type: application/json

{
  "properties": [
    { property_data_1 },
    { property_data_2 },
    ...
  ]
}
```

### Model Metadata
```
GET /api/models/metadata

Returns training metrics and model information
```

### Feature List
```
GET /api/features

Returns all features used by the model
```

### Feature Importance
```
GET /api/feature-importance

Returns top 15 features by importance
```

### Data Validation
```
POST /api/validate-prediction
Content-Type: application/json

{ property_data }

Response:
{
  "status": "success",
  "is_valid": true,
  "warnings": null
}
```

## Integration with Node.js Backend

### Express.js Integration Example

```javascript
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Price prediction endpoint
app.post('/api/apartments/predict-price', async (req, res) => {
  try {
    // Validate data
    const validationResponse = await axios.post(
      'http://localhost:8000/api/validate-prediction',
      req.body
    );
    
    if (!validationResponse.data.is_valid) {
      return res.status(400).json({
        error: 'Invalid property data',
        warnings: validationResponse.data.warnings
      });
    }
    
    // Get prediction
    const prediction = await axios.post(
      'http://localhost:8000/api/predict-price',
      req.body
    );
    
    res.json(prediction.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch predictions
app.post('/api/apartments/batch-predict', async (req, res) => {
  try {
    const predictions = await axios.post(
      'http://localhost:8000/api/predict-batch',
      { properties: req.body }
    );
    
    res.json(predictions.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('API server running on port 3000');
});
```

## Python Integration

```python
from app.ml_pipeline import predict_price

# Single prediction
property_data = {
    "title": "دوبلكس فاخر مع إطلالة على البحر",
    "description": "شقة مجهزة بالكامل مع مكيف وحديقة",
    "beds": 3,
    "bedrooms": 2,
    "bathrooms": 2,
    "guests": 5,
    "rating": 4.5,
    "reviewCount": 15,
    "wilaya": "Algiers",
    "neighborhood": "الجزائر",
    "lat": 36.7745,
    "lng": 3.0607
}

prediction = predict_price(property_data)
print(f"Predicted Price: {prediction['predicted_price']} DZD")
```

## Docker Deployment

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run API server
CMD ["python", "-m", "uvicorn", "app.api_prediction:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  ml-api:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./models:/app/models
      - ./final_data_with_users.json:/app/final_data_with_users.json
    environment:
      - PYTHONUNBUFFERED=1

  backend:
    image: my-express-backend
    ports:
      - "3000:3000"
    depends_on:
      - ml-api
    environment:
      - ML_API_URL=http://ml-api:8000
```

## Production Checklist

- [ ] Install all dependencies
- [ ] Train the model
- [ ] Verify model files in `models/` directory
- [ ] Test API endpoints
- [ ] Configure environment variables
- [ ] Set up logging
- [ ] Enable CORS if needed
- [ ] Configure authentication
- [ ] Set up monitoring
- [ ] Configure auto-restart
- [ ] Set up database for prediction logging

## Environment Variables

```bash
# .env file
ML_API_PORT=8000
ML_API_HOST=0.0.0.0
MODEL_DIR=/app/models
DATA_DIR=/app/data
LOG_LEVEL=INFO
```

## Monitoring

### Prediction Logging

```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info(f"Prediction: {property_id}, Price: {prediction['predicted_price']}")
```

### Performance Metrics

- Track average prediction time
- Monitor API response times
- Log prediction accuracy
- Monitor memory usage

## Troubleshooting

### ModuleNotFoundError

```bash
pip install --upgrade xgboost catboost matplotlib seaborn
```

### CORS Issues

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Model Not Found

Ensure models are trained and saved:
```bash
python app/ml_pipeline.py
ls models/
```

## Performance Tips

1. **Batch Predictions**: Use batch endpoint for multiple properties
2. **Caching**: Cache predictions for frequently requested properties
3. **Load Balancing**: Use multiple API instances behind a load balancer
4. **Async Processing**: Use async functions for I/O operations
5. **Database**: Store predictions for offline analysis

## Updating the Model

```bash
# Retrain model with new data
python app/ml_pipeline.py

# Backup old model
mv models/xgboost_model.pkl models/xgboost_model.pkl.backup

# New model automatically ready for use
```

## Version Management

```python
# Version tracking in metadata
{
  "model_version": "1.0.0",
  "training_date": "2026-04-19",
  "data_version": "final_data_with_users.json",
  "features": [...],
  "performance": {
    "cv_mae": 750.5
  }
}
```

## References

- FastAPI: https://fastapi.tiangolo.com/
- XGBoost: https://xgboost.readthedocs.io/
- Docker: https://www.docker.com/
- Uvicorn: https://www.uvicorn.org/

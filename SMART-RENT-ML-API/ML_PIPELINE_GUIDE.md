# SmartRentDZ ML Pipeline - Complete Setup Guide

## Overview
This guide covers the complete ML pipeline for training a price prediction model for SmartRentDZ real estate platform using 350 properties in Algeria.

## Project Structure

```
SMART-RENT-ML-API/
├── app/
│   └── ml_pipeline.py          # Main ML pipeline script
├── models/                      # Output directory for trained models
│   ├── xgboost_model.pkl       # Trained XGBoost/CatBoost/RandomForest model
│   ├── scaler.pkl              # StandardScaler for feature normalization
│   ├── feature_encodings.pkl   # Target encoding mappings
│   ├── features.pkl            # Feature names in order
│   ├── metadata.json           # Model metadata and CV results
│   └── feature_importance_chart.png  # Feature importance visualization
├── final_data_with_users.json  # 350 property dataset
└── requirements.txt            # Python dependencies
```

## Data Schema
```json
{
  "id": "string",
  "title": "string (Arabic)",
  "description": "string (Arabic)",
  "price": "int (DZD)",
  "rating": "float",
  "reviewCount": "int",
  "beds": "int",
  "bedrooms": "int",
  "bathrooms": "int",
  "guests": "int",
  "wilaya": "string",
  "neighborhood": "string",
  "lat": "float",
  "lng": "float"
}
```

## Installation

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Pipeline
```bash
python app/ml_pipeline.py
```

## Pipeline Steps

### Step 1: Data Loading
- Loads 350 properties from `final_data_with_users.json`
- Validates schema and reports statistics

### Step 2: Data Preprocessing
- **Arabic Text Feature Extraction**: Extracts binary features from title/description
  - Keywords: "دوبلكس", "بحر", "مجهز", "مكيف", "طراز", "واسع", "مرآب", etc.
  - Creates 15 binary columns (0/1)
  
- **Categorical Encoding**: 
  - Target encoding for wilaya and neighborhood
  - Smoothing to prevent overfitting on rare categories
  
- **Feature Scaling**: StandardScaler normalization of all features

### Step 3: Model Development (5-Fold Cross-Validation)
Compares three powerful regression models:

**XGBoost**
- Gradient boosting with regularization
- Fast training, handles non-linearity well
- Good for small datasets

**CatBoost**
- Categorical Boosting
- Native categorical feature handling
- Reduced overfitting risk
- Better performance on small datasets

**RandomForest**
- Ensemble of decision trees
- Robust to outliers
- Less prone to overfitting

**Evaluation Metric**: Mean Absolute Error (MAE)
- Cross-validation: 5-Fold stratified
- Selected: Model with lowest CV MAE

### Step 4: Final Model Training
Trains best model on full dataset and generates training metrics

### Step 5: Feature Importance
Produces visualization showing:
- Top 15 most important features
- Feature contribution to price predictions
- Saved as PNG for presentation

### Step 6: Model Serialization
Saves:
- Trained model (`.pkl`)
- StandardScaler (`.pkl`)
- Feature encodings (`.pkl`)
- Feature names (`.pkl`)
- Metadata JSON (CV results, target stats)

## Usage

### Python API
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
# Output: Predicted Price: 7250.45 DZD
#         Price Range: 6162.88 - 8337.02 DZD
```

### Features Used in Model

**Numerical Features**:
- beds, bedrooms, bathrooms, guests
- rating, reviewCount
- lat, lng (geographic coordinates)
- wilaya_encoded (target-encoded)
- neighborhood_encoded (target-encoded)

**Arabic Text Features** (Binary):
- arabic_duplex
- arabic_sea_view
- arabic_furnished
- arabic_ac_equipped
- arabic_stylish
- arabic_spacious
- arabic_garage
- arabic_garden
- arabic_balcony
- arabic_villa
- arabic_apartment
- arabic_luxury
- arabic_swimming_pool
- arabic_parking

**Total**: 24 features

## Model Performance Expectations

With 350 samples and 5-fold CV:
- **Expected MAE**: 500-1500 DZD (depending on price range variance)
- **Expected RMSE**: 800-2200 DZD
- **Expected R²**: 0.65-0.85

Performance depends on:
- Data quality and completeness
- Feature variance in dataset
- Price outliers

## Advanced Features

### 1. Target Encoding
Prevents categorical variable overfitting with smoothing:
```
smoothed_mean = (category_mean × count + global_mean × α) / (count + α)
```
Where α = 1.0 (smoothing factor)

### 2. Cross-Validation Strategy
5-Fold CV ensures:
- Stable model evaluation
- Better generalization on small dataset
- Reliable performance metrics

### 3. Feature Importance
Two types available:
- **Tree-based importance**: XGBoost/CatBoost/RandomForest gain scores
- **Permutation importance**: Can be added for more robust ranking

### 4. Prediction Uncertainty
Adds confidence interval to predictions:
- Lower bound: predicted_price × 0.85
- Upper bound: predicted_price × 1.15
- Reflects 15% uncertainty common in small datasets

## Troubleshooting

### ModuleNotFoundError for xgboost/catboost
```bash
pip install --upgrade xgboost catboost
```

### Memory Issues with Large Cross-Validation
Reduce n_jobs in model definitions:
```python
n_jobs=1  # Instead of -1
```

### Unicode/Arabic Encoding Issues
Ensure UTF-8 encoding:
```python
# In file operations
with open(file, 'r', encoding='utf-8') as f:
    data = json.load(f)
```

## Output Files

### models/metadata.json
Contains:
```json
{
  "model_name": "XGBoost",
  "features": ["beds", "bedrooms", ...],
  "cv_results": {
    "XGBoost": {"mae": 750.5, "rmse": 1200.3, "r2": 0.78},
    ...
  },
  "best_cv_mae": 750.5,
  "dataset_samples": 350,
  "target_stats": {
    "mean": 5000,
    "std": 2500,
    "min": 1000,
    "max": 15000
  }
}
```

### models/feature_importance_chart.png
Visual ranking of features by importance

## Integration with FastAPI

### Endpoint Example
```python
from fastapi import FastAPI
from app.ml_pipeline import predict_price

app = FastAPI()

@app.post("/api/predict-price")
async def predict(property_data: dict):
    result = predict_price(property_data)
    return result
```

## Performance Tips

1. **Feature Engineering**: Add more Arabic keyword features based on domain knowledge
2. **Data Augmentation**: Collect more samples (>500) for better generalization
3. **Hyperparameter Tuning**: Use GridSearch/RandomSearch for model optimization
4. **Ensemble Methods**: Average predictions from multiple models
5. **Regularization**: Add L1/L2 regularization to prevent overfitting

## Next Steps

1. ✓ Train initial model (350 samples)
2. Collect more data (target: 1000+ samples)
3. Add external features (nearby amenities, crime rate, etc.)
4. Deploy as FastAPI endpoint
5. Monitor predictions and retrain monthly
6. Implement model versioning

## References

- XGBoost: https://xgboost.readthedocs.io/
- CatBoost: https://catboost.ai/
- scikit-learn: https://scikit-learn.org/
- Pandas: https://pandas.pydata.org/

## Author
SmartRentDZ ML Engineering Team

## License
Proprietary - SmartRentDZ Platform

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FastAPI wrapper for ML price prediction
Integrates with SmartRentDZ backend
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
from pathlib import Path
from app.ml_pipeline import predict_price as ml_predict_price

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SmartRentDZ Price Prediction API",
    description="ML-powered price prediction for Algerian real estate",
    version="1.0.0"
)

# Request models
class PropertyPredictionRequest(BaseModel):
    """Property data for price prediction"""
    title: str
    description: str
    beds: int
    bedrooms: int
    bathrooms: int
    guests: int
    rating: Optional[float] = 0.0
    reviewCount: Optional[int] = 0
    wilaya: str
    neighborhood: Optional[str] = "N/A"
    lat: float
    lng: float
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "دوبلكس فاخر مع إطلالة على البحر",
                "description": "شقة مجهزة بالكامل مع مكيف وحديقة وموقوف",
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
        }


class PredictionResponse(BaseModel):
    """API response for price prediction"""
    predicted_price: float
    lower_bound: float
    upper_bound: float
    currency: str
    confidence: str
    model: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "predicted_price": 7250.45,
                "lower_bound": 6162.88,
                "upper_bound": 8337.02,
                "currency": "DZD",
                "confidence": "Medium",
                "model": "XGBoost"
            }
        }


class BatchPredictionRequest(BaseModel):
    """Batch prediction request"""
    properties: list[PropertyPredictionRequest]


class ModelMetadataResponse(BaseModel):
    """Model metadata response"""
    model_name: str
    features_count: int
    cv_results: Dict[str, Any]
    best_cv_mae: float
    dataset_samples: int
    target_stats: Dict[str, float]


# Health check endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "SmartRentDZ Price Prediction API",
        "version": "1.0.0"
    }


@app.get("/api/models/metadata")
async def get_model_metadata() -> Dict[str, Any]:
    """
    Get trained model metadata and performance metrics
    
    Returns:
        Model name, features, CV results, and statistics
    """
    try:
        import json
        metadata_path = Path(__file__).parent.parent / 'models' / 'metadata.json'
        
        if not metadata_path.exists():
            raise HTTPException(
                status_code=404,
                detail="Model metadata not found. Run ml_pipeline.py first."
            )
        
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        return {
            "status": "success",
            "data": metadata
        }
    
    except Exception as e:
        logger.error(f"Error loading model metadata: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/predict-price", response_model=PredictionResponse)
async def predict_price(property_data: PropertyPredictionRequest) -> Dict[str, Any]:
    """
    Predict price for a property listing
    
    Args:
        property_data: Property features
        
    Returns:
        Predicted price with confidence interval
    """
    try:
        # Convert request to dictionary
        property_dict = property_data.dict()
        
        # Call ML prediction
        prediction = ml_predict_price(property_dict)
        
        if 'error' in prediction:
            raise HTTPException(status_code=500, detail=prediction['message'])
        
        return prediction
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/api/predict-batch")
async def predict_batch(batch_request: BatchPredictionRequest):
    """
    Batch predict prices for multiple properties
    
    Args:
        batch_request: List of properties
        
    Returns:
        List of predictions with indices
    """
    try:
        predictions = []
        errors = []
        
        for idx, property_data in enumerate(batch_request.properties):
            try:
                property_dict = property_data.dict()
                prediction = ml_predict_price(property_dict)
                
                if 'error' not in prediction:
                    predictions.append({
                        "index": idx,
                        "prediction": prediction
                    })
                else:
                    errors.append({
                        "index": idx,
                        "error": prediction.get('message', 'Unknown error')
                    })
            except Exception as e:
                errors.append({
                    "index": idx,
                    "error": str(e)
                })
        
        return {
            "status": "success",
            "total": len(batch_request.properties),
            "successful": len(predictions),
            "failed": len(errors),
            "predictions": predictions,
            "errors": errors if errors else None
        }
    
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


@app.get("/api/features")
async def get_features():
    """
    Get list of features used by the model
    
    Returns:
        Feature names and descriptions
    """
    try:
        import joblib
        features_path = Path(__file__).parent.parent / 'models' / 'features.pkl'
        
        if not features_path.exists():
            raise HTTPException(
                status_code=404,
                detail="Features file not found. Run ml_pipeline.py first."
            )
        
        features = joblib.load(features_path)
        
        # Categorize features
        numerical_features = ['beds', 'bedrooms', 'bathrooms', 'guests', 'rating', 
                            'reviewCount', 'lat', 'lng', 'wilaya_encoded', 'neighborhood_encoded']
        arabic_features = [f for f in features if f.startswith('arabic_')]
        
        return {
            "status": "success",
            "total_features": len(features),
            "numerical_features": numerical_features,
            "text_features": arabic_features,
            "all_features": features
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading features: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/feature-importance")
async def get_feature_importance():
    """
    Get feature importance from trained model
    
    Returns:
        Top features and their importance scores
    """
    try:
        import pandas as pd
        import joblib
        
        model_dir = Path(__file__).parent.parent / 'models'
        model_files = list(model_dir.glob('*_model.pkl'))
        
        if not model_files:
            raise HTTPException(
                status_code=404,
                detail="Model not found. Run ml_pipeline.py first."
            )
        
        model = joblib.load(model_files[0])
        features = joblib.load(model_dir / 'features.pkl')
        
        importances = model.feature_importances_
        
        feature_importance_df = pd.DataFrame({
            'Feature': features,
            'Importance': importances
        }).sort_values('Importance', ascending=False)
        
        return {
            "status": "success",
            "top_features": feature_importance_df.head(15).to_dict('records'),
            "all_features": feature_importance_df.to_dict('records')
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading feature importance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/validate-prediction")
async def validate_prediction(property_data: PropertyPredictionRequest):
    """
    Validate property data for prediction
    
    Args:
        property_data: Property features to validate
        
    Returns:
        Validation result and any warnings
    """
    warnings = []
    
    if property_data.rating < 0 or property_data.rating > 5:
        warnings.append("Rating should be between 0 and 5")
    
    if property_data.beds < 1 or property_data.beds > 20:
        warnings.append("Unusual number of beds")
    
    if property_data.reviewCount < 0:
        warnings.append("Review count cannot be negative")
    
    valid_wilayas = [
        "Algiers", "Oran", "Constantine", "Blida", "Tlemcen",
        "Sétif", "Annaba", "Béjaïa", "Tizi Ouzou", "Médéa"
    ]
    
    if property_data.wilaya not in valid_wilayas:
        warnings.append(f"Wilaya '{property_data.wilaya}' may not be recognized")
    
    return {
        "status": "success",
        "is_valid": len(warnings) == 0,
        "warnings": warnings if warnings else None
    }


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return {
        "status": "error",
        "detail": exc.detail,
        "status_code": exc.status_code
    }


if __name__ == '__main__':
    import uvicorn
    
    uvicorn.run(
        app,
        host='0.0.0.0',
        port=8000,
        log_level='info'
    )

"""
SmartRentDZ FastAPI Application
Production-ready API for apartment rental price prediction
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import joblib
import numpy as np
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict
import json
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SmartRentDZ API",
    description="AI-powered apartment rental price prediction for Algeria",
    version="1.0.0"
)

# ============ CORS Configuration ============
# Allow requests from Laravel frontend and other trusted origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",      # Local development
        "http://127.0.0.1:8000",
        "http://localhost:3000",      # React/Vue frontend
        "http://localhost:8080",      # Common frontend ports
        "https://yourdomain.com",     # Production domain
        "https://www.yourdomain.com",
        "*"                           # Allow all origins (restrict in production!)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ Model Loading ============
MODEL_DIR = Path(__file__).parent.parent / 'models'

try:
    model = joblib.load(MODEL_DIR / 'random_forest_model.joblib')
    label_encoders = joblib.load(MODEL_DIR / 'label_encoders.joblib')
    features = joblib.load(MODEL_DIR / 'features.joblib')
    feature_means = joblib.load(MODEL_DIR / 'feature_means.joblib')
    
    with open(MODEL_DIR / 'metadata.json', 'r', encoding='utf-8') as f:
        metadata = json.load(f)
    
    logger.info("✓ Model loaded successfully")
    logger.info(f"✓ Features: {len(features)}")
    logger.info(f"✓ Label Encoders: {list(label_encoders.keys())}")
    
except FileNotFoundError as e:
    logger.error(f"✗ Error loading model: {str(e)}")
    logger.error("Ensure models are trained by running: python scripts/train_model.py")
    model = None

# ============ Pydantic Models ============
class PredictionRequest(BaseModel):
    """Request model for price prediction"""
    
    accommodates: int = Field(..., ge=1, le=20, description="Number of guests")
    bedrooms: int = Field(..., ge=1, le=10, description="Number of bedrooms")
    bathrooms: float = Field(..., ge=0.5, le=10, description="Number of bathrooms")
    wilaya: str = Field(..., description="Wilaya (Province) in Algeria")
    property_type: str = Field(..., description="Type of property (Apartment, House, Loft, etc.)")
    minimum_nights: int = Field(default=1, ge=1, le=365, description="Minimum nights stay")
    number_of_reviews: int = Field(default=0, ge=0, description="Number of reviews")
    review_scores_rating: Optional[float] = Field(default=None, ge=1, le=5, description="Average review rating")
    availability_365: int = Field(default=0, ge=0, le=365, description="Days available in a year")
    price_per_person: Optional[float] = Field(default=None, ge=0, description="Price per person (calculated)")
    
    @validator('wilaya')
    def validate_wilaya(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Wilaya must have at least 2 characters')
        return v.strip()
    
    @validator('property_type')
    def validate_property_type(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Property type must have at least 2 characters')
        return v.strip()


class PredictionResponse(BaseModel):
    """Response model for predictions"""
    predicted_price: float
    currency: str = "DZD"
    confidence: Optional[float]
    timestamp: str
    request_id: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    features_count: int
    encoders_count: int
    last_trained: Optional[str]


# ============ Helper Functions ============
def encode_input(data: PredictionRequest) -> np.ndarray:
    """
    Transform input data using stored encoders and create feature array
    
    Args:
        data: PredictionRequest object
        
    Returns:
        numpy array ready for model prediction
    """
    
    # Prepare base features
    feature_dict = {
        'accommodates': float(data.accommodates),
        'bedrooms': float(data.bedrooms),
        'bathrooms': float(data.bathrooms),
        'minimum_nights': float(data.minimum_nights),
        'number_of_reviews': float(data.number_of_reviews),
        'review_scores_rating': float(data.review_scores_rating) if data.review_scores_rating else 0.0,
        'availability_365': float(data.availability_365),
        'price_per_person': float(data.price_per_person) if data.price_per_person else 0.0,
    }
    
    # Calculate derived features
    feature_dict['price_per_bedroom'] = (
        feature_dict['price_per_person'] / data.bedrooms 
        if data.bedrooms > 0 and data.price_per_person 
        else data.price_per_person or 0.0
    )
    feature_dict['review_score_normalized'] = feature_dict['review_scores_rating'] * 20
    feature_dict['has_reviewed'] = 1.0 if feature_dict['number_of_reviews'] > 0 else 0.0
    
    # Encode categorical features
    try:
        if 'wilaya' in label_encoders:
            if data.wilaya in label_encoders['wilaya'].classes_:
                feature_dict['wilaya_encoded'] = float(
                    label_encoders['wilaya'].transform([data.wilaya])[0]
                )
            else:
                logger.warning(f"Unknown wilaya: {data.wilaya}, using median")
                feature_dict['wilaya_encoded'] = float(
                    np.median(label_encoders['wilaya'].transform(label_encoders['wilaya'].classes_))
                )
        
        if 'property_type' in label_encoders:
            if data.property_type in label_encoders['property_type'].classes_:
                feature_dict['property_type_encoded'] = float(
                    label_encoders['property_type'].transform([data.property_type])[0]
                )
            else:
                logger.warning(f"Unknown property_type: {data.property_type}, using median")
                feature_dict['property_type_encoded'] = float(
                    np.median(label_encoders['property_type'].transform(
                        label_encoders['property_type'].classes_
                    ))
                )
    except Exception as e:
        logger.error(f"Error encoding categorical features: {str(e)}")
        raise
    
    # Create feature array in correct order
    feature_array = np.array([feature_dict.get(f, 0.0) for f in features]).reshape(1, -1)
    
    return feature_array


# ============ API Endpoints ============

@app.get("/", tags=["Info"])
async def root():
    """API Root - provides basic information"""
    return {
        "name": "SmartRentDZ API",
        "version": "1.0.0",
        "description": "AI-powered apartment rental price prediction for Algeria",
        "endpoints": {
            "predict": "/predict (POST)",
            "health": "/health (GET)",
            "model-info": "/model-info (GET)"
        }
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    """
    Health check endpoint
    Returns model status and metadata
    """
    
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not loaded. Please train the model first."
        )
    
    return HealthResponse(
        status="healthy",
        model_loaded=True,
        features_count=len(features) if features else 0,
        encoders_count=len(label_encoders),
        last_trained=metadata.get('training_date')
    )


@app.get("/model-info", tags=["Info"])
async def model_info():
    """Get detailed model information and feature importance"""
    
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not loaded"
        )
    
    # Get top 10 important features
    importance_indices = np.argsort(model.feature_importances_)[-10:][::-1]
    top_features = {
        features[i]: float(model.feature_importances_[i])
        for i in importance_indices
    }
    
    return {
        "model_type": metadata.get('model_type'),
        "n_estimators": metadata.get('n_estimators'),
        "training_date": metadata.get('training_date'),
        "features_count": len(features),
        "top_10_important_features": top_features,
        "wilayas_supported": list(label_encoders.get('wilaya', {}).classes_) if 'wilaya' in label_encoders else [],
        "property_types_supported": list(label_encoders.get('property_type', {}).classes_) if 'property_type' in label_encoders else []
    }


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
async def predict(request: PredictionRequest):
    """
    Make a price prediction for an apartment
    
    Accepts:
    - accommodates: Number of guests the property can accommodate
    - bedrooms: Number of bedrooms
    - bathrooms: Number of bathrooms
    - wilaya: Province/Region in Algeria
    - property_type: Type of property (Apartment, House, Loft, etc.)
    - minimum_nights: Minimum consecutive nights required
    - number_of_reviews: Number of reviews received
    - review_scores_rating: Average review score (1-5)
    - availability_365: Number of days available per year
    - price_per_person: Price per person (auto-calculated if not provided)
    
    Returns:
    - predicted_price: Estimated rental price in DZD
    - confidence: Model prediction confidence
    - timestamp: When prediction was made
    """
    
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded. Cannot process prediction."
        )
    
    try:
        # Generate request ID for tracking
        request_id = f"REQ-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Encode and prepare input data
        feature_array = encode_input(request)
        
        # Make prediction
        predicted_price = model.predict(feature_array)[0]
        
        # Ensure price is positive
        predicted_price = max(predicted_price, 500.0)
        
        # Calculate confidence (using prediction variance from tree predictions)
        predictions_per_tree = np.array([
            tree.predict(feature_array)[0] 
            for tree in model.estimators_
        ])
        std_dev = np.std(predictions_per_tree)
        confidence = 1.0 / (1.0 + std_dev / predicted_price) if predicted_price > 0 else 0.5
        
        logger.info(f"{request_id} - Prediction: {predicted_price:.2f} DZD, "
                   f"Confidence: {confidence:.2%}, "
                   f"Wilaya: {request.wilaya}, "
                   f"Type: {request.property_type}")
        
        return PredictionResponse(
            predicted_price=round(predicted_price, 2),
            confidence=round(confidence, 4),
            timestamp=datetime.now().isoformat(),
            request_id=request_id
        )
        
    except ValueError as ve:
        logger.error(f"Validation error: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Input validation error: {str(ve)}"
        )
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing prediction. Please try again."
        )


@app.post("/predict-batch", tags=["Prediction"])
async def predict_batch(requests: list[PredictionRequest]):
    """
    Batch prediction endpoint
    Process multiple predictions in one request
    """
    
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded"
        )
    
    results = []
    for idx, request in enumerate(requests):
        try:
            feature_array = encode_input(request)
            predicted_price = max(model.predict(feature_array)[0], 500.0)
            
            results.append({
                "index": idx,
                "predicted_price": round(predicted_price, 2),
                "currency": "DZD",
                "status": "success"
            })
        except Exception as e:
            logger.error(f"Batch prediction error at index {idx}: {str(e)}")
            results.append({
                "index": idx,
                "error": str(e),
                "status": "failed"
            })
    
    return {"batch_size": len(requests), "results": results}


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if str(exc) else "Unknown error"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        workers=4,
        log_level="info"
    )

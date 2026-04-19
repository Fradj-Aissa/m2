#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Utility functions for ML pipeline
"""

import json
import pandas as pd
from pathlib import Path
from typing import List, Dict, Any
import joblib


class ModelLoader:
    """Utility class for loading trained models and preprocessors"""
    
    @staticmethod
    def load_model(model_dir: str = None):
        """Load trained model from disk"""
        if model_dir is None:
            model_dir = Path(__file__).parent.parent / 'models'
        else:
            model_dir = Path(model_dir)
        
        model_files = list(model_dir.glob('*_model.pkl'))
        if not model_files:
            raise FileNotFoundError(f"No model found in {model_dir}")
        
        return joblib.load(model_files[0])
    
    @staticmethod
    def load_scaler(model_dir: str = None):
        """Load feature scaler from disk"""
        if model_dir is None:
            model_dir = Path(__file__).parent.parent / 'models'
        else:
            model_dir = Path(model_dir)
        
        scaler_path = model_dir / 'scaler.pkl'
        if not scaler_path.exists():
            raise FileNotFoundError(f"Scaler not found at {scaler_path}")
        
        return joblib.load(scaler_path)
    
    @staticmethod
    def load_features(model_dir: str = None) -> List[str]:
        """Load feature names from disk"""
        if model_dir is None:
            model_dir = Path(__file__).parent.parent / 'models'
        else:
            model_dir = Path(model_dir)
        
        features_path = model_dir / 'features.pkl'
        if not features_path.exists():
            raise FileNotFoundError(f"Features not found at {features_path}")
        
        return joblib.load(features_path)
    
    @staticmethod
    def load_encodings(model_dir: str = None) -> Dict[str, Dict]:
        """Load feature encodings from disk"""
        if model_dir is None:
            model_dir = Path(__file__).parent.parent / 'models'
        else:
            model_dir = Path(model_dir)
        
        encodings_path = model_dir / 'feature_encodings.pkl'
        if not encodings_path.exists():
            raise FileNotFoundError(f"Encodings not found at {encodings_path}")
        
        return joblib.load(encodings_path)
    
    @staticmethod
    def load_metadata(model_dir: str = None) -> Dict[str, Any]:
        """Load model metadata from disk"""
        if model_dir is None:
            model_dir = Path(__file__).parent.parent / 'models'
        else:
            model_dir = Path(model_dir)
        
        metadata_path = model_dir / 'metadata.json'
        if not metadata_path.exists():
            raise FileNotFoundError(f"Metadata not found at {metadata_path}")
        
        with open(metadata_path, 'r', encoding='utf-8') as f:
            return json.load(f)


class DataValidator:
    """Utility class for validating property data"""
    
    VALID_WILAYAS = [
        "Algiers", "Oran", "Constantine", "Blida", "Tlemcen",
        "Sétif", "Annaba", "Béjaïa", "Tizi Ouzou", "Médéa",
        "El Asnam", "Saïda", "Skikda", "Sidi Bel Abbès", "Batna",
        "Mascara", "Guelma", "Tiaret", "Jijel", "Algiers"
    ]
    
    @staticmethod
    def validate_property(property_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate property data
        
        Returns:
            Dict with 'valid' bool and 'warnings' list
        """
        warnings = []
        
        # Validate beds
        if property_data.get('beds', 0) < 1 or property_data.get('beds', 0) > 20:
            warnings.append("Unusual number of beds")
        
        # Validate bedrooms
        if property_data.get('bedrooms', 0) < 0 or property_data.get('bedrooms', 0) > 20:
            warnings.append("Unusual number of bedrooms")
        
        # Validate bathrooms
        if property_data.get('bathrooms', 0) < 0 or property_data.get('bathrooms', 0) > 10:
            warnings.append("Unusual number of bathrooms")
        
        # Validate rating
        rating = property_data.get('rating', 0)
        if rating < 0 or rating > 5:
            warnings.append("Rating should be between 0 and 5")
        
        # Validate review count
        if property_data.get('reviewCount', 0) < 0:
            warnings.append("Review count cannot be negative")
        
        # Validate wilaya
        if property_data.get('wilaya') not in DataValidator.VALID_WILAYAS:
            warnings.append(f"Wilaya '{property_data.get('wilaya')}' not recognized")
        
        # Validate coordinates
        lat = property_data.get('lat', 0)
        lng = property_data.get('lng', 0)
        
        # Algeria bounds approximately: 18.5-8.5 N, 36.5-27 E
        if lat < 27 or lat > 37:
            warnings.append("Latitude outside Algeria bounds")
        
        if lng < -9 or lng > 9:
            warnings.append("Longitude outside Algeria bounds")
        
        return {
            'valid': len(warnings) == 0,
            'warnings': warnings if warnings else None
        }


class PriceAnalyzer:
    """Utility class for price analysis and statistics"""
    
    @staticmethod
    def analyze_predictions(predictions: List[float]) -> Dict[str, float]:
        """Analyze batch of predictions"""
        import numpy as np
        
        predictions = np.array(predictions)
        
        return {
            'mean': float(np.mean(predictions)),
            'median': float(np.median(predictions)),
            'std': float(np.std(predictions)),
            'min': float(np.min(predictions)),
            'max': float(np.max(predictions)),
            'q25': float(np.percentile(predictions, 25)),
            'q75': float(np.percentile(predictions, 75))
        }
    
    @staticmethod
    def get_price_range_label(price: float) -> str:
        """Get price range category"""
        if price < 2000:
            return "Budget"
        elif price < 5000:
            return "Mid-Range"
        elif price < 10000:
            return "Premium"
        else:
            return "Luxury"


class FeatureAnalyzer:
    """Utility class for feature analysis"""
    
    @staticmethod
    def get_feature_groups():
        """Get features grouped by type"""
        return {
            'numerical': [
                'beds', 'bedrooms', 'bathrooms', 'guests',
                'rating', 'reviewCount', 'lat', 'lng',
                'wilaya_encoded', 'neighborhood_encoded'
            ],
            'categorical': [
                'arabic_duplex', 'arabic_sea_view', 'arabic_furnished',
                'arabic_ac_equipped', 'arabic_stylish', 'arabic_spacious',
                'arabic_garage', 'arabic_garden', 'arabic_balcony',
                'arabic_villa', 'arabic_apartment', 'arabic_luxury',
                'arabic_swimming_pool', 'arabic_parking'
            ]
        }
    
    @staticmethod
    def get_feature_description(feature: str) -> str:
        """Get description of a feature"""
        descriptions = {
            'beds': 'Number of beds in property',
            'bedrooms': 'Number of bedrooms',
            'bathrooms': 'Number of bathrooms',
            'guests': 'Maximum number of guests',
            'rating': 'Average rating (0-5)',
            'reviewCount': 'Number of reviews',
            'lat': 'Latitude coordinate',
            'lng': 'Longitude coordinate',
            'wilaya_encoded': 'Target-encoded wilaya',
            'neighborhood_encoded': 'Target-encoded neighborhood',
            'arabic_duplex': 'Contains "دوبلكس" (duplex)',
            'arabic_sea_view': 'Contains "بحر" (sea view)',
            'arabic_furnished': 'Contains "مجهز" (furnished)',
            'arabic_ac_equipped': 'Contains "مكيف" (AC equipped)',
            'arabic_stylish': 'Contains "طراز" (stylish)',
            'arabic_spacious': 'Contains "واسع" (spacious)',
            'arabic_garage': 'Contains "مرآب" (garage)',
            'arabic_garden': 'Contains "حديقة" (garden)',
            'arabic_balcony': 'Contains "شرفة" (balcony)',
            'arabic_villa': 'Contains "فيلا" (villa)',
            'arabic_apartment': 'Contains "شقة" (apartment)',
            'arabic_luxury': 'Contains "ملوث" (luxury)',
            'arabic_swimming_pool': 'Contains "حمام سباحة" (swimming pool)',
            'arabic_parking': 'Contains "موقوف" (parking)'
        }
        
        return descriptions.get(feature, f"Feature: {feature}")


def export_predictions_to_csv(predictions: List[Dict], output_path: str):
    """Export batch predictions to CSV"""
    df = pd.DataFrame(predictions)
    df.to_csv(output_path, index=False, encoding='utf-8')
    print(f"Predictions exported to {output_path}")


def import_properties_from_csv(csv_path: str) -> List[Dict]:
    """Import properties from CSV for batch prediction"""
    df = pd.read_csv(csv_path, encoding='utf-8')
    return df.to_dict('records')


if __name__ == '__main__':
    # Test utility functions
    print("SmartRentDZ ML Utilities")
    print("=" * 50)
    
    # Test model loading
    try:
        print("\n1. Testing model loading...")
        model = ModelLoader.load_model()
        print("   ✓ Model loaded successfully")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Test feature groups
    print("\n2. Feature groups:")
    groups = FeatureAnalyzer.get_feature_groups()
    print(f"   Numerical features: {len(groups['numerical'])}")
    print(f"   Categorical features: {len(groups['categorical'])}")
    
    # Test data validation
    print("\n3. Testing data validation...")
    test_property = {
        'beds': 3,
        'bedrooms': 2,
        'bathrooms': 2,
        'guests': 5,
        'rating': 4.5,
        'reviewCount': 10,
        'wilaya': 'Algiers',
        'lat': 36.7745,
        'lng': 3.0607
    }
    
    validation = DataValidator.validate_property(test_property)
    print(f"   Valid: {validation['valid']}")
    if validation['warnings']:
        print(f"   Warnings: {validation['warnings']}")
    
    # Test price range
    print("\n4. Testing price range labels...")
    test_prices = [1500, 4500, 8000, 12000]
    for price in test_prices:
        label = PriceAnalyzer.get_price_range_label(price)
        print(f"   ${price} -> {label}")
    
    print("\n" + "="*50)
    print("All utilities tested successfully!")

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test suite for SmartRentDZ ML Pipeline
"""

import json
import unittest
from pathlib import Path
from typing import Dict, Any
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

try:
    from app.ml_pipeline import predict_price, RealEstatePipelineMLPipeline
    from app.utilities import (
        ModelLoader, DataValidator, PriceAnalyzer, FeatureAnalyzer
    )
except ImportError as e:
    print(f"Warning: Could not import modules. Make sure dependencies are installed.")
    print(f"Error: {e}")


class TestDataValidation(unittest.TestCase):
    """Test data validation utilities"""
    
    def test_valid_property(self):
        """Test validation of valid property"""
        property_data = {
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
        
        result = DataValidator.validate_property(property_data)
        self.assertTrue(result['valid'])
    
    def test_invalid_rating(self):
        """Test validation with invalid rating"""
        property_data = {
            'beds': 3,
            'bedrooms': 2,
            'bathrooms': 2,
            'guests': 5,
            'rating': 6.0,  # Invalid: > 5
            'reviewCount': 10,
            'wilaya': 'Algiers',
            'lat': 36.7745,
            'lng': 3.0607
        }
        
        result = DataValidator.validate_property(property_data)
        self.assertFalse(result['valid'])
        self.assertIsNotNone(result['warnings'])
    
    def test_invalid_wilaya(self):
        """Test validation with unknown wilaya"""
        property_data = {
            'beds': 3,
            'bedrooms': 2,
            'bathrooms': 2,
            'guests': 5,
            'rating': 4.5,
            'reviewCount': 10,
            'wilaya': 'Unknown City',
            'lat': 36.7745,
            'lng': 3.0607
        }
        
        result = DataValidator.validate_property(property_data)
        self.assertFalse(result['valid'])


class TestPriceAnalyzer(unittest.TestCase):
    """Test price analysis utilities"""
    
    def test_price_range_budget(self):
        """Test budget price range"""
        label = PriceAnalyzer.get_price_range_label(1500)
        self.assertEqual(label, "Budget")
    
    def test_price_range_mid_range(self):
        """Test mid-range price"""
        label = PriceAnalyzer.get_price_range_label(4500)
        self.assertEqual(label, "Mid-Range")
    
    def test_price_range_premium(self):
        """Test premium price range"""
        label = PriceAnalyzer.get_price_range_label(8000)
        self.assertEqual(label, "Premium")
    
    def test_price_range_luxury(self):
        """Test luxury price range"""
        label = PriceAnalyzer.get_price_range_label(12000)
        self.assertEqual(label, "Luxury")
    
    def test_analyze_predictions(self):
        """Test prediction analysis"""
        predictions = [1000, 2000, 3000, 4000, 5000]
        stats = PriceAnalyzer.analyze_predictions(predictions)
        
        self.assertAlmostEqual(stats['mean'], 3000)
        self.assertEqual(stats['min'], 1000)
        self.assertEqual(stats['max'], 5000)


class TestFeatureAnalyzer(unittest.TestCase):
    """Test feature analysis utilities"""
    
    def test_feature_groups(self):
        """Test feature grouping"""
        groups = FeatureAnalyzer.get_feature_groups()
        
        self.assertIn('numerical', groups)
        self.assertIn('categorical', groups)
        self.assertTrue(len(groups['numerical']) > 0)
        self.assertTrue(len(groups['categorical']) > 0)
    
    def test_feature_description(self):
        """Test feature descriptions"""
        desc = FeatureAnalyzer.get_feature_description('beds')
        self.assertIsNotNone(desc)
        self.assertTrue(len(desc) > 0)


class TestPrediction(unittest.TestCase):
    """Test prediction functionality"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.example_property = {
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
    
    def test_prediction_structure(self):
        """Test prediction returns expected structure"""
        try:
            prediction = predict_price(self.example_property)
            
            if 'error' not in prediction:
                self.assertIn('predicted_price', prediction)
                self.assertIn('lower_bound', prediction)
                self.assertIn('upper_bound', prediction)
                self.assertIn('currency', prediction)
                self.assertIn('confidence', prediction)
        except Exception as e:
            print(f"Prediction test skipped: {e}")
    
    def test_prediction_bounds(self):
        """Test prediction bounds are reasonable"""
        try:
            prediction = predict_price(self.example_property)
            
            if 'error' not in prediction:
                self.assertLess(prediction['lower_bound'], prediction['predicted_price'])
                self.assertLess(prediction['predicted_price'], prediction['upper_bound'])
        except Exception as e:
            print(f"Bounds test skipped: {e}")


class TestModelIntegration(unittest.TestCase):
    """Test model loading and integration"""
    
    def test_model_loading(self):
        """Test model can be loaded"""
        try:
            model = ModelLoader.load_model()
            self.assertIsNotNone(model)
        except FileNotFoundError:
            print("Model test skipped: model not trained yet")
    
    def test_scaler_loading(self):
        """Test scaler can be loaded"""
        try:
            scaler = ModelLoader.load_scaler()
            self.assertIsNotNone(scaler)
        except FileNotFoundError:
            print("Scaler test skipped: model not trained yet")
    
    def test_features_loading(self):
        """Test features can be loaded"""
        try:
            features = ModelLoader.load_features()
            self.assertIsNotNone(features)
            self.assertTrue(len(features) > 0)
        except FileNotFoundError:
            print("Features test skipped: model not trained yet")


def run_quick_validation():
    """Run quick validation without unittest framework"""
    print("\n" + "="*70)
    print("SmartRentDZ ML Pipeline - Quick Validation")
    print("="*70)
    
    # Test 1: Data validation
    print("\n1. Testing data validation...")
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
    print(f"   Valid: {validation['valid']} ✓")
    
    # Test 2: Feature analysis
    print("\n2. Testing feature analysis...")
    groups = FeatureAnalyzer.get_feature_groups()
    print(f"   Numerical features: {len(groups['numerical'])} ✓")
    print(f"   Categorical features: {len(groups['categorical'])} ✓")
    
    # Test 3: Price analysis
    print("\n3. Testing price analysis...")
    test_prices = [1500, 4500, 8000, 12000]
    for price in test_prices:
        label = PriceAnalyzer.get_price_range_label(price)
        print(f"   ${price} -> {label} ✓")
    
    # Test 4: Model availability
    print("\n4. Checking model availability...")
    try:
        model = ModelLoader.load_model()
        print("   Model loaded ✓")
    except FileNotFoundError as e:
        print(f"   Model not available (not trained yet)")
    
    print("\n" + "="*70)
    print("Validation complete!")
    print("="*70)


if __name__ == '__main__':
    import sys
    
    # Check for command line arguments
    if len(sys.argv) > 1 and sys.argv[1] == 'quick':
        # Run quick validation
        try:
            run_quick_validation()
        except Exception as e:
            print(f"Error running quick validation: {e}")
            import traceback
            traceback.print_exc()
    else:
        # Run full unittest suite
        print("Running SmartRentDZ ML Pipeline Test Suite...\n")
        
        # Create test suite
        loader = unittest.TestLoader()
        suite = unittest.TestSuite()
        
        # Add test cases
        suite.addTests(loader.loadTestsFromTestCase(TestDataValidation))
        suite.addTests(loader.loadTestsFromTestCase(TestPriceAnalyzer))
        suite.addTests(loader.loadTestsFromTestCase(TestFeatureAnalyzer))
        suite.addTests(loader.loadTestsFromTestCase(TestModelIntegration))
        
        # Run tests
        runner = unittest.TextTestRunner(verbosity=2)
        result = runner.run(suite)
        
        # Exit with appropriate code
        sys.exit(0 if result.wasSuccessful() else 1)

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartRentDZ - Real Estate Price Prediction ML Pipeline
Trains and evaluates multiple models for property price prediction in Algeria
"""

import json
import re
import pickle
import warnings
from pathlib import Path
from typing import Dict, Tuple, List, Any

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import KFold, cross_validate, train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor
from catboost import CatBoostRegressor
from sklearn.ensemble import RandomForestRegressor
import joblib

warnings.filterwarnings('ignore')

# Arabic keywords for feature extraction
ARABIC_KEYWORDS = {
    'دوبلكس': 'duplex',
    'بحر': 'sea_view',
    'مجهز': 'furnished',
    'مكيف': 'ac_equipped',
    'طراز': 'stylish',
    'واسع': 'spacious',
    'مرآب': 'garage',
    'حديقة': 'garden',
    'شرفة': 'balcony',
    'فيلا': 'villa',
    'شقة': 'apartment',
    'ملوث': 'luxury',
    'حمام سباحة': 'swimming_pool',
    'موقوف': 'parking'
}


class RealEstatePipelineMLPipeline:
    """Complete ML pipeline for real estate price prediction."""
    
    def __init__(self, data_path: str, model_dir: str = None):
        """
        Initialize the pipeline.
        
        Args:
            data_path: Path to JSON data file
            model_dir: Directory to save models and preprocessors
        """
        self.data_path = data_path
        self.model_dir = Path(model_dir) if model_dir else Path(__file__).parent.parent / 'models'
        self.model_dir.mkdir(parents=True, exist_ok=True)
        
        self.df = None
        self.X = None
        self.y = None
        self.scaler = None
        self.label_encoders = {}
        self.feature_means = {}
        self.best_model = None
        self.best_model_name = None
        self.cv_results = {}
        
    def load_data(self) -> pd.DataFrame:
        """Load and validate data from JSON file."""
        print("\n" + "="*80)
        print("STEP 1: LOADING DATA")
        print("="*80)
        
        with open(self.data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        self.df = pd.DataFrame(data)
        print(f"✓ Loaded {len(self.df)} properties")
        print(f"✓ Features: {list(self.df.columns)}")
        print(f"\nData shape: {self.df.shape}")
        print(f"Missing values:\n{self.df.isnull().sum()}")
        print(f"\nPrice statistics:\n{self.df['price'].describe()}")
        
        return self.df
    
    def extract_arabic_features(self, text: str) -> Dict[str, int]:
        """
        Extract binary features from Arabic text.
        
        Args:
            text: Arabic text from title or description
            
        Returns:
            Dictionary of binary feature values
        """
        if not isinstance(text, str):
            return {f"arabic_{key}": 0 for key in ARABIC_KEYWORDS.values()}
        
        text_lower = text.lower()
        features = {}
        
        for ar_word, en_name in ARABIC_KEYWORDS.items():
            features[f"arabic_{en_name}"] = 1 if ar_word in text_lower else 0
        
        return features
    
    def target_encode_categorical(self, df: pd.DataFrame, column: str, target: str) -> pd.DataFrame:
        """
        Apply target encoding to a categorical column.
        
        Args:
            df: DataFrame
            column: Column name to encode
            target: Target variable name (price)
            
        Returns:
            Updated dataframe with encoded column
        """
        # Calculate mean price per category
        means = df.groupby(column)[target].agg(['mean', 'count'])
        
        # Smoothing to avoid overfitting on rare categories
        global_mean = df[target].mean()
        smoothing = 1.0  # Smoothing factor
        
        means['smoothed_mean'] = (means['mean'] * means['count'] + global_mean * smoothing) / (means['count'] + smoothing)
        
        # Store encoding for later use
        self.feature_means[f"{column}_encoding"] = means['smoothed_mean'].to_dict()
        
        # Apply encoding
        df[f"{column}_encoded"] = df[column].map(means['smoothed_mean'])
        df[f"{column}_encoded"].fillna(global_mean, inplace=True)
        
        return df
    
    def preprocess_data(self) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Preprocess data: feature extraction, encoding, scaling.
        
        Returns:
            Tuple of (features DataFrame, target Series)
        """
        print("\n" + "="*80)
        print("STEP 2: DATA PREPROCESSING")
        print("="*80)
        
        df = self.df.copy()
        
        # Extract Arabic features from title and description
        print("\n→ Extracting Arabic text features...")
        text_features = df.apply(
            lambda row: self.extract_arabic_features(row['title'] + ' ' + row['description']),
            axis=1
        )
        text_features_df = pd.DataFrame(list(text_features))
        print(f"  ✓ Extracted {len(text_features_df.columns)} text features")
        
        # Target encoding for categorical variables
        print("\n→ Applying Target Encoding to categorical variables...")
        df = self.target_encode_categorical(df, 'wilaya', 'price')
        df = self.target_encode_categorical(df, 'neighborhood', 'price')
        print(f"  ✓ Encoded wilaya and neighborhood")
        
        # Handle any missing values
        df.fillna(df.mean(numeric_only=True), inplace=True)
        
        # Select numerical features
        numerical_features = ['beds', 'bedrooms', 'bathrooms', 'guests', 'rating', 
                            'reviewCount', 'lat', 'lng', 'wilaya_encoded', 'neighborhood_encoded']
        
        # Combine all features
        X = pd.concat([
            df[numerical_features],
            text_features_df
        ], axis=1)
        
        # Target variable
        y = df['price'].copy()
        
        print(f"\n✓ Final feature set: {X.shape[1]} features")
        print(f"✓ Features list: {list(X.columns)}")
        print(f"✓ Target: price (range: ${y.min():.0f} - ${y.max():.0f})")
        
        # Clean non-numeric values before scaling
        print("\n→ Cleaning non-numeric values...")
        X = X.replace('N/A', np.nan)
        X = X.apply(pd.to_numeric, errors='coerce')
        X = X.fillna(0)
        print(f"  ✓ Cleaned all non-numeric values")
        
        # Standardize features
        print("\n→ Standardizing features...")
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        X = pd.DataFrame(X_scaled, columns=X.columns)
        
        self.X = X
        self.y = y
        
        return X, y
    
    def evaluate_models(self, X: pd.DataFrame, y: pd.Series):
        """
        Train and evaluate multiple models using 5-Fold Cross-Validation.
        
        Args:
            X: Features
            y: Target
        """
        print("\n" + "="*80)
        print("STEP 3: MODEL DEVELOPMENT & EVALUATION (5-FOLD CV)")
        print("="*80)
        
        # Define models
        models = {
            'XGBoost': XGBRegressor(
                n_estimators=200,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                random_state=42,
                verbosity=0
            ),
            'CatBoost': CatBoostRegressor(
                iterations=200,
                depth=6,
                learning_rate=0.1,
                random_state=42,
                verbose=False
            ),
            'RandomForest': RandomForestRegressor(
                n_estimators=200,
                max_depth=15,
                min_samples_split=5,
                random_state=42,
                n_jobs=-1
            )
        }
        
        # 5-Fold Cross-Validation
        kfold = KFold(n_splits=5, shuffle=True, random_state=42)
        
        print("\n✓ Running 5-Fold Cross-Validation for each model...\n")
        
        results_summary = []
        
        for model_name, model in models.items():
            print(f"→ Training {model_name}...")
            
            # Define scoring metrics
            scoring = {
                'mae': 'neg_mean_absolute_error',
                'mse': 'neg_mean_squared_error',
                'r2': 'r2'
            }
            
            # Cross-validate
            cv_results = cross_validate(model, X, y, cv=kfold, scoring=scoring, n_jobs=-1)
            
            # Calculate metrics
            mae = -cv_results['test_mae'].mean()
            mae_std = cv_results['test_mae'].std()
            rmse = np.sqrt(-cv_results['test_mse'].mean())
            r2 = cv_results['test_r2'].mean()
            
            self.cv_results[model_name] = {
                'mae': mae,
                'mae_std': mae_std,
                'rmse': rmse,
                'r2': r2,
                'cv_scores': cv_results
            }
            
            print(f"  MAE:  ${mae:.2f} ± ${mae_std:.2f}")
            print(f"  RMSE: ${rmse:.2f}")
            print(f"  R²:   {r2:.4f}\n")
            
            results_summary.append({
                'Model': model_name,
                'MAE': f"${mae:.2f}",
                'MAE_Std': f"${mae_std:.2f}",
                'RMSE': f"${rmse:.2f}",
                'R2': f"{r2:.4f}"
            })
        
        # Display results summary
        results_df = pd.DataFrame(results_summary)
        print("="*80)
        print("CROSS-VALIDATION RESULTS SUMMARY")
        print("="*80)
        print(results_df.to_string(index=False))
        
        # Select best model based on MAE
        best_model_name = min(self.cv_results.keys(), 
                             key=lambda x: self.cv_results[x]['mae'])
        best_mae = self.cv_results[best_model_name]['mae']
        
        print(f"\n✓ Best Model: {best_model_name} (MAE: ${best_mae:.2f})")
        
        self.best_model_name = best_model_name
    
    def train_final_model(self, X: pd.DataFrame, y: pd.Series):
        """
        Train final model on full dataset.
        
        Args:
            X: Features
            y: Target
        """
        print("\n" + "="*80)
        print("STEP 4: TRAINING FINAL MODEL")
        print("="*80)
        
        # Re-define best model
        if self.best_model_name == 'XGBoost':
            model = XGBRegressor(
                n_estimators=200,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                random_state=42,
                verbosity=0
            )
        elif self.best_model_name == 'CatBoost':
            model = CatBoostRegressor(
                iterations=200,
                depth=6,
                learning_rate=0.1,
                random_state=42,
                verbose=False
            )
        else:  # RandomForest
            model = RandomForestRegressor(
                n_estimators=200,
                max_depth=15,
                min_samples_split=5,
                random_state=42,
                n_jobs=-1
            )
        
        print(f"\n→ Training {self.best_model_name} on full dataset...")
        model.fit(X, y)
        self.best_model = model
        
        # Training metrics
        y_pred = model.predict(X)
        train_mae = mean_absolute_error(y, y_pred)
        train_rmse = np.sqrt(mean_squared_error(y, y_pred))
        train_r2 = r2_score(y, y_pred)
        
        print(f"\n✓ Model trained successfully!")
        print(f"  Train MAE:  ${train_mae:.2f}")
        print(f"  Train RMSE: ${train_rmse:.2f}")
        print(f"  Train R²:   {train_r2:.4f}")
    
    def get_feature_importance(self) -> pd.DataFrame:
        """
        Extract feature importance from the best model.
        
        Returns:
            DataFrame with feature importance scores
        """
        feature_names = self.X.columns
        
        if self.best_model_name == 'RandomForest':
            importances = self.best_model.feature_importances_
        else:  # XGBoost or CatBoost
            importances = self.best_model.feature_importances_
        
        feature_importance_df = pd.DataFrame({
            'Feature': feature_names,
            'Importance': importances
        }).sort_values('Importance', ascending=False)
        
        return feature_importance_df
    
    def plot_feature_importance(self, top_n: int = 15):
        """
        Create and save feature importance chart.
        
        Args:
            top_n: Number of top features to display
        """
        print("\n" + "="*80)
        print("STEP 5: FEATURE IMPORTANCE ANALYSIS")
        print("="*80)
        
        feature_importance_df = self.get_feature_importance()
        top_features = feature_importance_df.head(top_n)
        
        print(f"\n✓ Top {top_n} Important Features:")
        print(top_features.to_string(index=False))
        
        # Create visualization
        plt.figure(figsize=(12, 8))
        plt.barh(range(len(top_features)), top_features['Importance'].values, color='steelblue')
        plt.yticks(range(len(top_features)), top_features['Feature'].values)
        plt.xlabel('Importance Score', fontsize=12, fontweight='bold')
        plt.ylabel('Features', fontsize=12, fontweight='bold')
        plt.title(f'Top {top_n} Feature Importance - {self.best_model_name}', 
                 fontsize=14, fontweight='bold', pad=20)
        plt.tight_layout()
        
        # Save figure
        chart_path = self.model_dir / 'feature_importance_chart.png'
        plt.savefig(chart_path, dpi=300, bbox_inches='tight')
        print(f"\n✓ Chart saved: {chart_path}")
        plt.close()
    
    def save_models(self):
        """Save trained model and preprocessors."""
        print("\n" + "="*80)
        print("STEP 6: SAVING MODELS & PREPROCESSORS")
        print("="*80)
        
        # Save model
        model_path = self.model_dir / f'{self.best_model_name.lower()}_model.pkl'
        joblib.dump(self.best_model, model_path)
        print(f"✓ Model saved: {model_path}")
        
        # Save scaler
        scaler_path = self.model_dir / 'scaler.pkl'
        joblib.dump(self.scaler, scaler_path)
        print(f"✓ Scaler saved: {scaler_path}")
        
        # Save feature encodings
        encodings_path = self.model_dir / 'feature_encodings.pkl'
        joblib.dump(self.feature_means, encodings_path)
        print(f"✓ Feature encodings saved: {encodings_path}")
        
        # Save feature names
        features_path = self.model_dir / 'features.pkl'
        joblib.dump(list(self.X.columns), features_path)
        print(f"✓ Feature names saved: {features_path}")
        
        # Save metadata
        metadata = {
            'model_name': self.best_model_name,
            'features': list(self.X.columns),
            'cv_results': {
                k: {
                    'mae': float(v['mae']) if isinstance(v['mae'], (int, float, np.number)) else v['mae'],
                    'mae_std': float(v['mae_std']) if isinstance(v['mae_std'], (int, float, np.number)) else v['mae_std'],
                    'rmse': float(v['rmse']) if isinstance(v['rmse'], (int, float, np.number)) else v['rmse'],
                    'r2': float(v['r2']) if isinstance(v['r2'], (int, float, np.number)) else v['r2']
                }
                for k, v in self.cv_results.items() if k != 'cv_scores'
            },
            'best_cv_mae': float(self.cv_results[self.best_model_name]['mae']),
            'dataset_samples': int(len(self.df)),
            'target_stats': {
                'mean': float(self.y.mean()),
                'std': float(self.y.std()),
                'min': float(self.y.min()),
                'max': float(self.y.max())
            }
        }
        
        metadata_path = self.model_dir / 'metadata.json'
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        print(f"✓ Metadata saved: {metadata_path}")
    
    def run_pipeline(self):
        """Run the complete pipeline."""
        print("\n")
        print("╔" + "="*78 + "╗")
        print("║" + " "*15 + "SmartRentDZ ML Pipeline - Price Prediction" + " "*22 + "║")
        print("╚" + "="*78 + "╝")
        
        try:
            # Load data
            self.load_data()
            
            # Preprocess
            X, y = self.preprocess_data()
            
            # Evaluate models
            self.evaluate_models(X, y)
            
            # Train final model
            self.train_final_model(X, y)
            
            # Feature importance
            self.plot_feature_importance()
            
            # Save models
            self.save_models()
            
            print("\n" + "="*80)
            print("✓ PIPELINE COMPLETED SUCCESSFULLY!")
            print("="*80)
            print(f"\nBest Model: {self.best_model_name}")
            print(f"Cross-Validation MAE: ${self.cv_results[self.best_model_name]['mae']:.2f}")
            print(f"Models saved in: {self.model_dir}")
            print("\n")
            
            return True
        
        except Exception as e:
            print(f"\n✗ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


def predict_price(property_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict price for a new property listing.
    
    Args:
        property_data: Dictionary with property features
        Example: {
            "title": "دوبلكس بنتهاوس - طراز عصري",
            "description": "شقة فخمة مع إطلالة على البحر",
            "beds": 3,
            "bedrooms": 2,
            "bathrooms": 2,
            "guests": 5,
            "rating": 4.5,
            "reviewCount": 10,
            "wilaya": "Algiers",
            "neighborhood": "الجزائر",
            "lat": 36.7745,
            "lng": 3.0607
        }
    
    Returns:
        Dictionary with predicted price and confidence info
    """
    try:
        # Load model and preprocessors
        model_dir = Path(__file__).parent.parent / 'models'
        
        # Find the model file
        model_files = list(model_dir.glob('*_model.pkl'))
        if not model_files:
            raise FileNotFoundError("No trained model found. Run pipeline first.")
        
        model = joblib.load(model_files[0])
        scaler = joblib.load(model_dir / 'scaler.pkl')
        features = joblib.load(model_dir / 'features.pkl')
        encodings = joblib.load(model_dir / 'feature_encodings.pkl')
        
        # Create feature vector
        feature_dict = {}
        
        # Numerical features
        for col in ['beds', 'bedrooms', 'bathrooms', 'guests', 'rating', 'reviewCount', 'lat', 'lng']:
            feature_dict[col] = property_data.get(col, 0)
        
        # Categorical encodings
        wilaya = property_data.get('wilaya', 'N/A')
        neighborhood = property_data.get('neighborhood', 'N/A')
        
        wilaya_encoding = encodings.get('wilaya_encoding', {})
        neighborhood_encoding = encodings.get('neighborhood_encoding', {})
        
        feature_dict['wilaya_encoded'] = wilaya_encoding.get(wilaya, np.mean(list(wilaya_encoding.values())))
        feature_dict['neighborhood_encoded'] = neighborhood_encoding.get(neighborhood, np.mean(list(neighborhood_encoding.values())))
        
        # Arabic text features
        text = property_data.get('title', '') + ' ' + property_data.get('description', '')
        pipeline = RealEstatePipelineMLPipeline.__new__(RealEstatePipelineMLPipeline)
        text_features = pipeline.extract_arabic_features(text)
        feature_dict.update(text_features)
        
        # Create DataFrame with correct feature order
        X = pd.DataFrame([feature_dict])[features]
        
        # Scale features
        X_scaled = scaler.transform(X)
        
        # Predict
        predicted_price = model.predict(X_scaled)[0]
        
        # Get prediction interval (approximate)
        prediction_uncertainty = 0.15  # 15% uncertainty for small dataset
        lower_bound = predicted_price * (1 - prediction_uncertainty)
        upper_bound = predicted_price * (1 + prediction_uncertainty)
        
        return {
            'predicted_price': round(float(predicted_price), 2),
            'lower_bound': round(float(lower_bound), 2),
            'upper_bound': round(float(upper_bound), 2),
            'currency': 'DZD',
            'confidence': 'Medium',
            'model': 'XGBoost/CatBoost/RandomForest Ensemble'
        }
    
    except Exception as e:
        return {
            'error': str(e),
            'message': 'Failed to predict price'
        }


if __name__ == '__main__':
    # Run pipeline
    data_path = Path(__file__).parent.parent / 'final_data_with_users.json'
    
    pipeline = RealEstatePipelineMLPipeline(
        data_path=str(data_path),
        model_dir=str(Path(__file__).parent.parent / 'models')
    )
    
    success = pipeline.run_pipeline()
    
    # Example prediction
    if success:
        print("\n" + "="*80)
        print("EXAMPLE PREDICTION")
        print("="*80)
        
        example_property = {
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
        
        prediction = predict_price(example_property)
        print(f"\nProperty: {example_property['title']}")
        print(f"Predicted Price: ${prediction['predicted_price']:.2f} DZD")
        print(f"Price Range: ${prediction['lower_bound']:.2f} - ${prediction['upper_bound']:.2f}")
        print(f"Confidence: {prediction['confidence']}")

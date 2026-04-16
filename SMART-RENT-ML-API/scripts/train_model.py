"""
SmartRentDZ ML Pipeline - Production Ready
Train Random Forest model for Algerian apartment rental price prediction
"""

import json
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib
import logging
import os
from pathlib import Path
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DataPipeline:
    """Production-grade data pipeline for model training"""
    
    def __init__(self, data_path, outlier_method='iqr'):
        """
        Initialize pipeline
        
        Args:
            data_path: Path to JSON data file
            outlier_method: 'iqr' or 'zscore' for outlier detection
        """
        self.data_path = data_path
        self.outlier_method = outlier_method
        self.label_encoders = {}
        self.feature_means = {}
        
    def load_data(self):
        """Load data from JSON file"""
        logger.info(f"Loading data from {self.data_path}")
        with open(self.data_path, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
        
        df = pd.json_normalize(raw_data)
        logger.info(f"Loaded {len(df)} records")
        return df
    
    def clean_data(self, df):
        """Clean and preprocess data"""
        logger.info("Starting data cleaning process...")
        
        initial_count = len(df)
        
        # Remove null prices
        df = df[df['price'].notna()]
        logger.info(f"Removed {initial_count - len(df)} records with null prices")
        
        # Extract numeric features
        numeric_features = [
            'accommodates', 'bedrooms', 'bathrooms', 'minimum_nights',
            'number_of_reviews', 'review_scores_rating', 'availability_365',
            'price_per_person'
        ]
        
        for col in numeric_features:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Fill missing values with median
        for col in numeric_features:
            if col in df.columns:
                median_val = df[col].median()
                self.feature_means[col] = median_val
                df[col].fillna(median_val, inplace=True)
        
        logger.info("Data cleaning complete")
        return df
    
    def handle_outliers(self, df):
        """Remove unrealistic rental prices"""
        logger.info(f"Handling outliers using {self.outlier_method} method...")
        
        initial_count = len(df)
        
        if self.outlier_method == 'iqr':
            Q1 = df['price'].quantile(0.25)
            Q3 = df['price'].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            logger.info(f"Price range: {lower_bound:.2f} - {upper_bound:.2f}")
            df = df[(df['price'] >= lower_bound) & (df['price'] <= upper_bound)]
            
        elif self.outlier_method == 'zscore':
            from scipy import stats
            z_scores = np.abs(stats.zscore(df['price']))
            df = df[z_scores < 3]
        
        removed = initial_count - len(df)
        logger.info(f"Removed {removed} outlier records ({removed/initial_count*100:.2f}%)")
        
        return df
    
    def feature_engineering(self, df):
        """Create new features for better predictions"""
        logger.info("Performing feature engineering...")
        
        # Calculate price per bedroom (if bedrooms > 0)
        df['price_per_bedroom'] = df.apply(
            lambda x: x['price'] / x['bedrooms'] if x['bedrooms'] > 0 else x['price'],
            axis=1
        )
        
        # Normalize review scores (0-100)
        df['review_score_normalized'] = df['review_scores_rating'].fillna(0) * 20
        
        # Extract city from location (fallback)
        if 'location.city' in df.columns:
            df['city'] = df['location.city']
        
        # Binary feature: has reviews
        df['has_reviewed'] = df['number_of_reviews'].apply(lambda x: 1 if x > 0 else 0)
        
        logger.info("Feature engineering complete")
        return df
    
    def encode_categorical_features(self, df, categorical_cols=['wilaya', 'property_type'], fit=True):
        """Encode categorical features using LabelEncoder"""
        logger.info(f"Encoding categorical features: {categorical_cols}")
        
        for col in categorical_cols:
            if col not in df.columns:
                logger.warning(f"Column {col} not found in dataframe")
                continue
            
            if fit:
                encoder = LabelEncoder()
                df[f'{col}_encoded'] = encoder.fit_transform(df[col].astype(str))
                self.label_encoders[col] = encoder
                logger.info(f"Encoded {col}: {len(encoder.classes_)} unique values")
            else:
                if col not in self.label_encoders:
                    logger.error(f"No encoder found for {col}")
                    continue
                encoder = self.label_encoders[col]
                df[f'{col}_encoded'] = df[col].astype(str).map(
                    lambda x: encoder.transform([x])[0] if x in encoder.classes_ else -1
                )
        
        return df
    
    def prepare_features(self, df):
        """Select and prepare final features for model"""
        feature_columns = [
            'accommodates', 'bedrooms', 'bathrooms', 'minimum_nights',
            'number_of_reviews', 'review_scores_rating', 'availability_365',
            'price_per_person', 'price_per_bedroom', 'review_score_normalized',
            'has_reviewed', 'wilaya_encoded', 'property_type_encoded'
        ]
        
        available_features = [col for col in feature_columns if col in df.columns]
        logger.info(f"Using {len(available_features)} features: {available_features}")
        
        X = df[available_features].fillna(0)
        y = df['price']
        
        return X, y, available_features
    
    def get_pipeline_data(self):
        """Execute full pipeline and return train/test data"""
        df = self.load_data()
        df = self.clean_data(df)
        df = self.handle_outliers(df)
        df = self.feature_engineering(df)
        df = self.encode_categorical_features(df, fit=True)
        
        X, y, features = self.prepare_features(df)
        
        logger.info(f"Final dataset shape: X={X.shape}, y={y.shape}")
        logger.info(f"Price statistics - Mean: {y.mean():.2f}, Std: {y.std():.2f}")
        
        return X, y, features


class ModelTrainer:
    """Train and save Random Forest model"""
    
    def __init__(self, model_dir='models'):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        self.model = None
        self.features = None
        
    def train(self, X, y, test_size=0.2, random_state=42):
        """Train Random Forest model"""
        logger.info("Starting model training...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, 
            test_size=test_size, 
            random_state=random_state
        )
        
        logger.info(f"Training set size: {len(X_train)}, Test set size: {len(X_test)}")
        
        # Train Random Forest
        self.model = RandomForestRegressor(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=random_state,
            n_jobs=-1,
            verbose=1
        )
        
        self.model.fit(X_train, y_train)
        self.features = X.columns.tolist()
        
        # Evaluate
        train_pred = self.model.predict(X_train)
        test_pred = self.model.predict(X_test)
        
        train_r2 = r2_score(y_train, train_pred)
        test_r2 = r2_score(y_test, test_pred)
        test_rmse = np.sqrt(mean_squared_error(y_test, test_pred))
        test_mae = mean_absolute_error(y_test, test_pred)
        
        metrics = {
            'train_r2': train_r2,
            'test_r2': test_r2,
            'test_rmse': test_rmse,
            'test_mae': test_mae,
            'train_size': len(X_train),
            'test_size': len(X_test)
        }
        
        logger.info(f"Model Performance:")
        logger.info(f"  Train R²: {train_r2:.4f}")
        logger.info(f"  Test R²: {test_r2:.4f}")
        logger.info(f"  Test RMSE: {test_rmse:.2f} DZD")
        logger.info(f"  Test MAE: {test_mae:.2f} DZD")
        
        return metrics, X_test, y_test, test_pred
    
    def save_model(self, pipeline):
        """Save model and encoders"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save model
        model_path = self.model_dir / 'random_forest_model.joblib'
        joblib.dump(self.model, model_path)
        logger.info(f"Model saved to {model_path}")
        
        # Save label encoders
        encoders_path = self.model_dir / 'label_encoders.joblib'
        joblib.dump(pipeline.label_encoders, encoders_path)
        logger.info(f"Label encoders saved to {encoders_path}")
        
        # Save feature list
        features_path = self.model_dir / 'features.joblib'
        joblib.dump(self.features, features_path)
        logger.info(f"Features list saved to {features_path}")
        
        # Save feature means for preprocessing
        means_path = self.model_dir / 'feature_means.joblib'
        joblib.dump(pipeline.feature_means, means_path)
        logger.info(f"Feature means saved to {means_path}")
        
        # Save metadata
        metadata = {
            'model_type': 'RandomForestRegressor',
            'n_estimators': self.model.n_estimators,
            'training_date': timestamp,
            'features': self.features,
            'feature_importance': dict(zip(self.features, self.model.feature_importances_.tolist()))
        }
        
        metadata_path = self.model_dir / 'metadata.json'
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=4, ensure_ascii=False)
        logger.info(f"Metadata saved to {metadata_path}")
        
        return {
            'model_path': str(model_path),
            'encoders_path': str(encoders_path),
            'features_path': str(features_path)
        }


def main():
    """Main training pipeline"""
    logger.info("=" * 50)
    logger.info("SmartRentDZ ML Training Pipeline Started")
    logger.info("=" * 50)
    
    try:
        # Load and process data
        pipeline = DataPipeline('airbnb_algeria_data.json')
        X, y, features = pipeline.get_pipeline_data()
        
        # Train model
        trainer = ModelTrainer()
        metrics, X_test, y_test, predictions = trainer.train(X, y)
        
        # Save model
        paths = trainer.save_model(pipeline)
        
        # Log feature importance
        logger.info("Top 10 Important Features:")
        importance_df = pd.DataFrame({
            'feature': features,
            'importance': trainer.model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        for idx, row in importance_df.head(10).iterrows():
            logger.info(f"  {row['feature']}: {row['importance']:.4f}")
        
        logger.info("=" * 50)
        logger.info("Training completed successfully!")
        logger.info("=" * 50)
        
    except Exception as e:
        logger.error(f"Error during training: {str(e)}", exc_info=True)
        raise


if __name__ == '__main__':
    main()

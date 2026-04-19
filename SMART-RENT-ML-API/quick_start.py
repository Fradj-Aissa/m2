#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quick start script for SmartRentDZ ML Pipeline
Installs dependencies and runs training
"""

import subprocess
import sys
import os
from pathlib import Path


def run_command(cmd, description):
    """Run a command and report status"""
    print(f"\n{'='*70}")
    print(f"→ {description}")
    print(f"{'='*70}")
    
    try:
        result = subprocess.run(cmd, shell=True, cwd=Path(__file__).parent)
        if result.returncode != 0:
            print(f"✗ Failed: {description}")
            return False
        print(f"✓ Success: {description}")
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def main():
    print("\n")
    print("╔" + "="*68 + "╗")
    print("║" + " "*12 + "SmartRentDZ ML Pipeline - Quick Start" + " "*20 + "║")
    print("╚" + "="*68 + "╝")
    
    project_dir = Path(__file__).parent
    os.chdir(project_dir)
    
    # Step 1: Check Python version
    print(f"\nPython Version: {sys.version}")
    if sys.version_info < (3, 8):
        print("✗ Error: Python 3.8+ required")
        return False
    
    # Step 2: Install dependencies
    print("\nStep 1: Installing dependencies...")
    if not run_command(
        f"{sys.executable} -m pip install -r requirements.txt",
        "Install dependencies from requirements.txt"
    ):
        print("✗ Failed to install dependencies")
        return False
    
    # Step 3: Verify installation
    print("\nStep 2: Verifying package installation...")
    required_packages = {
        'pandas': 'pandas',
        'numpy': 'numpy',
        'sklearn': 'scikit-learn',
        'joblib': 'joblib',
        'xgboost': 'xgboost',
        'catboost': 'catboost',
        'matplotlib': 'matplotlib',
        'seaborn': 'seaborn'
    }
    
    missing = []
    for import_name, package_name in required_packages.items():
        try:
            __import__(import_name)
            print(f"  ✓ {package_name}")
        except ImportError:
            print(f"  ✗ {package_name} - NOT FOUND")
            missing.append(package_name)
    
    if missing:
        print(f"\n✗ Missing packages: {', '.join(missing)}")
        print("Attempting to install missing packages...")
        if not run_command(
            f"{sys.executable} -m pip install {' '.join(missing)}",
            f"Install missing packages: {', '.join(missing)}"
        ):
            print("✗ Failed to install missing packages")
            return False
    
    # Step 4: Check data file
    print("\nStep 3: Checking data file...")
    data_file = project_dir / 'final_data_with_users.json'
    if not data_file.exists():
        print(f"✗ Data file not found: {data_file}")
        return False
    print(f"  ✓ Data file found: {data_file}")
    
    # Step 5: Create models directory
    print("\nStep 4: Creating output directory...")
    models_dir = project_dir / 'models'
    models_dir.mkdir(exist_ok=True)
    print(f"  ✓ Models directory ready: {models_dir}")
    
    # Step 6: Run pipeline
    print("\nStep 5: Running ML Pipeline...")
    print("This may take 5-10 minutes depending on your system...\n")
    
    if not run_command(
        f"{sys.executable} app/ml_pipeline.py",
        "Run ML Pipeline Training"
    ):
        print("✗ Pipeline training failed")
        return False
    
    # Step 7: Verify output
    print("\nStep 6: Verifying output files...")
    required_files = [
        'models/*_model.pkl',
        'models/scaler.pkl',
        'models/features.pkl',
        'models/feature_encodings.pkl',
        'models/metadata.json',
        'models/feature_importance_chart.png'
    ]
    
    import glob
    models_exist = list(glob.glob(str(models_dir / '*_model.pkl')))
    
    if not models_exist:
        print("✗ No trained model found in models/ directory")
        return False
    
    print("  ✓ Trained model files found")
    
    for file_pattern in required_files[1:]:
        if glob.glob(str(project_dir / file_pattern)):
            print(f"  ✓ {file_pattern}")
    
    # Success!
    print("\n" + "="*70)
    print("✓ SETUP COMPLETE!")
    print("="*70)
    
    print("\n✓ ML Pipeline is ready to use!")
    print("\nNext steps:")
    print("1. Start the API server:")
    print(f"   cd {project_dir}")
    print(f"   python -m uvicorn app.api_prediction:app --reload")
    print("\n2. Access the API:")
    print("   http://localhost:8000")
    print("   http://localhost:8000/docs (Interactive API docs)")
    print("\n3. Test predictions:")
    print("   python")
    print("   >>> from app.ml_pipeline import predict_price")
    print("   >>> result = predict_price({ property_data })")
    
    return True


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)

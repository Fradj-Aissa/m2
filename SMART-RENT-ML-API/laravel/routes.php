<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SmartRentPredictionController;

/**
 * SmartRent Prediction Routes
 * Routes for apartment rental price prediction API
 */

Route::prefix('api/smartrent')->group(function () {
    // Prediction endpoints
    Route::post('/predict', [SmartRentPredictionController::class, 'predict'])
        ->name('smartrent.predict');
    
    Route::post('/predict-batch', [SmartRentPredictionController::class, 'predictBatch'])
        ->name('smartrent.predict-batch');
    
    // Info endpoints
    Route::get('/health', [SmartRentPredictionController::class, 'healthCheck'])
        ->name('smartrent.health');
    
    Route::get('/model-info', [SmartRentPredictionController::class, 'modelInfo'])
        ->name('smartrent.model-info');
});

// Web routes (forms)
Route::get('/smartrent/predict', [SmartRentPredictionController::class, 'showForm'])
    ->name('smartrent.form');

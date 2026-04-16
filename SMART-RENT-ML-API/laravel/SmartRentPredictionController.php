<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * SmartRentDZ Price Prediction Controller
 * 
 * Handles communication with the Python FastAPI backend
 * for apartment rental price predictions
 */
class SmartRentPredictionController extends Controller
{
    /**
     * API Configuration
     */
    protected $apiUrl = 'http://localhost:8000'; // Change to production URL
    protected $timeout = 30; // seconds
    
    /**
     * Initialize controller
     */
    public function __construct()
    {
        $this->apiUrl = config('smartrent.api_url', 'http://localhost:8000');
        $this->timeout = config('smartrent.api_timeout', 30);
    }
    
    /**
     * Show prediction form
     */
    public function showForm()
    {
        return view('smartrent.prediction-form');
    }
    
    /**
     * Handle prediction request from form
     * 
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function predict(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'accommodates' => 'required|integer|min:1|max:20',
            'bedrooms' => 'required|integer|min:1|max:10',
            'bathrooms' => 'required|numeric|min:0.5|max:10',
            'wilaya' => 'required|string|min:2',
            'property_type' => 'required|string|min:2',
            'minimum_nights' => 'nullable|integer|min:1|max:365',
            'number_of_reviews' => 'nullable|integer|min:0',
            'review_scores_rating' => 'nullable|numeric|min:1|max:5',
            'availability_365' => 'nullable|integer|min:0|max:365',
            'price_per_person' => 'nullable|numeric|min:0',
        ]);
        
        try {
            // Call the Python API
            $prediction = $this->callPredictionAPI($validated);
            
            // Log successful prediction
            Log::info('Price prediction successful', [
                'wilaya' => $validated['wilaya'],
                'property_type' => $validated['property_type'],
                'predicted_price' => $prediction['predicted_price'],
                'request_id' => $prediction['request_id'] ?? null,
            ]);
            
            return response()->json([
                'success' => true,
                'data' => $prediction,
                'message' => 'Prediction generated successfully',
            ]);
            
        } catch (\Exception $e) {
            Log::error('Prediction error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => $this->getErrorMessage($e),
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred',
            ], 500);
        }
    }
    
    /**
     * Batch prediction for multiple properties
     * 
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function predictBatch(Request $request)
    {
        // Validate array of predictions
        $validated = $request->validate([
            'properties' => 'required|array|min:1|max:100',
            'properties.*.accommodates' => 'required|integer|min:1|max:20',
            'properties.*.bedrooms' => 'required|integer|min:1|max:10',
            'properties.*.bathrooms' => 'required|numeric|min:0.5',
            'properties.*.wilaya' => 'required|string',
            'properties.*.property_type' => 'required|string',
        ]);
        
        try {
            // Call batch API
            $response = Http::timeout($this->timeout)
                ->post("{$this->apiUrl}/predict-batch", $validated['properties']);
            
            if (!$response->successful()) {
                throw new \Exception('API returned error: ' . $response->status());
            }
            
            $results = $response->json();
            
            Log::info('Batch prediction completed', [
                'count' => count($validated['properties']),
            ]);
            
            return response()->json([
                'success' => true,
                'data' => $results,
            ]);
            
        } catch (\Exception $e) {
            Log::error('Batch prediction error', [
                'error' => $e->getMessage(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => $this->getErrorMessage($e),
            ], 500);
        }
    }
    
    /**
     * Check API health
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function healthCheck()
    {
        try {
            $response = Http::timeout(5)
                ->get("{$this->apiUrl}/health");
            
            if ($response->successful()) {
                $data = $response->json();
                return response()->json([
                    'success' => true,
                    'status' => 'API is healthy',
                    'model_info' => $data,
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'status' => 'API is unavailable',
                    'error' => 'API returned status ' . $response->status(),
                ], 503);
            }
            
        } catch (\Illuminate\Http\Client\ConnectException $e) {
            Log::warning('API connection failed', [
                'error' => 'Cannot connect to API server',
                'url' => $this->apiUrl,
            ]);
            
            return response()->json([
                'success' => false,
                'status' => 'API is unavailable',
                'error' => 'Cannot connect to prediction API',
            ], 503);
            
        } catch (\Exception $e) {
            Log::error('Health check error', [
                'error' => $e->getMessage(),
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Health check failed',
            ], 500);
        }
    }
    
    /**
     * Get model information
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function modelInfo()
    {
        try {
            $response = Http::timeout($this->timeout)
                ->get("{$this->apiUrl}/model-info");
            
            if (!$response->successful()) {
                throw new \Exception('Failed to fetch model info');
            }
            
            return response()->json([
                'success' => true,
                'data' => $response->json(),
            ]);
            
        } catch (\Exception $e) {
            Log::error('Model info error', [
                'error' => $e->getMessage(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Could not retrieve model information',
            ], 500);
        }
    }
    
    /**
     * Call the Python FastAPI prediction endpoint
     * 
     * @param  array  $data
     * @return array
     * @throws \Exception
     */
    protected function callPredictionAPI(array $data): array
    {
        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])
                ->post("{$this->apiUrl}/predict", $data);
            
            // Check if response is successful
            if (!$response->successful()) {
                $statusCode = $response->status();
                $errorMessage = $response->json('detail') ?? 'API Error';
                throw new \Exception("API Error ($statusCode): $errorMessage");
            }
            
            return $response->json();
            
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            throw new \Exception('Failed to connect to prediction API. Please ensure the AI service is running.');
            
        } catch (\Illuminate\Http\Client\RequestException $e) {
            throw new \Exception('Request to prediction API failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Get user-friendly error message
     * 
     * @param  \Exception  $e
     * @return string
     */
    protected function getErrorMessage(\Exception $e): string
    {
        $message = $e->getMessage();
        
        // Map common errors to user-friendly messages
        if (strpos($message, 'Failed to connect') !== false) {
            return 'AI prediction service is currently unavailable. Please try again later.';
        }
        
        if (strpos($message, 'timeout') !== false) {
            return 'Request timed out. The AI service may be overloaded. Please try again.';
        }
        
        if (config('app.debug')) {
            return $message;
        }
        
        return 'An error occurred while processing your request. Please try again.';
    }
}

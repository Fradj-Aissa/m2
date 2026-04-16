# Laravel Configuration File
# Add this to your Laravel config folder

return [
    /*
    |--------------------------------------------------------------------------
    | SmartRent API Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for SmartRentDZ AI API integration
    |
    */
    
    'api_url' => env('SMARTRENT_API_URL', 'http://localhost:8000'),
    'api_timeout' => env('SMARTRENT_API_TIMEOUT', 30),
    'cache_predictions' => env('SMARTRENT_CACHE_PREDICTIONS', false),
    'cache_ttl' => env('SMARTRENT_CACHE_TTL', 3600), // 1 hour
];

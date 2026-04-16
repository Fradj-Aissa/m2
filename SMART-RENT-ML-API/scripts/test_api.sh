#!/usr/bin/env bash

################################################################################
# SmartRentDZ Testing Script
# Quick tests for API endpoints
################################################################################

API_URL="http://localhost:8000"
TIMEOUT=10

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local name=$4
    
    echo -e "${BLUE}Testing: $name${NC}"
    
    if [ "$method" == "GET" ]; then
        echo -e "${YELLOW}Request: GET $endpoint${NC}"
        curl -s --max-time $TIMEOUT "$API_URL$endpoint" | python3 -m json.tool
    else
        echo -e "${YELLOW}Request: POST $endpoint${NC}"
        echo -e "${YELLOW}Data:${NC}"
        echo "$data" | python3 -m json.tool
        echo -e "${YELLOW}Response:${NC}"
        curl -s --max-time $TIMEOUT -X POST "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" | python3 -m json.tool
    fi
    
    echo -e "${GREEN}✓ Test completed${NC}\n"
}

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}SmartRentDZ API Tests${NC}"
echo -e "${GREEN}================================${NC}\n"

# Test 1: Health Check
echo -e "${YELLOW}[Test 1/5]${NC}"
test_endpoint "GET" "/health" "" "Health Check"

# Test 2: Model Info
echo -e "${YELLOW}[Test 2/5]${NC}"
test_endpoint "GET" "/model-info" "" "Model Information"

# Test 3: Single Prediction
echo -e "${YELLOW}[Test 3/5]${NC}"
prediction_data='{
  "accommodates": 4,
  "bedrooms": 2,
  "bathrooms": 1.5,
  "wilaya": "Alger",
  "property_type": "Apartment",
  "minimum_nights": 1,
  "number_of_reviews": 10,
  "review_scores_rating": 4.5,
  "availability_365": 300,
  "price_per_person": 5000
}'
test_endpoint "POST" "/predict" "$prediction_data" "Single Prediction"

# Test 4: Batch Prediction
echo -e "${YELLOW}[Test 4/5]${NC}"
batch_data='[
  {
    "accommodates": 4,
    "bedrooms": 2,
    "bathrooms": 1.5,
    "wilaya": "Alger",
    "property_type": "Apartment",
    "minimum_nights": 1,
    "number_of_reviews": 10,
    "review_scores_rating": 4.5,
    "availability_365": 300,
    "price_per_person": 5000
  },
  {
    "accommodates": 6,
    "bedrooms": 3,
    "bathrooms": 2,
    "wilaya": "Oran",
    "property_type": "House",
    "minimum_nights": 2,
    "number_of_reviews": 15,
    "review_scores_rating": 4.7,
    "availability_365": 250,
    "price_per_person": 6000
  }
]'
test_endpoint "POST" "/predict-batch" "$batch_data" "Batch Prediction"

# Test 5: Invalid Data
echo -e "${YELLOW}[Test 5/5]${NC}"
invalid_data='{
  "accommodates": -1,
  "bedrooms": "invalid",
  "bathrooms": 1.5,
  "wilaya": "Alger",
  "property_type": "Apartment"
}'
test_endpoint "POST" "/predict" "$invalid_data" "Invalid Data (Expected Error)"

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}All tests completed!${NC}"
echo -e "${GREEN}================================${NC}"

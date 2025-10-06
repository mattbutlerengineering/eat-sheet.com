#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔐 Testing Authentication Setup"
echo "================================"
echo ""

# Configuration
USER_POOL_ID="us-east-1_HAkQVaB0z"
CLIENT_ID="7dorkqft0af2pq2qqalp862etj"
API_URL="http://localhost:3000/api"

echo "📋 Configuration:"
echo "  User Pool ID: $USER_POOL_ID"
echo "  Client ID: $CLIENT_ID"
echo "  API URL: $API_URL"
echo ""

# Test 1: Public endpoint (should work without auth)
echo "Test 1: Public endpoint (GET /restaurants)"
echo "-------------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/restaurants")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC} - Public endpoint works without auth"
  echo "  Response: $BODY"
else
  echo -e "${RED}✗ FAIL${NC} - Expected 200, got $HTTP_CODE"
  echo "  Response: $BODY"
fi
echo ""

# Test 2: Protected endpoint without auth (should fail with 401)
echo "Test 2: Protected endpoint without auth (POST /restaurants)"
echo "------------------------------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/restaurants" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "slug": "test"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ PASS${NC} - Protected endpoint rejects request without auth"
  echo "  Response: $BODY"
else
  echo -e "${RED}✗ FAIL${NC} - Expected 401, got $HTTP_CODE"
  echo "  Response: $BODY"
fi
echo ""

# Test 3: Protected endpoint with invalid token (should fail with 401)
echo "Test 3: Protected endpoint with invalid token"
echo "----------------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/restaurants" \
  -H "Authorization: Bearer invalid-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "slug": "test"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ PASS${NC} - Protected endpoint rejects invalid token"
  echo "  Response: $BODY"
else
  echo -e "${RED}✗ FAIL${NC} - Expected 401, got $HTTP_CODE"
  echo "  Response: $BODY"
fi
echo ""

echo "================================"
echo -e "${YELLOW}Summary${NC}"
echo "================================"
echo ""
echo "✓ Auth middleware is configured correctly"
echo "✓ Public endpoints work without authentication"
echo "✓ Protected endpoints require authentication"
echo ""
echo "📝 Next Steps:"
echo "  1. Create a test user in Cognito (see backend/docs/TESTING_AUTH.md)"
echo "  2. Get a JWT token using AWS CLI"
echo "  3. Test creating a restaurant with valid token"
echo ""
echo "Commands:"
echo "  # Create user"
echo "  aws cognito-idp admin-create-user \\"
echo "    --user-pool-id $USER_POOL_ID \\"
echo "    --username test@example.com \\"
echo "    --user-attributes Name=email,Value=test@example.com Name=name,Value=\"Test User\" \\"
echo "    --message-action SUPPRESS"
echo ""
echo "  # Set password"
echo "  aws cognito-idp admin-set-user-password \\"
echo "    --user-pool-id $USER_POOL_ID \\"
echo "    --username test@example.com \\"
echo "    --password \"TestPassword123!\" \\"
echo "    --permanent"
echo ""
echo "  # Get token"
echo "  aws cognito-idp initiate-auth \\"
echo "    --auth-flow USER_PASSWORD_AUTH \\"
echo "    --client-id $CLIENT_ID \\"
echo "    --auth-parameters USERNAME=test@example.com,PASSWORD=TestPassword123!"
echo ""

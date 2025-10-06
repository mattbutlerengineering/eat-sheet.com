#!/bin/bash

# Test Eat-Sheet API

BASE_URL="http://localhost:3000"

echo "=== Testing Eat-Sheet API ==="
echo

echo "1. Health check:"
curl -s "$BASE_URL/health"
echo
echo

echo "2. Create restaurant:"
curl -s -X POST "$BASE_URL/api/restaurants" \
  -H "Content-Type: application/json" \
  --data-binary @- << 'EOF'
{
  "slug": "joes-pizza",
  "name": "Joe's Pizza",
  "description": "Best pizza in town!",
  "address": "123 Main St",
  "phone": "555-1234",
  "email": "contact@joespizza.com"
}
EOF
echo
echo

echo "3. List restaurants:"
curl -s "$BASE_URL/api/restaurants"
echo
echo

echo "4. Get restaurant by slug:"
curl -s "$BASE_URL/api/restaurants/joes-pizza"
echo
echo

echo "Done!"
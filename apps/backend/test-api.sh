#!/bin/bash

# Test Eat-Sheet API

BASE_URL="http://localhost:3000"

echo "=== Testing Eat-Sheet API ==="
echo

# Get restaurant ID for later use
RESTAURANT_ID=""
MENU_ID=""

echo "1. Health check:"
curl -s "$BASE_URL/health"
echo
echo

echo "2. Create restaurant:"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/restaurants" \
  -H "Content-Type: application/json" \
  --data-binary @- << 'EOF'
{
  "slug": "test-restaurant",
  "name": "Test Restaurant",
  "description": "A test restaurant",
  "address": "123 Test St",
  "phone": "555-9999",
  "email": "test@restaurant.com"
}
EOF
)
echo "$RESPONSE"
RESTAURANT_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo
echo "Restaurant ID: $RESTAURANT_ID"
echo

echo "3. Create menu for restaurant:"
MENU_RESPONSE=$(curl -s -X POST "$BASE_URL/api/restaurants/$RESTAURANT_ID/menus" \
  -H "Content-Type: application/json" \
  --data-binary @- << 'EOF'
{
  "slug": "dinner-menu",
  "name": "Dinner Menu",
  "description": "Evening dining options",
  "status": "active"
}
EOF
)
echo "$MENU_RESPONSE"
MENU_ID=$(echo "$MENU_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo
echo "Menu ID: $MENU_ID"
echo

echo "4. Get menu by slug:"
curl -s "$BASE_URL/api/restaurants/test-restaurant/menus/dinner-menu"
echo
echo

echo "5. Create menu item:"
curl -s -X POST "$BASE_URL/api/menus/$MENU_ID/items" \
  -H "Content-Type: application/json" \
  --data-binary @- << 'EOF'
{
  "name": "Margherita Pizza",
  "description": "Fresh mozzarella, tomato sauce, basil",
  "price": 1299,
  "section": "Pizza",
  "status": "available"
}
EOF
echo
echo

echo "6. List menu items:"
curl -s "$BASE_URL/api/menus/$MENU_ID/items"
echo
echo

echo "7. List menus for restaurant:"
curl -s "$BASE_URL/api/restaurants/$RESTAURANT_ID/menus"
echo
echo

echo "Done!"
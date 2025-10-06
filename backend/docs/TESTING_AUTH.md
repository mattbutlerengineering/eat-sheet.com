# Testing Authentication

## Overview

The backend API uses AWS Cognito for authentication. Protected endpoints require a valid JWT token in the `Authorization` header.

## Prerequisites

1. AWS Cognito User Pool configured (via Pulumi)
2. Backend server running (`pnpm backend:dev`)
3. User account created in Cognito

## Create a Test User

### Option 1: AWS Console

1. Go to AWS Console → Cognito
2. Select User Pool: `eat-sheet-users-dev`
3. Click "Create user"
4. Enter email and temporary password
5. User will need to change password on first login

### Option 2: AWS CLI

```bash
# Create user
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_HAkQVaB0z \
  --username test@example.com \
  --user-attributes Name=email,Value=test@example.com Name=name,Value="Test User" \
  --message-action SUPPRESS

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_HAkQVaB0z \
  --username test@example.com \
  --password "TestPassword123!" \
  --permanent
```

## Get JWT Token

### Using AWS CLI

```bash
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id 7dorkqft0af2pq2qqalp862etj \
  --auth-parameters USERNAME=test@example.com,PASSWORD=TestPassword123!
```

Response will include:
```json
{
  "AuthenticationResult": {
    "AccessToken": "eyJraWQiOiI...",
    "IdToken": "eyJraWQiOiI...",
    "RefreshToken": "eyJjdHkiOiI...",
    "ExpiresIn": 3600,
    "TokenType": "Bearer"
  }
}
```

**Note:** Use the `IdToken` (not AccessToken) for API calls.

### Using curl

```bash
# Store credentials
USER_POOL_ID="us-east-1_HAkQVaB0z"
CLIENT_ID="7dorkqft0af2pq2qqalp862etj"
USERNAME="test@example.com"
PASSWORD="TestPassword123!"

# Get tokens
TOKENS=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id $CLIENT_ID \
  --auth-parameters USERNAME=$USERNAME,PASSWORD=$PASSWORD)

# Extract ID token
ID_TOKEN=$(echo $TOKENS | jq -r '.AuthenticationResult.IdToken')

# Test authenticated endpoint
curl -X POST http://localhost:3000/api/restaurants \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Restaurant",
    "slug": "test-restaurant",
    "description": "A test restaurant"
  }'
```

## Test Scenarios

### 1. Public Endpoints (No Auth Required)

```bash
# List restaurants
curl http://localhost:3000/api/restaurants

# Get restaurant by slug
curl http://localhost:3000/api/restaurants/test-restaurant

# Get menu
curl http://localhost:3000/api/menus/breakfast-menu
```

### 2. Protected Endpoints (Auth Required)

```bash
# Create restaurant (requires auth)
curl -X POST http://localhost:3000/api/restaurants \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Restaurant",
    "slug": "my-restaurant",
    "description": "My awesome restaurant"
  }'

# Update restaurant (requires auth + maintainer role)
curl -X PATCH http://localhost:3000/api/restaurants/{id} \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description"
  }'

# Delete restaurant (requires auth + owner role)
curl -X DELETE http://localhost:3000/api/restaurants/{id} \
  -H "Authorization: Bearer $ID_TOKEN"
```

### 3. Error Cases

```bash
# Missing auth header (401)
curl -X POST http://localhost:3000/api/restaurants \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "slug": "test"}'

# Invalid token (401)
curl -X POST http://localhost:3000/api/restaurants \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "slug": "test"}'

# Not a maintainer (403)
# Try to update a restaurant you don't own
curl -X PATCH http://localhost:3000/api/restaurants/{other-user-restaurant-id} \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "Hacked!"}'
```

## JWT Token Structure

The Cognito ID token contains:
- `sub`: Cognito user ID (used as `cognitoSub` in database)
- `email`: User's email
- `name`: User's name
- `iss`: Issuer (Cognito User Pool)
- `exp`: Expiration time (1 hour by default)

## Auto-User Creation

When a user logs in for the first time, the auth middleware automatically creates a user record in the `users` table with:
- `cognito_sub`: from JWT `sub` field
- `email`: from JWT `email` field
- `name`: from JWT `name` field

## Restaurant Ownership

When a user creates a restaurant, they automatically become the **owner** via the `restaurant_maintainers` table:
- **Owner** role: Can update, delete, and manage other maintainers
- **Maintainer** role: Can update restaurant/menus/items (for future use)

## Debugging Tips

1. **Decode JWT token**: Use [jwt.io](https://jwt.io) to inspect token contents
2. **Check token expiry**: Tokens expire after 1 hour by default
3. **Verify JWKS**: Check that Cognito JWKS endpoint is accessible:
   ```bash
   curl https://cognito-idp.us-east-1.amazonaws.com/us-east-1_HAkQVaB0z/.well-known/jwks.json
   ```
4. **Check server logs**: Auth errors are logged to console
5. **Database inspection**: Use Drizzle Studio to verify user was created:
   ```bash
   pnpm --filter @eat-sheet/backend db:studio
   ```

## Common Errors

### "The requested module 'jsonwebtoken' does not provide an export named 'verify'"
- **Fix**: Import as default: `import jwt from 'jsonwebtoken'` then use `jwt.verify()`

### "Missing or invalid authorization header"
- **Cause**: No `Authorization: Bearer <token>` header
- **Fix**: Add header to request

### "Unauthorized"
- **Cause**: Invalid or expired token
- **Fix**: Get a fresh token from Cognito

### "Forbidden: You are not a maintainer of this restaurant"
- **Cause**: Trying to update/delete a restaurant you don't own
- **Fix**: Only update restaurants you created

## Next Steps

1. Create a test user via AWS CLI
2. Get JWT token
3. Test creating a restaurant
4. Verify user and maintainer records in database
5. Test update/delete with authorization checks

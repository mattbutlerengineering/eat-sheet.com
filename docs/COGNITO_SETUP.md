# AWS Cognito Setup Guide

This guide walks you through setting up AWS Cognito for authentication in the Eat-Sheet project.

## What is AWS Cognito?

AWS Cognito provides:
- **User authentication** - Sign up, sign in, password management
- **JWT tokens** - Secure authentication tokens for API requests
- **User management** - Manage users, groups, and permissions
- **Security** - MFA, password policies, account recovery

## Step 1: Create Cognito User Pool

1. **Go to AWS Cognito Console**: https://console.aws.amazon.com/cognito
2. **Click "Create user pool"**
3. **Configure sign-in experience:**
   - Sign-in options: ✅ Email
   - User name requirements: Keep defaults
   - Click "Next"

4. **Configure security requirements:**
   - Password policy: Choose "Cognito defaults" (good for MVP)
   - Multi-factor authentication: "No MFA" (can enable later)
   - User account recovery: ✅ Enable self-service account recovery
   - Recovery method: Email only
   - Click "Next"

5. **Configure sign-up experience:**
   - Self-service sign-up: ✅ Enable
   - Attribute verification: ✅ Email
   - Required attributes:
     - ✅ email
     - ✅ name
   - Click "Next"

6. **Configure message delivery:**
   - Email provider: "Send email with Amazon SES" (use SES sandbox for now)
   - SES Region: us-east-1
   - FROM email address: Use verified email (or configure SES)
   - Click "Next"

7. **Integrate your app:**
   - User pool name: `eat-sheet-users`
   - App client name: `eat-sheet-web`
   - Client secret: "Don't generate a client secret" (for public web apps)
   - Authentication flows: ✅ ALLOW_USER_PASSWORD_AUTH, ✅ ALLOW_REFRESH_TOKEN_AUTH
   - Click "Next"

8. **Review and create:**
   - Review all settings
   - Click "Create user pool"

## Step 2: Get Cognito Configuration Values

After creating the user pool, you'll need these values:

1. **User Pool ID:**
   - Go to your user pool
   - Copy the "User pool ID" (e.g., `us-east-1_xxxxx`)

2. **App Client ID:**
   - Go to "App integration" tab
   - Under "App clients", copy the "Client ID"

3. **Region:**
   - Your AWS region (e.g., `us-east-1`)

## Step 3: Configure Backend Environment

Add Cognito configuration to `apps/backend/.env`:

```bash
# apps/backend/.env
DATABASE_URL=postgresql://...
NODE_ENV=development

# AWS Cognito
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_REGION=us-east-1
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx
```

## Step 4: Set Up SES for Email (Optional but Recommended)

If using Amazon SES for emails:

1. **Go to SES Console**: https://console.aws.amazon.com/ses
2. **Verify email address:**
   - Click "Verified identities" → "Create identity"
   - Identity type: Email address
   - Email: `noreply@eat-sheet.com` (or your email for testing)
   - Click "Create identity"
   - Check your email and click verification link

3. **Request production access (when ready):**
   - By default, SES is in "Sandbox mode" (can only send to verified emails)
   - When ready for production, request production access in SES console
   - This allows sending to any email address

## Step 5: Test User Sign Up (Manual)

1. **Go to Cognito User Pool** in AWS Console
2. **Click "Create user"** (for testing)
   - Username: test@example.com
   - Email: test@example.com
   - Name: Test User
   - Set temporary password: Test123!
   - ✅ Mark email as verified
   - Click "Create user"

3. **Or use the API** (we'll build this in frontend later)

## Step 6: Configure Pulumi Secrets

For deployment, set Cognito values as Pulumi secrets:

```bash
cd apps/infrastructure

# Set Cognito configuration
pulumi config set cognitoUserPoolId "us-east-1_xxxxx"
pulumi config set cognitoRegion "us-east-1"
pulumi config set cognitoClientId "xxxxxxxxxxxxxxxxxxxxx"

# Database URL (already set)
pulumi config set --secret databaseUrl "postgresql://..."
```

## JWT Token Structure

Cognito issues JWT tokens with this structure:

```json
{
  "sub": "uuid-xxxx-xxxx-xxxx",  // Unique user ID
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "cognito:username": "user@example.com",
  "exp": 1234567890,  // Expiration timestamp
  "iat": 1234567890   // Issued at timestamp
}
```

## Backend Auth Middleware

The backend will:
1. Extract JWT from `Authorization: Bearer <token>` header
2. Verify JWT signature using Cognito public keys (JWKS)
3. Validate expiration
4. Extract user info (sub, email, name)
5. Find or create user in database
6. Attach user to request context

## Frontend Auth Flow

The frontend will:
1. User signs up/logs in via Cognito
2. Cognito returns JWT access token + refresh token
3. Store tokens securely (httpOnly cookie or secure storage)
4. Include access token in API requests: `Authorization: Bearer <token>`
5. Refresh token when expired

## API Endpoints Requiring Auth

**Protected endpoints (require authentication):**
- `POST /api/restaurants` - Create restaurant
- `PATCH /api/restaurants/:id` - Update restaurant
- `DELETE /api/restaurants/:id` - Delete restaurant
- `POST /api/restaurants/:id/menus` - Create menu
- `PATCH /api/menus/:id` - Update menu
- `DELETE /api/menus/:id` - Delete menu
- `POST /api/menus/:id/items` - Create menu item
- `PATCH /api/items/:id` - Update menu item
- `DELETE /api/items/:id` - Delete menu item

**Public endpoints (no auth required):**
- `GET /api/restaurants` - List restaurants
- `GET /api/restaurants/:slug` - Get restaurant
- `GET /api/restaurants/:slug/menus/:slug` - Get menu
- `GET /api/menus/:id/items` - List menu items
- `GET /api/items/:id` - Get menu item

## Authorization Rules

1. **Restaurant ownership:**
   - User who creates restaurant becomes owner
   - Owner can manage restaurant, menus, items
   - (Future: invite other maintainers)

2. **Menu/Item management:**
   - Only restaurant owner can create/update/delete menus
   - Only restaurant owner can create/update/delete menu items

## Testing Auth with cURL

### 1. Sign up a user:
```bash
aws cognito-idp sign-up \
  --client-id YOUR_CLIENT_ID \
  --username test@example.com \
  --password Test123! \
  --user-attributes Name=email,Value=test@example.com Name=name,Value="Test User"
```

### 2. Confirm user (admin command):
```bash
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id YOUR_USER_POOL_ID \
  --username test@example.com
```

### 3. Sign in to get tokens:
```bash
aws cognito-idp initiate-auth \
  --client-id YOUR_CLIENT_ID \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=test@example.com,PASSWORD=Test123!
```

This returns:
```json
{
  "AuthenticationResult": {
    "AccessToken": "eyJraWQiOiJ...",
    "IdToken": "eyJraWQiOiJ...",
    "RefreshToken": "eyJjdHkiOiJ...",
    "ExpiresIn": 3600
  }
}
```

### 4. Use access token in API requests:
```bash
curl -X POST http://localhost:3000/api/restaurants \
  -H "Authorization: Bearer eyJraWQiOiJ..." \
  -H "Content-Type: application/json" \
  -d '{"slug":"my-restaurant","name":"My Restaurant"}'
```

## Security Best Practices

- ✅ **DO**: Use HTTPS in production
- ✅ **DO**: Set short token expiration (1 hour)
- ✅ **DO**: Use refresh tokens for long sessions
- ✅ **DO**: Validate JWT signature with Cognito JWKS
- ✅ **DO**: Store refresh tokens securely (httpOnly cookies)
- ❌ **DON'T**: Store tokens in localStorage (XSS risk)
- ❌ **DON'T**: Send tokens in URL parameters
- ❌ **DON'T**: Log tokens or sensitive data

## Troubleshooting

### "User is not confirmed"
- Manually confirm user in Cognito console
- Or use `admin-confirm-sign-up` CLI command

### "Invalid authentication flow"
- Ensure `ALLOW_USER_PASSWORD_AUTH` is enabled in app client settings

### "JWT signature verification failed"
- Check that `COGNITO_USER_POOL_ID` and `COGNITO_REGION` are correct
- Ensure clock is synchronized (JWT expiration is time-sensitive)

### "Missing required attributes"
- Ensure email and name are provided during sign up

## Next Steps

After Cognito setup:
1. Implement auth middleware in backend
2. Protect endpoints with auth middleware
3. Build frontend sign up/login pages
4. Integrate frontend with Cognito
5. Test full authentication flow

## Useful Links

- **Cognito Console**: https://console.aws.amazon.com/cognito
- **Cognito Documentation**: https://docs.aws.amazon.com/cognito
- **JWT Decoder**: https://jwt.io (for debugging tokens)
- **SES Console**: https://console.aws.amazon.com/ses
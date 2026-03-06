# Arctic OAuth Migration Design

## Context

The app currently uses Google Identity Services (GIS) for authentication — a client-side popup returns an ID token, the server verifies it against Google's JWKS. This is tightly coupled to Google. We want a provider-agnostic OAuth architecture so adding Apple, GitHub, etc. requires minimal code.

## Decision

Use **Arctic** (lightweight OAuth 2.0 library, runtime-agnostic, ~5KB) with a standard redirect-based OAuth flow. Replace GIS entirely. Keep the existing JWT session system.

## Architecture

### DB Schema

Generalize from `google_id` to `oauth_provider` + `oauth_id`:

```sql
-- Migration 009
ALTER TABLE members ADD COLUMN oauth_provider TEXT;
ALTER TABLE members ADD COLUMN oauth_id TEXT;
UPDATE members SET oauth_provider = 'google', oauth_id = google_id WHERE google_id IS NOT NULL;
CREATE UNIQUE INDEX idx_members_oauth ON members(oauth_provider, oauth_id);
DROP INDEX IF EXISTS idx_members_google_id;
-- google_id column kept temporarily, dropped in follow-up migration
```

### OAuth Flow

```
Client clicks "Sign in with Google"
  → GET /api/auth/google
  → Server creates Arctic client, generates state + PKCE verifier
  → Sets state/verifier in httpOnly cookies (short-lived, sameSite=lax)
  → Redirects to Google's authorization URL

Google authenticates user, redirects back
  → GET /api/auth/google/callback?code=...&state=...
  → Server validates state against cookie
  → Exchanges code for tokens via Arctic
  → Decodes ID token for user profile (sub, email, name)

If oauth_provider='google' + oauth_id=sub exists in DB:
  → Issue JWT, redirect to app (authenticated)

If no match:
  → Create temp registration token (JWT, 10min TTL)
  → Redirect to /?register=true&token=<temp_token>

Client shows invite code + name form
  → POST /api/auth/join with invite_code, name, temp token
  → Server verifies temp token, creates/links member
  → Issue session JWT
```

### Server Files

| File | Action | Purpose |
|------|--------|---------|
| `src/server/utils/oauth-providers.ts` | **Create** | Provider registry — maps provider name to Arctic client + config |
| `src/server/routes/auth.ts` | **Modify** | Add `:provider` and `:provider/callback` routes, update `/join` |
| `src/server/utils/google-auth.ts` | **Delete** | Replaced by Arctic |

### Provider Registry

```ts
// src/server/utils/oauth-providers.ts
const providers = {
  google: {
    createClient: (env) => new arctic.Google(clientId, clientSecret, redirectUri),
    scopes: ["openid", "profile", "email"],
    getProfile: (tokens) => {
      const claims = arctic.decodeIdToken(tokens.idToken());
      return { id: claims.sub, email: claims.email, name: claims.name };
    },
  },
  // Future: apple, github, etc.
};
```

Adding a provider = one new entry + register OAuth app with provider.

### Client Files

| File | Action | Purpose |
|------|--------|---------|
| `src/client/components/GoogleSignInButton.tsx` | **Delete** | Replaced by simple link buttons |
| `src/client/components/OAuthButton.tsx` | **Create** | Link/button that navigates to `GET /api/auth/:provider` |
| `src/client/components/JoinScreen.tsx` | **Modify** | Show OAuth buttons on sign-in, registration form on `?register=true` |
| `src/client/hooks/useAuth.ts` | **Modify** | Remove `googleAuth`/`googleRegister`, add registration handler |
| `src/client/hooks/useGoogleAuth.ts` | **Delete** | No longer needed |
| `src/client/types/google-gsi.d.ts` | **Delete** | GIS types no longer needed |
| `src/client/App.tsx` | **Modify** | Handle `?register=true` query param |

### What Stays the Same

- JWT session system (Hono sign/verify, authMiddleware, HS256)
- All protected routes and auth checks
- families, invite_code, is_admin system
- "First member = admin" logic
- Member linking by (family_id, name) for existing users upgrading
- localStorage-based auth persistence on client

### Environment Variables

```
# Server (Cloudflare Workers)
GOOGLE_OAUTH_CLIENT_ID      # Was GOOGLE_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET   # New — needed for code exchange
OAUTH_REDIRECT_BASE          # e.g. "https://eat-sheet.com"
JWT_SECRET                   # Unchanged

# Client (Vite)
VITE_GOOGLE_CLIENT_ID        # Remove — server handles OAuth now
```

### Migration Strategy

1. **Members with google_id**: Migration 009 backfills oauth_provider/oauth_id. Seamless on next sign-in.
2. **Members without google_id**: Sign in with Google → no match → registration form → enter invite code + existing name → server links by (family_id, name).
3. **No downtime, no data loss.**

### Security

- PKCE (Proof Key for Code Exchange) on all OAuth flows
- State parameter in httpOnly cookies for CSRF protection
- Temp registration tokens expire in 10 minutes
- OAuth client secret never exposed to client
- All cookie attributes: httpOnly, secure, sameSite=lax

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Eat-Sheet is a modern digital menu platform that provides exceptional user experiences for restaurant customers while giving restaurant owners powerful tools to manage and showcase their menus with beautiful, themeable designs. The platform is PWA-based, serverless, and designed to be cost-effective while scalable.

## Tech Stack

**Frontend:**
- React 18+ with TypeScript
- Mantine UI component library
- Vite for build tooling
- TanStack Query (React Query) for server state
- Storybook for component development and documentation
- PWA capabilities (service worker, offline support)

**Backend:**
- Hono web framework with @hono/zod-openapi
- Node.js runtime on AWS Lambda
- TypeScript
- Zod for schema validation and OpenAPI generation

**Database:**
- PostgreSQL (Neon free tier)
- Drizzle ORM
- Database migrations via Drizzle Kit

**Authentication:**
- AWS Cognito
- JWT tokens

**Infrastructure:**
- Pulumi (TypeScript) for Infrastructure as Code
- AWS Lambda (API hosting)
- AWS API Gateway (REST API)
- AWS S3 (static hosting + images)
- AWS CloudFront (CDN)

**Monorepo Management:**
- Rush - Microsoft's monorepo manager for build orchestration
- PNPM - Fast, disk-space efficient package manager

**External Services:**
- OpenAI API for AI-powered modification suggestions

## Project Structure

```
eat-sheet/
├── apps/
│   ├── backend/                # Hono API
│   │   ├── src/
│   │   │   ├── index.ts       # Main API entry point
│   │   │   ├── routes/        # API route handlers
│   │   │   ├── middleware/    # Auth & validation middleware
│   │   │   ├── schemas/       # Zod schemas for validation
│   │   │   ├── db/           # Drizzle ORM configuration
│   │   │   └── lib/          # Utility functions
│   │   └── drizzle/          # Database migrations
│   ├── frontend/              # React PWA
│   │   ├── src/
│   │   │   ├── pages/        # Page components
│   │   │   ├── components/   # Reusable components
│   │   │   ├── hooks/        # React Query hooks
│   │   │   ├── lib/          # Utilities (API client, etc.)
│   │   │   ├── App.tsx       # Main app with routing
│   │   │   └── main.tsx      # React entry point
│   │   ├── public/           # Static assets
│   │   └── .storybook/       # Storybook configuration
│   └── infrastructure/        # Pulumi IaC (TypeScript)
│       ├── index.ts          # Main infrastructure entry point
│       └── ...               # AWS resource definitions
├── packages/
│   └── shared/               # Shared types and utilities
├── common/                   # Rush configuration
│   └── config/rush/         # Rush config files
└── docs/                    # Documentation
```

## Common Development Commands

This monorepo uses Rush for build orchestration. Rush provides better caching, parallel builds, and dependency management compared to pnpm workspaces alone.

### Backend Development

```bash
# Install all dependencies (from root)
rush update

# Start local development server
rushx dev -p @eat-sheet/backend

# Or from backend directory
cd apps/backend
rushx dev

# Generate database migrations
rushx db:generate

# Run database migrations
rushx db:migrate

# Open Drizzle Studio (database GUI)
rushx db:studio

# Build for Lambda deployment
rushx build

# Run tests
rushx test

# Lint code
rushx lint

# Type check
rushx type-check
```

### Frontend Development

```bash
# Install all dependencies (from root)
rush update

# Start development server
cd apps/frontend
rushx dev

# Build for production
rushx build

# Preview production build
rushx preview

# Run tests
rushx test

# Lint code
rushx lint

# Start Storybook
rushx storybook

# Build Storybook for deployment
rushx build-storybook
```

### Infrastructure Deployment

```bash
# Initialize Pulumi stack (first time only)
cd apps/infrastructure
pulumi stack init dev
pulumi config set aws:region us-east-1
pulumi config set eat-sheet:domain eat-sheet.com

# Set secrets
pulumi config set --secret databaseUrl "postgresql://..."
pulumi config set --secret openaiApiKey "sk-..."

# Preview changes
pulumi preview

# Deploy infrastructure
pulumi up

# View current stack outputs
pulumi stack output

# Destroy infrastructure (careful!)
pulumi destroy
```

### Rush Commands

```bash
# Install all dependencies
rush update

# Build all projects
rush build

# Build only changed projects
rush build --changed

# Build a specific project and its dependencies
rush build --to @eat-sheet/backend

# Rebuild all (clean + build)
rush rebuild

# Run script in specific project (from root)
rushx dev -p @eat-sheet/backend

# Remove all node_modules
rush purge

# Check for circular dependencies
rush check
```

### Full Deployment Workflow

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for comprehensive deployment guide.

**Quick deployment via GitHub Actions:**

```bash
# Deploy to staging (automatic on push to main)
git push origin main

# Deploy to production (manual with confirmation)
gh workflow run deploy-production.yml -f confirm=deploy
```

**Manual deployment steps:**

```bash
# 1. Build backend
rush build --to @eat-sheet/backend

# 2. Deploy infrastructure (includes Lambda)
cd apps/infrastructure
pulumi up --stack staging  # or prod

# 3. Build frontend
rush build --to @eat-sheet/frontend

# 4. Deploy frontend to S3
aws s3 sync apps/frontend/dist/ s3://eat-sheet-frontend-staging --delete

# 5. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

**Deployment Environments:**
- **Staging**: Auto-deploys on push to `main` branch
- **Production**: Manual deployment with required approval

## Architecture Overview

### URL Structure
- Restaurant landing page: `eat-sheet.com/{restaurant-slug}`
- Specific menu: `eat-sheet.com/{restaurant-slug}/{menu-slug}`
- Dashboard: `eat-sheet.com/dashboard`
- Shared order: `eat-sheet.com/shared/{token}`

### Database Schema (Core Tables)

**users** - Consumer and maintainer accounts (synced from Cognito)
- Links to Cognito via `cognito_sub`

**restaurants** - Restaurant entities
- Identified by unique slug
- Contains branding, contact info, hours

**restaurant_maintainers** - Junction table (many-to-many)
- Links users to restaurants they can manage
- Roles: `owner` or `maintainer`
- First creator becomes owner

**menus** - Restaurant menus
- Belongs to one restaurant
- Unique slug per restaurant
- Contains theme configuration JSON
- Status: `active`, `inactive`, or `draft`

**menu_items** - Individual menu items
- Belongs to one menu
- Grouped by optional `section` field
- Images stored as JSON array of S3 URLs
- Status: `available`, `sold_out`, or `hidden`

**reviews** - User reviews on menu items
- One review per user per item (unique constraint)
- Rating 1-5 + optional text

**saved_orders** - Consumer saved orders
- Items stored as JSON: `[{ itemId, modifications }]`

**analytics_events** - Event tracking for maintainer analytics
- Event types: `menu_view`, `item_view`, `review_created`

### Authentication Flow

1. User signs up/logs in via AWS Cognito
2. Frontend receives JWT access token
3. Token sent in `Authorization: Bearer <token>` header
4. Backend middleware verifies JWT signature with Cognito JWKS
5. User record created/retrieved in local database
6. User object attached to request context

### Authorization Patterns

**Public endpoints** (no auth required):
- GET restaurants, menus, items, reviews

**Consumer endpoints** (auth required):
- POST reviews
- Saved orders CRUD

**Maintainer endpoints** (auth + ownership check):
- Restaurant/menu/item management
- Must be in `restaurant_maintainers` table for that restaurant

**Owner endpoints** (auth + owner role):
- Manage other maintainers
- Delete restaurant
- Transfer ownership

### Image Upload Strategy

Uses pre-signed S3 URLs to avoid Lambda payload limits:

1. Frontend requests upload URL from `/api/images/upload-url`
2. API validates auth + generates S3 pre-signed URL (15 min expiry)
3. Frontend uploads directly to S3 using pre-signed URL
4. Frontend confirms upload via `/api/images/confirm`
5. S3 URLs stored in database
6. Images served via CloudFront CDN

### AI Modification Suggestions

When viewing a menu item, consumers can get AI-suggested modifications:
- Endpoint: `POST /api/items/:id/suggest-modifications`
- Uses OpenAI GPT-3.5-turbo to suggest common modifications
- Results should be cached in database to minimize API costs
- Fallback to generic suggestions if API fails

## Development Workflow

### Creating a New API Endpoint

1. Define Zod schema in `apps/backend/src/schemas/`
2. Create route with `@hono/zod-openapi` in `apps/backend/src/routes/`
3. Add route to `apps/backend/src/index.ts`
4. Use middleware for auth/validation as needed
5. Document with OpenAPI annotations

Example:
```typescript
const route = createRoute({
  method: "get",
  path: "/{id}",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: MySchema },
      },
      description: "Success",
    },
  },
});

app.openapi(route, requireAuth, async (c) => {
  // Handler logic
});
```

### Adding a Database Table

1. Add table definition to `apps/backend/src/db/schema.ts`
2. Export TypeScript types: `export type MyTable = typeof myTable.$inferSelect`
3. Generate migration: `rushx db:generate` (from apps/backend)
4. Review migration in `drizzle/` folder
5. Apply migration: `rushx db:migrate` (from apps/backend)

### Creating a Frontend Page

1. Create page component in `apps/frontend/src/pages/`
2. Add route in `apps/frontend/src/App.tsx`
3. Create React Query hook in `apps/frontend/src/hooks/` for data fetching
4. Use Mantine components for UI
5. Handle loading/error states

Example React Query hook:
```typescript
export function useRestaurant(slug: string) {
  return useQuery({
    queryKey: ['restaurant', slug],
    queryFn: async () => {
      const { data } = await api.get(`/restaurants/${slug}`);
      return data;
    },
  });
}
```

### Creating a Reusable Component with Storybook

1. Create component in `apps/frontend/src/components/`
2. Define clear prop interfaces with TypeScript
3. Create Storybook story file alongside component (e.g., `Button.stories.tsx`)
4. Document all component variants and states in Storybook
5. Include examples for different prop combinations

Example Storybook story:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { MenuItemCard } from './MenuItemCard';

const meta: Meta<typeof MenuItemCard> = {
  title: 'Components/MenuItemCard',
  component: MenuItemCard,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['available', 'sold_out', 'hidden'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof MenuItemCard>;

export const Available: Story = {
  args: {
    item: {
      id: '1',
      name: 'Margherita Pizza',
      description: 'Fresh mozzarella, tomato sauce, basil',
      price: 1299,
      status: 'available',
      images: ['/pizza.jpg'],
    },
  },
};

export const SoldOut: Story = {
  args: {
    ...Available.args,
    item: {
      ...Available.args.item!,
      status: 'sold_out',
    },
  },
};
```

## Important Implementation Notes

### Serverless Considerations

**Database connections:**
- Use connection pooling with `max: 1` for serverless
- PostgreSQL client configured with `prepare: false` for Drizzle
- Set timeouts appropriately for Lambda environment

**Lambda cold starts:**
- Keep bundle size small
- Consider increasing memory (faster CPU)
- Keep-warm strategies if needed (CloudWatch Events)

**Environment variables:**
- Set in Lambda via Pulumi environment config
- Never commit secrets to git
- Use Pulumi secrets for sensitive values

### Security Best Practices

- All protected endpoints use JWT validation
- Input validation via Zod schemas on all routes
- SQL injection protection via Drizzle ORM (parameterized queries)
- XSS protection via React auto-escaping
- S3 buckets are private (pre-signed URLs only)
- CORS properly configured for allowed origins
- Image upload size limits enforced (5MB max)

### PWA Implementation

- Vite PWA plugin configured in `apps/frontend/vite.config.ts`
- Service worker caches static assets and images
- Offline support for previously viewed menus
- Installable on mobile devices
- Target Lighthouse PWA score: 90+

### Performance Targets

- Page load time: < 2 seconds
- API response time: < 500ms (p95)
- Lambda cold start: < 1 second
- Images: lazy-loaded, progressive enhancement
- CloudFront caching for static assets

## Testing Strategy

### Backend
- Unit tests for route handlers and business logic
- Integration tests for API endpoints with Vitest
- Database operations tested with test database

### Frontend
- Component tests with React Testing Library
- Visual regression testing with Storybook interaction tests
- Accessibility testing via Storybook a11y addon
- End-to-end tests with Playwright for critical flows:
  - Consumer views menu
  - Maintainer creates restaurant/menu
  - Review submission
  - Order saving/sharing

### Manual Testing Checklist
- QR code scanning (iOS/Android)
- PWA installation
- Offline functionality
- Mobile responsiveness
- Cross-browser compatibility

## Environment Variables

### Backend (`apps/backend/.env`)
```
DATABASE_URL=postgresql://user:password@host:5432/database
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_REGION=us-east-1
AWS_REGION=us-east-1
S3_BUCKET_NAME=eat-sheet-images-dev
OPENAI_API_KEY=sk-xxxxx
NODE_ENV=development
```

### Frontend (`apps/frontend/.env`)
```
VITE_API_URL=https://api.eat-sheet.com
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxx
VITE_COGNITO_CLIENT_ID=xxxxx
VITE_COGNITO_REGION=us-east-1
```

## Troubleshooting Common Issues

**Lambda cold starts too slow:**
- Increase memory size (faster CPU): `memorySize: 1536`
- Optimize bundle size with tree-shaking
- Consider keeping functions warm with CloudWatch Events

**CORS errors:**
- Verify API Gateway CORS configuration in `apps/infrastructure/apigateway.ts`
- Check allowed origins match frontend URL
- Ensure preflight OPTIONS requests handled

**Database connection timeout:**
- Use connection pooling with `max: 1` for serverless
- Set appropriate timeouts: `connect_timeout: 10`, `idle_timeout: 20`

**Images not loading:**
- Verify S3 bucket policy allows CloudFront OAI
- Check CloudFront distribution status
- Ensure CORS configured on S3 bucket

**Authentication fails:**
- Verify JWT signature with correct Cognito JWKS endpoint
- Check token expiration
- Ensure Cognito User Pool ID matches environment variable

## Cost Optimization

- Use Neon free tier for PostgreSQL (upgrade when needed)
- Lambda: minimize memory where possible, optimize cold starts
- S3: enable Intelligent Tiering after 90 days
- CloudFront: aggressive caching reduces origin requests
- OpenAI: cache AI suggestions, use GPT-3.5 instead of GPT-4
- Images: compress before upload, use WebP format

**Expected monthly costs (low traffic):**
- AWS Services: ~$5-15/month
- Neon PostgreSQL: $0 (free tier)
- OpenAI API: <$1/month (with caching)
- **Total: ~$5-16/month**

## Key Development Phases

**Phase 1 (MVP Core):**
- Infrastructure setup
- Database schema + migrations
- Authentication
- API endpoints (restaurants, menus, items)
- Basic frontend (view menus)
- Image uploads
- QR code generation

**Phase 2 (Enhanced UX):**
- Restaurant landing pages
- Menu theming (pre-built themes)
- Reviews & ratings
- AI modification suggestions
- PDF export
- PWA capabilities

**Phase 3 (Social Features):**
- Save orders
- Share orders (public links)
- User-to-user sharing
- Basic analytics dashboard

**Phase 4 (Polish):**
- Custom theme builder
- Performance optimization
- Mobile responsiveness polish
- Error handling & edge cases
- Onboarding flows

## URLs and Resources

- **Production:** https://eat-sheet.com
- **API:** https://api.eat-sheet.com
- **OpenAPI Docs:** https://api.eat-sheet.com/api/openapi.json
- **Storybook (Development):** http://localhost:6006
- **Pulumi Console:** https://app.pulumi.com
- **Neon Dashboard:** https://console.neon.tech
- **AWS Console:** https://console.aws.amazon.com

## Git Workflow

**Branch naming:**
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/{feature-name}` - New features
- `fix/{bug-name}` - Bug fixes
- `hotfix/{critical-fix}` - Production hotfixes

**Commit message format:**
```
type(scope): subject

body (optional)

footer (optional)
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(menu): add AI modification suggestions

Integrate OpenAI API to suggest common modifications
based on menu item name and description.

Closes #123
```

## Code Style & Conventions

### TypeScript Style
- Use explicit return types for all exported functions
- Prefer interfaces for object types that may be extended
- Use type aliases for unions and complex types
- Always use async/await over .then() chains
- Use optional chaining (`?.`) and nullish coalescing (`??`) where appropriate

### React Conventions
- Functional components only (no class components)
- Custom hooks must start with "use" prefix
- Props interfaces named with "Props" suffix (e.g., `MenuCardProps`)
- Prefer composition over prop drilling (use Context when needed)
- Extract complex logic into custom hooks
- Use React.memo() sparingly, only for expensive components
- Create Storybook stories for all reusable components in `components/` directory

### File Naming
- Components: PascalCase (e.g., `MenuItemCard.tsx`)
- Storybook stories: Same name as component with `.stories.tsx` suffix (e.g., `MenuItemCard.stories.tsx`)
- Hooks: camelCase with "use" prefix (e.g., `useRestaurant.ts`)
- Utils/libs: camelCase (e.g., `apiClient.ts`)
- Schemas: camelCase (e.g., `restaurantSchema.ts`)
- Test files: Same name as source file with `.test.ts` suffix

### Import Organization
```typescript
// 1. External dependencies
import { useQuery } from '@tanstack/react-query';
import { Container, Title } from '@mantine/core';

// 2. Internal absolute imports
import { useRestaurant } from '@/hooks/useRestaurant';
import { api } from '@/lib/api';

// 3. Relative imports
import { MenuCard } from './MenuCard';
import type { Restaurant } from '../types';
```

## Error Handling Patterns

### API Endpoints
Always return structured error responses with consistent format:

```typescript
// Success response
return c.json({ data: restaurant }, 200);

// Error response
return c.json({
  error: "Resource not found",
  code: "RESOURCE_NOT_FOUND",
  details: { slug: requestedSlug }
}, 404);
```

**Standard error codes:**
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `RESOURCE_NOT_FOUND` - Resource doesn't exist
- `VALIDATION_ERROR` - Invalid input data
- `CONFLICT` - Resource already exists
- `INTERNAL_ERROR` - Unexpected server error

### Frontend Error Handling
Use React Query's built-in error handling:

```typescript
const { data, error, isError, isLoading } = useQuery({
  queryKey: ['restaurant', slug],
  queryFn: fetchRestaurant,
  retry: 3,
  retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
});

if (isError) {
  return <ErrorBoundary error={error} />;
}
```

### Lambda Error Logging
Always log errors with sufficient context:

```typescript
console.error('Failed to create restaurant', {
  error: error.message,
  stack: error.stack,
  userId: user.id,
  data: sanitizedData, // Don't log sensitive info
  timestamp: new Date().toISOString()
});
```

## Database Best Practices

### Always Use Transactions for Multi-Table Operations

```typescript
await db.transaction(async (tx) => {
  const [restaurant] = await tx
    .insert(restaurants)
    .values(data)
    .returning();

  await tx.insert(restaurantMaintainers).values({
    restaurantId: restaurant.id,
    userId: user.id,
    role: 'owner'
  });
});
```

### Index Strategy
- All foreign keys are indexed automatically by Drizzle
- Add composite indexes for frequent queries:
  - `(restaurant_id, slug)` on menus table
  - `(menu_id, section)` on menu_items table
  - `(user_id, restaurant_id)` on saved_orders table
- Add indexes on status fields used in WHERE clauses
- Review query performance with `EXPLAIN ANALYZE` in production

### Avoid N+1 Queries
Use Drizzle's `with` for eager loading related data:

```typescript
const menus = await db.query.menus.findMany({
  where: eq(menus.restaurantId, restaurantId),
  with: {
    items: {
      where: eq(menuItems.status, 'available'),
      orderBy: [asc(menuItems.displayOrder)]
    }
  }
});
```

### Query Optimization
- Select only needed columns, avoid `SELECT *`
- Always use `LIMIT` for list queries
- Use pagination for large result sets
- Cache frequently accessed data (menus, restaurants)

## Testing Guidelines

### What to Test
- **Unit:** Business logic, utility functions, schema validation
- **Integration:** API endpoints with database interactions
- **Component:** Component behavior and user interactions with React Testing Library
- **Visual:** Component appearance and states with Storybook stories
- **Accessibility:** WCAG compliance using Storybook a11y addon
- **E2E:** Critical user journeys (menu viewing, order creation, QR code flow)

### Test File Organization
- Place tests next to source files: `restaurantService.test.ts`
- Or in `__tests__/` directory for larger test suites
- Use descriptive test names: `should create restaurant and assign owner role`

### Mock External Services
Always mock AWS services and OpenAI in tests:

```typescript
import { vi } from 'vitest';

vi.mock('@aws-sdk/client-s3');
vi.mock('openai');

// Mock Cognito JWT verification
vi.mock('jsonwebtoken', () => ({
  verify: vi.fn((token, getKey, options, callback) => {
    callback(null, { sub: 'test-user', email: 'test@example.com' });
  })
}));
```

### Database Testing
- Use a separate test database
- Reset database state between tests
- Use transactions for test isolation when possible

## Performance Optimization

### Frontend Performance
- **Code splitting:** Lazy load routes with `React.lazy()`
- **Component optimization:** Use `React.memo()` for expensive components that rarely change
- **Virtual scrolling:** Implement for long lists (e.g., 100+ menu items)
- **Image optimization:**
  - WebP format preferred
  - Max width 1200px for hero images, 800px for item images
  - Compress to <100KB per image
  - Use responsive images with `srcset`
- **Bundle optimization:**
  - Tree-shake unused code
  - Code split large dependencies
  - Target bundle size <500KB initial load

### Backend Performance
- **Caching strategy:**
  - Cache menu data (TTL: 5 minutes)
  - Cache restaurant data (TTL: 15 minutes)
  - Cache AI modification suggestions permanently
- **Database connections:**
  - Use connection pooling with `max: 1` (serverless)
  - Set appropriate timeouts
- **Analytics batching:**
  - Batch analytics events (insert 100 at a time)
  - Use async processing (don't block API response)
- **Lambda optimization:**
  - Set timeout to 30s max
  - Increase memory for CPU-intensive operations
  - Keep bundle size <6MB

### CloudFront Caching
- Cache static assets: `max-age=31536000` (1 year)
- Cache API responses for public data: `max-age=300` (5 minutes)
- Use `Cache-Control` headers appropriately
- Implement cache invalidation on content updates

## Security Checklist

### Pre-Deployment Security Review
- [ ] No hardcoded secrets or API keys in code
- [ ] All environment variables use Pulumi secrets for sensitive values
- [ ] CORS restricted to production domains only (no wildcards in prod)
- [ ] Rate limiting enabled on authentication endpoints
- [ ] SQL injection protection verified (parameterized queries)
- [ ] XSS protection verified (React auto-escapes, no `dangerouslySetInnerHTML`)
- [ ] Image upload validation enforced (file type, size, content)
- [ ] JWT signature verification working correctly
- [ ] S3 buckets have proper access controls (no public access)

### Regular Security Maintenance
- [ ] Update dependencies monthly: `pnpm audit --fix`
- [ ] Review and rotate database credentials quarterly
- [ ] Monitor CloudWatch logs for suspicious patterns
- [ ] Test authentication flows with invalid/expired tokens
- [ ] Review IAM roles and policies (principle of least privilege)
- [ ] Check for exposed secrets with `git-secrets` or similar tool

### Input Validation
Every API endpoint must validate:
- Request body with Zod schemas
- URL parameters (UUIDs, slugs, etc.)
- File uploads (type, size, content validation)
- Authentication tokens (signature, expiration)

## Deployment Best Practices

### Pre-Deployment Checklist

**Before deploying to any environment:**
1. [ ] All tests passing (`pnpm test` from root)
2. [ ] TypeScript compiles without errors (`pnpm type-check` from root)
3. [ ] No linting errors (`pnpm lint` from root)
4. [ ] Database migrations tested in staging first
5. [ ] Environment variables updated in Pulumi config
6. [ ] Breaking changes documented in PR description
7. [ ] Rollback plan documented and tested

### Deployment Process

**Standard deployment steps:**

1. **Build backend:**
   ```bash
   rush build --to @eat-sheet/backend
   # Verify apps/backend/dist/index.js exists and is <6MB
   ```

2. **Deploy infrastructure (includes Lambda):**
   ```bash
   cd apps/infrastructure
   pulumi preview  # Review changes first
   pulumi up       # Deploy
   ```

3. **Verify Lambda deployment:**
   - Check AWS Console for new Lambda version
   - Test health endpoint: `curl https://api.eat-sheet.com/health`
   - Monitor CloudWatch logs for errors

4. **Build frontend:**
   ```bash
   rush build --to @eat-sheet/frontend
   # Verify apps/frontend/dist/ directory size is reasonable
   ```

5. **Deploy frontend to S3:**
   ```bash
   aws s3 sync apps/frontend/dist/ s3://eat-sheet-frontend-prod --delete
   ```

6. **Invalidate CloudFront cache:**
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id E1234EXAMPLE \
     --paths "/*"
   ```

7. **Post-deployment verification:**
   - [ ] Visit production URL and test critical paths
   - [ ] Check CloudWatch logs for errors
   - [ ] Monitor error rates for 15 minutes
   - [ ] Test authentication flow
   - [ ] Verify database migrations applied

### Rollback Procedure

**If deployment fails or critical bug discovered:**

1. **Revert git commit:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Redeploy previous version:**
   ```bash
   cd apps/infrastructure
   pulumi up  # Deploys reverted version
   ```

3. **Or use Pulumi stack history:**
   ```bash
   pulumi stack history
   pulumi stack select prod
   pulumi up --target-replace  # Redeploy specific resources
   ```

4. **Database rollback (if needed):**
   - Have database backup ready before major migrations
   - Test rollback procedure in staging first
   - Document manual rollback steps if migration can't auto-rollback

## Common Mistakes to Avoid

### Database
- ❌ Don't forget to run migrations after schema changes
- ❌ Don't use `prepare: true` with Drizzle in Lambda (causes errors)
- ❌ Don't create connection pools with `max > 1` in Lambda environment
- ❌ Don't run migrations in production without testing in staging first
- ✅ Always use transactions for multi-step database operations
- ✅ Always add indexes for foreign keys used in WHERE clauses
- ✅ Always validate data with Zod before inserting into database

### Lambda
- ❌ Don't bundle `aws-sdk` (included in Lambda runtime, increases bundle size)
- ❌ Don't exceed 6MB bundle size (causes slow cold starts)
- ❌ Don't forget to set appropriate timeout (default is only 3 seconds)
- ❌ Don't log sensitive data (passwords, tokens, PII)
- ✅ Use environment variables for all configuration
- ✅ Handle errors gracefully with proper status codes
- ✅ Keep bundle size minimal with tree-shaking

### Frontend
- ❌ Don't fetch data in `useEffect` (use React Query instead)
- ❌ Don't forget loading and error states in components
- ❌ Don't make API calls without proper auth token handling
- ❌ Don't store sensitive data in localStorage (use httpOnly cookies)
- ✅ Use TanStack Query for all server state management
- ✅ Implement proper error boundaries
- ✅ Use optimistic updates for better UX

### React Query
- ❌ Don't use stale data without revalidation strategy
- ❌ Don't forget to invalidate queries after mutations
- ✅ Set appropriate `staleTime` (5 min for menus, 15 min for restaurants)
- ✅ Set `cacheTime` to keep data in cache (default 5 minutes)
- ✅ Use optimistic updates for immediate UI feedback
- ✅ Implement proper retry logic with exponential backoff

### Pulumi Infrastructure
- ❌ Don't deploy directly to production without staging test
- ❌ Don't delete stateful resources without backup (databases, S3)
- ❌ Don't commit secrets to version control
- ✅ Use `pulumi preview` before every deployment
- ✅ Use Pulumi secrets for sensitive configuration
- ✅ Document infrastructure changes in commit messages

## Feature Development Process

### Standard Development Flow

**1. Planning**
- Review feature requirements in `docs/PROJECT_SPECIFICATION.md`
- Create GitHub issue describing the feature
- Break down into sub-tasks if complex (>2 days of work)
- Identify dependencies and potential risks

**2. Database Changes** (if needed)
- Update schema in `apps/backend/src/db/schema.ts`
- Add appropriate indexes for new queries
- Generate migration: `rushx db:generate` (from apps/backend)
- Review generated SQL in `drizzle/` folder
- Apply locally: `rushx db:migrate` (from apps/backend)
- Test with Drizzle Studio: `rushx db:studio` (from apps/backend)
- Document any breaking changes

**3. Backend Implementation**
- Create Zod validation schema in `apps/backend/src/schemas/`
- Implement route handler in `apps/backend/src/routes/`
- Add middleware as needed (auth, validation, rate limiting)
- Add business logic to separate service functions
- Write unit tests for business logic
- Write integration tests for API endpoints
- Update OpenAPI documentation (automatic via Hono)
- Test locally with Postman or similar

**4. Frontend Implementation**
- Create React Query hook in `apps/frontend/src/hooks/`
- Build reusable components in `apps/frontend/src/components/`
- Create Storybook stories for each component (`.stories.tsx` files)
- Document component props and variants in Storybook
- Test component accessibility with Storybook a11y addon
- Add page component if needed in `apps/frontend/src/pages/`
- Use Mantine components for UI consistency
- Implement proper loading states
- Implement error handling with error boundaries
- Add optimistic updates for better UX
- Test on mobile viewport

**5. Testing**
- Unit tests for backend business logic
- Integration tests for API endpoints
- Component tests for React components with React Testing Library
- Visual review of component states in Storybook
- Accessibility verification with Storybook a11y addon
- E2E test for critical user paths with Playwright
- Manual testing on dev environment
- Cross-browser testing (Chrome, Safari, Firefox)
- Mobile testing (iOS Safari, Android Chrome)

**6. Documentation**
- Update CLAUDE.md if architectural changes
- Add JSDoc comments for complex functions
- Update README if user-facing changes
- Add examples to API documentation
- Document any configuration changes

**7. Code Review & Deployment**
- Create PR with clear description and screenshots
- Request code review from team
- Address review comments
- Merge to `develop` branch
- Deploy to staging environment
- Test in staging with production-like data
- Get stakeholder approval
- Merge to `main` and deploy to production
- Monitor logs and metrics for issues

## Monitoring & Debugging

### CloudWatch Logs

**View Lambda logs in real-time:**
```bash
aws logs tail /aws/lambda/eat-sheet-api-lambda --follow
```

**Filter for errors:**
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/eat-sheet-api-lambda \
  --filter-pattern "ERROR"
```

**Search logs for specific user:**
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/eat-sheet-api-lambda \
  --filter-pattern "userId: user-123"
```

### Common Debugging Scenarios

**API not responding:**
- Check Lambda timeout settings (increase if needed)
- Verify database connection string is correct
- Check Lambda environment variables
- Review CloudWatch logs for errors
- Verify API Gateway integration with Lambda

**CORS errors:**
- Verify API Gateway CORS config matches frontend origin
- Check that preflight OPTIONS requests return 200
- Ensure `Access-Control-Allow-Credentials: true` if using cookies
- Check browser DevTools Network tab for exact error

**Authentication failing:**
- Verify Cognito User Pool ID matches environment variable
- Check JWT token hasn't expired (default 1 hour)
- Verify JWKS endpoint is accessible
- Test token signature verification manually
- Check CloudWatch logs for auth middleware errors

**Images not loading:**
- Verify S3 bucket policy allows CloudFront OAI access
- Check CloudFront distribution status (must be "Deployed")
- Ensure CORS configured on S3 bucket
- Test pre-signed URL generation
- Check browser DevTools for 403/404 errors

**Slow database queries:**
- Use Drizzle Studio to run `EXPLAIN ANALYZE`
- Check if indexes are being used
- Review connection pool settings
- Monitor database CPU/memory usage in Neon dashboard
- Consider adding query caching

### Useful AWS CLI Commands

```bash
# Get Lambda function configuration
aws lambda get-function-configuration --function-name eat-sheet-api-lambda

# List Lambda function versions
aws lambda list-versions-by-function --function-name eat-sheet-api-lambda

# Check API Gateway endpoints
aws apigatewayv2 get-apis

# Get CloudFront distribution details
aws cloudfront get-distribution --id E1234EXAMPLE

# List S3 bucket contents
aws s3 ls s3://eat-sheet-images-prod/ --recursive

# Get S3 bucket size
aws s3 ls s3://eat-sheet-images-prod/ --recursive --summarize

# View CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=eat-sheet-api-lambda \
  --start-time 2025-01-01T00:00:00Z \
  --end-time 2025-01-01T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

### Performance Monitoring

**Key metrics to monitor:**
- Lambda invocations per minute
- Lambda error rate (should be <1%)
- Lambda duration (P50, P95, P99)
- API Gateway 4xx/5xx error rates
- Database connection pool usage
- CloudFront cache hit ratio
- S3 request rates and errors

**Set up CloudWatch alarms for:**
- Lambda error rate > 5% (alert immediately)
- Lambda duration > 10s (investigate performance)
- API Gateway 5xx rate > 1% (alert immediately)
- Database connections > 80% of max (scale up)

### Local Debugging Tips

**Backend debugging:**
```bash
# Run with debugger
cd apps/backend
node --inspect-brk node_modules/.bin/tsx src/index.ts

# Then attach VS Code debugger or Chrome DevTools
```

**Database debugging:**
```bash
# Open Drizzle Studio for visual query testing
pnpm --filter @eat-sheet/backend db:studio

# Or connect with psql
psql $DATABASE_URL
```

**Frontend debugging:**
- Use React DevTools for component inspection
- Use TanStack Query DevTools for query inspection
- Use Storybook for isolated component testing and debugging
- Use Storybook interaction tests for debugging component behavior
- Use Redux DevTools for state management (if added later)
- Check Network tab for API request/response details

**Storybook best practices:**
- Develop components in isolation before integrating into pages
- Use Storybook controls to test different prop combinations
- Document edge cases and error states in stories
- Use the a11y addon to catch accessibility issues early
- Share Storybook URL with designers for visual review

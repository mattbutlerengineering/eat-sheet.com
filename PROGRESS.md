# Eat-Sheet Development Progress

Last Updated: October 12, 2024

## Project Overview
Building a modern digital menu platform (PWA) for restaurants with serverless backend.

## Current Phase: Phase 1 - MVP Core

### ✅ Completed Tasks

#### Infrastructure & Setup
- [x] Rush monorepo configuration
- [x] PNPM workspace setup
- [x] Project structure organized (apps/backend, apps/frontend, apps/infrastructure)
- [x] Pulumi infrastructure as code setup
- [x] AWS Cognito configuration for authentication

#### Backend Development
- [x] Hono web framework setup with OpenAPI support
- [x] Database schema designed with Drizzle ORM
  - Users table (synced with Cognito)
  - Restaurants table
  - Restaurant maintainers junction table
  - Menus table
  - Menu items table
- [x] Database migrations configured
- [x] PostgreSQL (Neon) connection setup
- [x] JWT authentication middleware
- [x] Restaurant CRUD endpoints (protected with JWT)
  - GET /api/restaurants
  - POST /api/restaurants (authenticated)
  - GET /api/restaurants/:slug
  - PUT /api/restaurants/:id (authenticated)
  - DELETE /api/restaurants/:id (authenticated)
- [x] Menu CRUD endpoints
  - GET /api/restaurants/:restaurantId/menus
  - POST /api/restaurants/:restaurantId/menus (authenticated)
  - GET /api/restaurants/:restaurantId/menus/:slug
  - PUT /api/menus/:id (authenticated)
  - DELETE /api/menus/:id (authenticated)
- [x] Menu Item CRUD endpoints
  - GET /api/menus/:menuId/items
  - POST /api/menus/:menuId/items (authenticated)
  - GET /api/items/:id
  - PUT /api/items/:id (authenticated)
  - DELETE /api/items/:id (authenticated)
- [x] OpenAPI documentation auto-generated at /api/openapi.json
- [x] CORS configuration
- [x] Health check endpoint

#### Frontend Development
- [x] Vite configuration with PWA plugin
- [x] React 18 with TypeScript setup
- [x] Mantine UI component library integration
- [x] TanStack Query (React Query) configuration
- [x] TypeScript types matching backend schema
- [x] API client with type safety
- [x] Routing setup with React Router
- [x] Pages created:
  - HomePage (/) - Landing page
  - RestaurantPage (/:restaurantSlug) - Restaurant details
  - MenuPage (/:restaurantSlug/:menuSlug) - Menu with items
- [x] Components created:
  - MenuItemCard - Displays menu items with all details
- [x] React Query hooks:
  - useRestaurant - Fetch restaurant by slug
  - useMenu - Fetch menu by restaurant + menu slug
  - useMenuItems - Fetch items for a menu
- [x] Loading and error states
- [x] Responsive grid layout
- [x] Items grouped by section
- [x] Price formatting utilities
- [x] PWA manifest configuration
- [x] Service worker setup for offline support
- [x] TypeScript compilation passing

#### Image Upload System
- [x] S3 bucket infrastructure (Pulumi)
  - Public access blocked
  - Versioning enabled
  - CORS configured
  - Lifecycle policies
- [x] Image upload endpoints
  - POST /api/images/upload-url (generate pre-signed URL)
  - POST /api/images/confirm (confirm upload complete)
- [x] AWS SDK S3 client configuration
- [x] Image validation (max 5MB, JPEG/PNG/WebP/GIF only)
- [x] Organized storage paths (restaurants/, menus/, items/)

#### QR Code Generation
- [x] QR code library installed (qrcode)
- [x] QR code generation endpoint
  - GET /api/menus/:id/qr-code
  - Supports PNG and SVG formats
  - Configurable size (100-1000px)
  - Auto-generates menu URL

### 🔄 In Progress
- None currently

### 📋 Remaining for Phase 1 MVP

#### Deployment
- [ ] Deploy backend to AWS Lambda
  - [ ] Build Lambda bundle
  - [ ] Deploy via Pulumi
  - [ ] Configure API Gateway integration
  - [ ] Set environment variables
  - [ ] Test deployed endpoints
- [ ] Deploy frontend to S3/CloudFront
  - [ ] Build production frontend
  - [ ] Create S3 bucket for static hosting
  - [ ] Configure CloudFront distribution
  - [ ] Set up SSL certificate
  - [ ] Deploy and test

#### Testing & Polish
- [ ] Create seed data for testing
  - [ ] Test restaurant
  - [ ] Test menu with items
  - [ ] Various menu item statuses
- [ ] End-to-end testing of QR code flow
- [ ] Mobile responsiveness testing
- [ ] Cross-browser testing

### 📊 Progress Metrics

**Overall Phase 1 Progress: ~90%**

- Backend API: 100% complete
- Frontend viewing: 100% complete
- Image handling: 100% complete
- QR codes: 100% complete
- Deployment: 0% complete

### 🎯 Next Immediate Tasks

1. **AWS Deployment** - Required to go live
   - Lambda function deployment
   - Frontend static hosting
   - DNS configuration

### 📝 Notes & Decisions

- Using Rush for monorepo management (better than pnpm workspaces alone)
- Using PNPM as package manager (fast, efficient)
- Storing prices in cents (integer) to avoid floating point issues
- Menu items have single imageUrl for MVP (multiple images later)
- Authentication via AWS Cognito with JWT tokens
- Public endpoints don't require auth (GET restaurants, menus, items)
- PWA configured for offline menu viewing
- Image uploads use pre-signed URLs to avoid Lambda payload limits

### 🐛 Known Issues
- None currently

### 🔮 Future Enhancements (Post-MVP)
- Reviews & ratings system
- AI modification suggestions (OpenAI integration)
- Saved orders feature
- Order sharing (public links)
- Analytics dashboard for maintainers
- PDF menu export
- Custom theme builder
- Restaurant landing page enhancements

---

## Development Commands Reference

### Backend
```bash
cd apps/backend
pnpm dev                 # Start dev server
pnpm build              # Build for production
pnpm db:generate        # Generate migrations
pnpm db:migrate         # Run migrations
pnpm db:studio          # Open Drizzle Studio
pnpm test               # Run tests
pnpm type-check         # TypeScript check
```

### Frontend
```bash
cd apps/frontend
pnpm dev                # Start dev server (port 5173)
pnpm build             # Build for production
pnpm preview           # Preview production build
pnpm type-check        # TypeScript check
pnpm storybook         # Start Storybook
```

### Infrastructure
```bash
cd apps/infrastructure
pulumi preview         # Preview changes
pulumi up              # Deploy infrastructure
pulumi stack output    # View outputs
```

### Monorepo (from root)
```bash
rush update            # Install all dependencies
rush build             # Build all projects
rush build --changed   # Build only changed projects
rush build --to @eat-sheet/backend  # Build specific project
rushx dev -p @eat-sheet/backend     # Run script in project
```

---

## Architecture Overview

```
Frontend (React PWA)
    ↓ HTTP requests
API Gateway
    ↓
Lambda (Hono API)
    ↓
PostgreSQL (Neon) + AWS S3 (images) + Cognito (auth)
```

## Tech Stack Summary

**Frontend:** React 18, TypeScript, Mantine UI, TanStack Query, React Router, Vite, PWA

**Backend:** Hono, TypeScript, Zod, OpenAPI, Drizzle ORM, PostgreSQL (Neon)

**Infrastructure:** AWS Lambda, API Gateway, S3, CloudFront, Cognito, Pulumi (IaC)

**Tooling:** Rush (monorepo), PNPM (package manager), Vitest (testing), Storybook (components)

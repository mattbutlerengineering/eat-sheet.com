# Eat-Sheet Project Specification

## 1. Project Overview

### 1.1 Vision
Eat-Sheet is a modern digital menu platform that provides exceptional user experiences for restaurant customers while giving restaurant owners powerful tools to manage and showcase their menus with beautiful, themeable designs.

### 1.2 Core Value Propositions

**For Consumers:**
- Beautiful, easy-to-navigate digital menus accessible via QR code or NFC
- Save favorite orders for repeat visits
- Share orders with friends or wait staff
- Leave reviews and ratings on menu items
- AI-assisted customization suggestions

**For Restaurant Maintainers:**
- Easy menu management with multiple menu support
- Customizable themes (pre-built or custom)
- QR code generation for table placement
- PDF export for traditional printing
- Basic analytics on menu performance
- Multi-restaurant management capability

### 1.3 Key Differentiators
- Exceptional UX for menu browsing
- Themeable menus with personality
- Seamless order sharing (digital-to-human handoff)
- No ordering/checkout complexity (focused on menu presentation)
- PWA for app-like experience without app store friction

---

## 2. User Roles & Permissions

### 2.1 Consumer (Unauthenticated)
**Capabilities:**
- Browse all public restaurant pages and menus
- View menu items with details
- Generate shareable order links
- Access via QR code/NFC or direct URL

**Restrictions:**
- Cannot leave reviews
- Cannot save orders

### 2.2 Consumer (Authenticated)
**Capabilities:**
- All unauthenticated capabilities, plus:
- Leave reviews and ratings on menu items
- Save favorite orders for later
- Share orders with other authenticated users
- Manage saved orders

### 2.3 Restaurant Maintainer
**Capabilities:**
- Create and manage restaurants
- Create, edit, and delete menus (active/inactive states)
- Create, edit, and delete menu items
- Upload images (restaurant, menu, items)
- Customize themes
- Generate QR codes
- Export menus to PDF
- View basic analytics
- Invite other maintainers to collaborate
- Manage multiple restaurants

### 2.4 Restaurant Owner
**Capabilities:**
- All maintainer capabilities, plus:
- Manage maintainer permissions (invite, remove)
- Transfer ownership
- Delete restaurant

**Note:** First maintainer to create a restaurant becomes the owner.

---

## 3. Core Features

### 3.1 Restaurant Management

#### Restaurant Entity
- Name
- Slug (URL-friendly, unique)
- Description (about the restaurant)
- Logo image
- Hero/cover images (multiple)
- Address
- Phone number
- Email
- Hours of operation
- Website
- Social media links
- Active/inactive status
- Created/updated timestamps

#### Restaurant Landing Page
- Hero section with logo and imagery
- "About us" content section (fun, personality-driven)
- Menu cards displayed as grid
- Contact information
- Hours and location

### 3.2 Menu Management

#### Menu Entity
- Title
- Slug (URL-friendly, unique per restaurant)
- Description
- Hero image
- Theme configuration (JSON)
- Status (active, inactive, draft)
- Availability schedule (optional: "Weekends only", "5-10 PM")
- Display order
- Item count (computed)
- Created/updated timestamps

#### Menu Card Display (on Restaurant Page)
- Menu name
- Short description
- Hero image
- Availability badge (if applicable)
- Item count
- Clickable to full menu view

#### Menu URL Structure
- Restaurant landing: `eat-sheet.com/{restaurant-slug}`
- Specific menu: `eat-sheet.com/{restaurant-slug}/{menu-slug}`

### 3.3 Menu Items

#### Menu Item Entity
- Name
- Description
- Price (stored as decimal, currency as string)
- Images (multiple)
- Section/category (optional: "Appetizers", "Entrees", etc.)
- Display order within section
- Available/sold out status
- Tags (dietary: vegetarian, vegan, gluten-free, etc.)
- Allergen information (flexible JSON field)
- Created/updated timestamps

#### AI-Powered Modifications
- System suggests common modifications based on item type
- Uses OpenAI API for intelligent suggestions
- Examples: "no tomato", "extra cheese", "spice level"
- Free-form text input as fallback

#### Reviews & Ratings
- Star rating (1-5)
- Text review (optional)
- Reviewer (authenticated consumer)
- Helpful votes (optional for future)
- Created timestamp
- Moderation capability for maintainers

### 3.4 Theming System

#### Pre-built Themes
- Multiple professionally designed themes
- Cover common restaurant styles (elegant, casual, modern, vintage)
- Easy one-click application

#### Custom Themes
- Color scheme customization
- Font selections
- Layout options
- Logo/branding integration
- Preview before publishing

#### Theme Storage
- JSON configuration stored per menu
- CSS variables for runtime theming
- Mantine theme provider integration

### 3.5 QR Code & NFC

#### QR Code Generation
- Auto-generate for each menu
- High-resolution download (PNG/SVG)
- Customizable with restaurant branding
- Print-ready templates (table tents, stickers, posters)
- Bulk download option

#### NFC Support
- Same URLs work for NFC tags
- Instant menu access on tap

### 3.6 PDF Menu Export

#### Features
- Professional print layout
- Includes restaurant branding
- Section-organized items
- Prices and descriptions
- Downloadable for printing/sharing
- Generated server-side via Lambda

### 3.7 Order Saving & Sharing

#### Save Orders (Authenticated Consumers)
- Select items + modifications
- Auto-named by date/time
- Stored per restaurant
- Quick reorder on next visit
- Handle menu changes: disable items with note if removed

#### Share Orders
**Public Shareable Links:**
- No authentication required to view
- URL encodes selected items + modifications
- Anyone with link can view
- Use for showing waiter or texting friends

**User-to-User Sharing:**
- Share saved orders with other authenticated users
- View others' shared orders

#### Use Cases
- "My usual order"
- Show waiter selections
- Share with dining companions
- Save for future visits

### 3.8 Analytics (Basic)

#### Database Event Tracking
- Menu views per restaurant
- Menu item views
- Popular items ranking
- Review counts
- Peak usage times

#### CloudWatch Metrics
- API performance
- Error rates
- Lambda execution stats

#### Maintainer Dashboard
- Views over time
- Most popular items
- Recent reviews
- Simple, actionable insights
- No expensive third-party analytics

---

## 4. Technical Architecture

### 4.1 Tech Stack Summary

**Frontend:**
- React 18+
- Mantine UI component library
- PWA capabilities (service worker, offline support)
- TypeScript
- Vite for build tooling

**Backend:**
- Hono (web framework)
- @hono/zod-openapi (schema validation + OpenAPI generation)
- Node.js runtime on AWS Lambda
- TypeScript

**Database:**
- PostgreSQL (Neon free tier initially)
- Drizzle ORM
- Database migrations via Drizzle Kit

**Authentication:**
- AWS Cognito
- JWT tokens
- User pools for consumers and maintainers

**File Storage:**
- AWS S3 for images
- Pre-signed URLs for uploads
- CloudFront CDN for delivery

**AI:**
- OpenAI API for modification suggestions

**Infrastructure:**
- AWS Lambda (API hosting)
- AWS API Gateway (REST API)
- AWS S3 (static hosting for React app)
- AWS CloudFront (CDN for frontend)
- AWS Certificate Manager (SSL)
- Pulumi (Infrastructure as Code - TypeScript)

**DNS:**
- Squarespace (domain management)
- CNAME to CloudFront distribution

### 4.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Squarespace DNS                      │
│                    (eat-sheet.com → CNAME)                   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     AWS CloudFront (CDN)                     │
│                        + SSL Certificate                     │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               │ Static Assets                │ API Requests
               ▼                              ▼
┌──────────────────────────┐    ┌────────────────────────────┐
│      S3 Bucket           │    │     API Gateway            │
│   (React PWA Build)      │    │    (REST Endpoints)        │
└──────────────────────────┘    └────────────┬───────────────┘
                                              │
                                              ▼
                                 ┌────────────────────────────┐
                                 │    AWS Lambda Functions    │
                                 │     (Hono + Handlers)      │
                                 └────────┬──────────┬────────┘
                                          │          │
                    ┌─────────────────────┼──────────┼─────────────────┐
                    │                     │          │                 │
                    ▼                     ▼          ▼                 ▼
          ┌──────────────────┐  ┌─────────────┐  ┌────────┐  ┌──────────────┐
          │   AWS Cognito    │  │ PostgreSQL  │  │   S3   │  │  OpenAI API  │
          │  (User Pools)    │  │   (Neon)    │  │(Images)│  │ (Modifiers)  │
          └──────────────────┘  └─────────────┘  └────────┘  └──────────────┘
```

### 4.3 Database Schema

#### Users Table
```sql
users
- id (uuid, primary key)
- cognito_sub (string, unique, indexed)
- email (string, unique)
- name (string)
- created_at (timestamp)
- updated_at (timestamp)
```

#### Restaurants Table
```sql
restaurants
- id (uuid, primary key)
- slug (string, unique, indexed)
- name (string)
- description (text)
- logo_url (string, nullable)
- hero_images (json, array of URLs)
- address (text)
- phone (string, nullable)
- email (string, nullable)
- website (string, nullable)
- hours (json, structured schedule)
- social_links (json)
- status (enum: active, inactive)
- created_at (timestamp)
- updated_at (timestamp)
```

#### Restaurant_Maintainers Table (Junction)
```sql
restaurant_maintainers
- id (uuid, primary key)
- restaurant_id (uuid, foreign key → restaurants)
- user_id (uuid, foreign key → users)
- role (enum: owner, maintainer)
- created_at (timestamp)
- updated_at (timestamp)

Indexes:
- (restaurant_id, user_id) unique
- restaurant_id
- user_id
```

#### Menus Table
```sql
menus
- id (uuid, primary key)
- restaurant_id (uuid, foreign key → restaurants)
- slug (string, unique per restaurant)
- title (string)
- description (text, nullable)
- hero_image_url (string, nullable)
- theme_config (json)
- status (enum: active, inactive, draft)
- availability (json, nullable - schedule/conditions)
- display_order (integer, default 0)
- created_at (timestamp)
- updated_at (timestamp)

Indexes:
- (restaurant_id, slug) unique
- restaurant_id
- status
```

#### Menu_Items Table
```sql
menu_items
- id (uuid, primary key)
- menu_id (uuid, foreign key → menus)
- name (string)
- description (text, nullable)
- price (decimal)
- currency (string, default 'USD')
- images (json, array of URLs)
- section (string, nullable)
- display_order (integer, default 0)
- status (enum: available, sold_out, hidden)
- tags (json, array of strings)
- allergens (json)
- created_at (timestamp)
- updated_at (timestamp)

Indexes:
- menu_id
- (menu_id, section)
- status
```

#### Reviews Table
```sql
reviews
- id (uuid, primary key)
- menu_item_id (uuid, foreign key → menu_items)
- user_id (uuid, foreign key → users)
- rating (integer, 1-5)
- review_text (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)

Indexes:
- menu_item_id
- user_id
- (menu_item_id, user_id) unique (one review per user per item)
```

#### Saved_Orders Table
```sql
saved_orders
- id (uuid, primary key)
- user_id (uuid, foreign key → users)
- restaurant_id (uuid, foreign key → restaurants)
- items (json, array of {item_id, modifications})
- created_at (timestamp)

Indexes:
- user_id
- restaurant_id
- (user_id, restaurant_id)
```

#### Analytics_Events Table
```sql
analytics_events
- id (uuid, primary key)
- event_type (enum: menu_view, item_view, review_created)
- restaurant_id (uuid, nullable)
- menu_id (uuid, nullable)
- menu_item_id (uuid, nullable)
- metadata (json, nullable)
- created_at (timestamp)

Indexes:
- event_type
- restaurant_id
- menu_id
- created_at
```

### 4.4 API Endpoints (OpenAPI Structure)

#### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
```

#### Restaurants
```
GET    /api/restaurants
POST   /api/restaurants
GET    /api/restaurants/:slug
PUT    /api/restaurants/:id
DELETE /api/restaurants/:id

GET    /api/restaurants/:id/maintainers
POST   /api/restaurants/:id/maintainers
DELETE /api/restaurants/:id/maintainers/:userId
PUT    /api/restaurants/:id/maintainers/:userId/role
```

#### Menus
```
GET    /api/restaurants/:restaurantId/menus
POST   /api/restaurants/:restaurantId/menus
GET    /api/restaurants/:restaurantId/menus/:slug
PUT    /api/menus/:id
DELETE /api/menus/:id
GET    /api/menus/:id/qr-code
GET    /api/menus/:id/pdf
```

#### Menu Items
```
GET    /api/menus/:menuId/items
POST   /api/menus/:menuId/items
GET    /api/items/:id
PUT    /api/items/:id
DELETE /api/items/:id
POST   /api/items/:id/suggest-modifications (AI)
```

#### Reviews
```
GET    /api/items/:itemId/reviews
POST   /api/items/:itemId/reviews
PUT    /api/reviews/:id
DELETE /api/reviews/:id
```

#### Saved Orders
```
GET    /api/saved-orders
POST   /api/saved-orders
GET    /api/saved-orders/:id
DELETE /api/saved-orders/:id
POST   /api/saved-orders/:id/share
```

#### Order Sharing (Public)
```
GET    /api/shared-orders/:token (decode shareable link)
```

#### Images
```
POST   /api/images/upload-url (generates pre-signed S3 URL)
POST   /api/images/confirm (confirms upload complete)
```

#### Analytics
```
POST   /api/analytics/track
GET    /api/restaurants/:id/analytics
```

### 4.5 Frontend Architecture

#### Pages/Routes
```
/                           → Home/Browse restaurants
/{restaurant-slug}          → Restaurant landing page
/{restaurant-slug}/{menu}   → Menu view
/login                      → Consumer/Maintainer login
/register                   → Registration
/dashboard                  → Maintainer dashboard
/dashboard/restaurants      → Manage restaurants
/dashboard/restaurants/:id  → Edit restaurant
/dashboard/menus/:id        → Edit menu
/dashboard/items/:id        → Edit menu item
/my-orders                  → Saved orders (consumer)
/profile                    → User profile
/shared/:token              → View shared order
```

#### Key Components
```
Layout/
  - Header
  - Footer
  - Navigation
  - MobileNav

Restaurant/
  - RestaurantHero
  - RestaurantAbout
  - MenuCardGrid
  - MenuCard

Menu/
  - MenuHero
  - MenuItemGrid
  - MenuItemCard
  - MenuItemDetail
  - SectionHeader

MenuItem/
  - ItemImage
  - ItemDescription
  - PriceDisplay
  - ModificationSelector
  - AIModificationSuggestions
  - ReviewsList
  - ReviewForm

Dashboard/
  - RestaurantList
  - MenuEditor
  - ItemEditor
  - ThemeCustomizer
  - QRCodeGenerator
  - PDFExporter
  - AnalyticsDashboard

Order/
  - SavedOrdersList
  - OrderSummary
  - ShareOrderModal
```

#### State Management
- React Context for global auth state
- TanStack Query (React Query) for server state
- Local state for UI interactions
- PWA service worker for offline support

#### PWA Features
- Service worker for offline caching
- App manifest for installability
- Cache menu data for offline viewing
- Background sync for reviews (when reconnected)

---

## 5. Authentication & Authorization

### 5.1 AWS Cognito Setup

**User Pools:**
- Single user pool for all users (consumers + maintainers)
- Email + password authentication
- Email verification required
- Password policy: min 8 chars, uppercase, lowercase, number

**JWT Tokens:**
- Access token (1 hour expiry)
- Refresh token (30 days)
- ID token (user claims)

### 5.2 Authorization Patterns

**Public Endpoints:**
- GET restaurants, menus, items, reviews
- No authentication required

**Consumer-Only Endpoints:**
- POST reviews
- Saved orders (CRUD)
- Must be authenticated consumer

**Maintainer-Only Endpoints:**
- Restaurant/menu/item management
- Must be authenticated AND be a maintainer of the restaurant
- Check via restaurant_maintainers junction table

**Owner-Only Actions:**
- Manage other maintainers
- Delete restaurant
- Transfer ownership
- Must have role = 'owner'

### 5.3 Middleware Pattern (Hono)
```typescript
// Example auth middleware
const requireAuth = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  // Verify JWT with Cognito
  // Attach user to context
  await next()
}

const requireMaintainer = async (c, next) => {
  // Check if user is maintainer of restaurant
  await next()
}
```

---

## 6. File Upload Strategy

### 6.1 Pre-signed URL Flow

**Upload Process:**
1. Frontend requests upload permission from API
2. API validates auth + file metadata (type, size)
3. API generates S3 pre-signed URL (15 min expiry)
4. API returns pre-signed URL to frontend
5. Frontend uploads directly to S3 using pre-signed URL
6. Frontend notifies API of successful upload (S3 key)
7. API stores S3 URL in database

**Benefits:**
- No Lambda payload limits
- Faster uploads (direct to S3)
- Lower costs (no Lambda data transfer)
- Scalable

**Validation:**
- File type: images only (jpg, png, webp)
- Max size: 5MB per image
- Enforced in pre-signed URL policy

### 6.2 Image Storage Structure
```
s3://eat-sheet-images/
  restaurants/{restaurant-id}/
    logo.jpg
    hero-{timestamp}.jpg
  menus/{menu-id}/
    hero-{timestamp}.jpg
  items/{item-id}/
    {timestamp}-{index}.jpg
```

### 6.3 CDN Delivery
- CloudFront distribution in front of S3
- Caching headers for optimal performance
- Image optimization (future: automatic resizing)

---

## 7. AI Integration

### 7.1 Modification Suggestions

**Trigger:**
- Consumer viewing menu item details
- Clicks "Customize" or modification field

**Process:**
1. Frontend sends item name + description to API
2. API calls OpenAI with prompt:
   ```
   Given this menu item:
   Name: {name}
   Description: {description}
   
   Suggest 5-10 common modifications customers might request.
   Format as simple array of strings.
   ```
3. Parse AI response
4. Return suggestions to frontend
5. Display as quick-select chips + free-form input

**Cost Optimization:**
- Cache suggestions per item (store in DB)
- Only call API if no cached suggestions exist
- Use GPT-3.5-turbo (cheaper, sufficient for this task)

**Fallback:**
- If AI fails, show generic suggestions based on item tags
- Always allow free-form text input

---

## 8. Analytics Implementation

### 8.1 Event Tracking

**Frontend Events:**
```javascript
// Track menu view
analytics.track('menu_view', {
  restaurant_id,
  menu_id,
  timestamp
})

// Track item view
analytics.track('item_view', {
  menu_item_id,
  timestamp
})
```

**Backend Storage:**
- Batch insert events to analytics_events table
- Async processing (non-blocking)

**CloudWatch:**
- Lambda logs automatically captured
- Set up metric filters for errors
- Dashboard for API health

### 8.2 Maintainer Analytics Dashboard

**Metrics Displayed:**
- Total menu views (last 7/30 days)
- Most viewed items
- Average rating per item
- Recent reviews
- Peak traffic times

**Implementation:**
- Simple SQL aggregations
- Cached for performance (refresh every hour)
- Basic charts using Recharts (React library)

---

## 9. Development Phases

### Phase 1: MVP Core (Weeks 1-4)
**Goal:** Basic functional platform

- [ ] Infrastructure setup (Pulumi)
- [ ] Database schema + migrations
- [ ] Authentication (Cognito)
- [ ] API endpoints (restaurants, menus, items)
- [ ] Basic frontend (view menus)
- [ ] Image uploads (S3 pre-signed URLs)
- [ ] QR code generation
- [ ] Deploy to AWS

**Deliverable:** Maintainers can create restaurants/menus/items. Consumers can view menus via QR codes.

### Phase 2: Enhanced UX (Weeks 5-6)
**Goal:** Polished experience

- [ ] Restaurant landing pages
- [ ] Menu theming (pre-built themes)
- [ ] Reviews & ratings
- [ ] AI modification suggestions
- [ ] PDF export
- [ ] PWA capabilities

**Deliverable:** Beautiful, themeable menus with reviews and customization.

### Phase 3: Social Features (Weeks 7-8)
**Goal:** Engagement

- [ ] Save orders
- [ ] Share orders (public links)
- [ ] User-to-user sharing
- [ ] Basic analytics dashboard

**Deliverable:** Consumers can save/share orders. Maintainers see basic insights.

### Phase 4: Polish & Optimization (Week 9-10)
**Goal:** Production-ready

- [ ] Custom theme builder
- [ ] Performance optimization
- [ ] Mobile responsiveness polish
- [ ] Error handling & edge cases
- [ ] Onboarding flows
- [ ] Documentation

**Deliverable:** Launch-ready platform.

### Future Enhancements (Post-MVP)
- Ordering & checkout system
- Payment integration
- Table management & tracking
- Advanced analytics
- Multi-language support
- Native mobile apps
- Menu versioning/history
- Inventory management
- Allergen filtering
- Social sharing embeds

---

## 10. Non-Functional Requirements

### 10.1 Performance
- Page load time: < 2 seconds
- API response time: < 500ms (p95)
- Lambda cold start: < 1 second
- Image loading: Progressive, lazy-loaded
- PWA score: 90+ (Lighthouse)

### 10.2 Security
- HTTPS only (enforced)
- JWT token validation on all protected endpoints
- Input validation (Zod schemas)
- SQL injection protection (ORM parameterized queries)
- XSS protection (React escapes by default)
- CORS properly configured
- Rate limiting on API (future)
- Image upload validation (type, size)

### 10.3 Scalability
- Serverless architecture (auto-scaling)
- Database connection pooling
- CDN for static assets
- S3 for unlimited image storage
- Stateless API design

### 10.4 Cost Targets
**Monthly costs (low traffic < 1000 users):**
- Lambda: ~$5 (generous free tier)
- API Gateway: ~$3
- S3: ~$2
- CloudFront: ~$1
- Neon PostgreSQL: $0 (free tier)
- Cognito: $0 (free tier)
- **Total: ~$10-15/month**

**Scaling costs:**
- Mostly pay-per-use
- Database will be first scaling cost (upgrade from Neon free tier)
- OpenAI API costs minimal (cached suggestions)

### 10.5 Browser Support
- Modern browsers (last 2 versions)
- Chrome, Firefox, Safari, Edge
- Mobile Safari (iOS)
- Mobile Chrome (Android)
- Progressive enhancement for older browsers

### 10.6 Accessibility
- WCAG 2.1 Level AA compliance
- Semantic HTML
- ARIA labels where needed
- Keyboard navigation
- Screen reader friendly
- Color contrast ratios

---

## 11. Deployment Strategy

### 11.1 Environments
- **Development:** Local development
- **Staging:** AWS staging environment
- **Production:** AWS production environment

### 11.2 CI/CD Pipeline
**Using GitHub Actions:**
1. Push to `main` branch
2. Run tests (unit + integration)
3. Build frontend (Vite)
4. Deploy infrastructure (Pulumi)
5. Deploy API (Lambda)
6. Deploy frontend (S3 + CloudFront invalidation)
7. Run smoke tests

### 11.3 Pulumi Stacks
- `dev` stack (your personal testing)
- `staging` stack (pre-production)
- `prod` stack (production)

### 11.4 Database Migrations
- Drizzle migrations run automatically on deploy
- Backup database before production migrations
- Rollback plan for failed migrations

---

## 12. Monitoring & Logging

### 12.1 Logging
- CloudWatch Logs for Lambda
- Structured JSON logging
- Log levels: ERROR, WARN, INFO, DEBUG
- Request/response logging (excluding sensitive data)

### 12.2 Monitoring
- CloudWatch dashboards
- Lambda metrics (invocations, errors, duration)
- API Gateway metrics (requests, latency, errors)
- Database metrics (connections, query performance)
- Custom metrics (menu views, user signups)

### 12.3 Alerting
- CloudWatch alarms for:
  - Lambda errors > threshold
  - API error rate > 5%
  - Database connection failures
  - High Lambda duration (potential timeout)

---

## 13. Documentation Requirements

### 13.1 Code Documentation
- JSDoc comments for complex functions
- README in each major directory
- OpenAPI spec (auto-generated)

### 13.2 User Documentation
- Maintainer guide (how to create menus, themes, QR codes)
- Consumer guide (how to save orders, leave reviews)
- FAQ section

### 13.3 Developer Documentation
- Architecture overview
- Local development setup
- Deployment guide
- API reference (OpenAPI)
- Database schema diagram

---

## 14. Success Metrics

### 14.1 Launch Criteria (MVP)
- [ ] 5 beta restaurants onboarded
- [ ] 50+ menu items created
- [ ] QR codes working in real restaurant setting
- [ ] < 1% error rate
- [ ] Mobile responsive on iOS + Android
- [ ] PWA installable

### 14.2 Success Metrics (3 months post-launch)
- 25+ active restaurants
- 100+ consumers using platform
- 4.0+ average user rating
- < 2 second page load
- 90+ Lighthouse score

---

## 15. Risk Assessment

### 15.1 Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Lambda cold starts | Medium | Keep functions warm, optimize bundle size |
| Database costs exceed budget | Medium | Start with Neon free tier, monitor usage |
| OpenAI API costs | Low | Cache suggestions, use GPT-3.5 |
| Image storage costs | Low | Implement size limits, compression |
| Cognito complexity | Medium | Use Pulumi for IaC, test thoroughly |

### 15.2 Product Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Low restaurant adoption | High | Beta with friendly restaurants, iterate on feedback |
| Poor mobile UX | High | Mobile-first design, extensive testing |
| QR code friction | Medium | Clear instructions, NFC as alternative |
| Review spam | Low | Require auth, moderation tools for maintainers |

---

## 16. Open Questions / Future Considerations

1. **Monetization:** Free tier + premium features? Subscription for restaurants?
2. **Multi-location chains:** How to handle restaurant groups?
3. **Nutritional info:** Calories, macros display?
4. **Menu scheduling:** Auto-activate breakfast menu at 6 AM?
5. **Waitlist/reservations:** Integrate with restaurant seating?
6. **Loyalty programs:** Track repeat customers?
7. **Print optimizations:** Multiple PDF templates?
8. **Internationalization:** Multiple languages per menu?

---

## Appendix A: Technology Rationale

### Why React?
- Large ecosystem, component reusability
- Strong typing with TypeScript
- Excellent PWA support
- Team familiarity

### Why Hono?
- Modern, fast, edge-compatible
- Great TypeScript support
- Small bundle size (critical for Lambda)
- Express-like DX (easy learning curve)

### Why Drizzle?
- TypeScript-first ORM
- Lightweight (vs Prisma)
- Great serverless support
- Excellent type inference

### Why Pulumi?
- TypeScript IaC (no new language to learn)
- Type safety for infrastructure
- Good AWS support
- Easier than Terraform for TS developers

### Why PostgreSQL?
- Relational data model fits use case
- JSON support for flexible fields
- Mature, reliable
- Great tooling ecosystem

### Why Neon?
- Serverless PostgreSQL (cost-effective)
- Generous free tier
- Easy setup (no AWS complexity initially)
- Can migrate to RDS later

---

## Appendix B: Example User Flows

### Flow 1: Consumer Orders at Restaurant
1. Sits at table, scans QR code
2. Menu loads instantly (PWA cached)
3. Browses items, taps burger
4. Sees AI suggestions: "No pickles", "Extra cheese"
5. Selects modifications + adds to order
6. Adds fries and drink
7. Reviews order summary
8. Generates shareable link
9. Shows phone to waiter: "I'd like these items"
10. Optionally: Creates account, saves as "My usual"

### Flow 2: Maintainer Creates New Menu
1. Logs into dashboard
2. Selects restaurant "Joe's Diner"
3. Clicks "Create Menu"
4. Names it "Weekend Brunch"
5. Uploads hero image
6. Selects pre-built theme "Elegant Minimal"
7. Adds section "Benedicts"
8. Creates item "Classic Eggs Benedict"
9. Uploads food photo (drag & drop to S3)
10. Sets price $14.99
11. Adds description with allergens
12. Marks status "Active"
13. Clicks "Generate QR Code"
14. Downloads high-res PNG for table tents
15. Prints QR codes at local print shop
16. Places on tables that weekend

### Flow 3: Consumer Saves & Shares Order
1. Browsing menu on phone
2. Selects 3 items with modifications
3. Clicks "Save Order" (prompted to sign up)
4. Creates account quickly
5. Order auto-saved as "Order from Oct 3, 2025"
6. Visits restaurant next week
7. Opens saved orders
8. Loads "My usual"
9. Reviews items (one marked "No longer available")
10. Adjusts and shares with dining partner

---

## Appendix C: Database Indexes Strategy

### Critical Indexes (for performance)

**restaurants table:**
- `slug` (unique, for lookups)
- `status` (for filtering active)

**restaurant_maintainers table:**
- `(restaurant_id, user_id)` (unique composite, prevents duplicates)
- `restaurant_id` (for finding maintainers)
- `user_id` (for finding user's restaurants)

**menus table:**
- `(restaurant_id, slug)` (unique composite)
- `restaurant_id` (for listing restaurant's menus)
- `status` (for active menu queries)

**menu_items table:**
- `menu_id` (for listing menu's items)
- `(menu_id, section)` (for section-grouped queries)
- `status` (for available items)

**reviews table:**
- `menu_item_id` (for item's reviews)
- `user_id` (for user's reviews)
- `(menu_item_id, user_id)` (unique, one review per user per item)

**saved_orders table:**
- `user_id` (for user's saved orders)
- `restaurant_id` (for restaurant context)
- `(user_id, restaurant_id)` (for filtering)

**analytics_events table:**
- `event_type` (for aggregations)
- `restaurant_id` (for restaurant analytics)
- `menu_id` (for menu analytics)
- `created_at` (for time-based queries)

---

## Appendix D: Environment Variables

### Frontend (.env)
```
VITE_API_URL=https://api.eat-sheet.com
VITE_COGNITO_USER_POOL_ID=
VITE_COGNITO_CLIENT_ID=
VITE_COGNITO_REGION=us-east-1
```

### Backend (.env)
```
DATABASE_URL=postgresql://...
COGNITO_USER_POOL_ID=
COGNITO_REGION=us-east-1
AWS_REGION=us-east-1
S3_BUCKET_NAME=eat-sheet-images
S3_BUCKET_REGION=us-east-1
OPENAI_API_KEY=
CORS_ALLOWED_ORIGINS=https://eat-sheet.com
NODE_ENV=production
```

### Pulumi Config
```
aws:region=us-east-1
eat-sheet:domain=eat-sheet.com
eat-sheet:environment=production
```

---

## Appendix E: OpenAPI Schema Example

```yaml
openapi: 3.0.0
info:
  title: Eat-Sheet API
  version: 1.0.0
  description: Digital menu platform API

paths:
  /api/restaurants:
    get:
      summary: List all restaurants
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        200:
          description: List of restaurants
          content:
            application/json:
              schema:
                type: object
                properties:
                  restaurants:
                    type: array
                    items:
                      $ref: '#/components/schemas/Restaurant'
                  total:
                    type: integer
    
    post:
      summary: Create a restaurant
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateRestaurantRequest'
      responses:
        201:
          description: Restaurant created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Restaurant'

components:
  schemas:
    Restaurant:
      type: object
      properties:
        id:
          type: string
          format: uuid
        slug:
          type: string
        name:
          type: string
        description:
          type: string
        logoUrl:
          type: string
          nullable: true
        address:
          type: string
        phone:
          type: string
          nullable: true
        status:
          type: string
          enum: [active, inactive]
        createdAt:
          type: string
          format: date-time
    
    CreateRestaurantRequest:
      type: object
      required:
        - name
        - slug
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        slug:
          type: string
          pattern: '^[a-z0-9-]+
        description:
          type: string
        address:
          type: string

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

---

## Appendix F: Sample Theme Configuration (JSON)

```json
{
  "id": "elegant-minimal",
  "name": "Elegant Minimal",
  "colors": {
    "primary": "#2C3E50",
    "secondary": "#E8B923",
    "background": "#FFFFFF",
    "text": "#333333",
    "textLight": "#666666",
    "border": "#E0E0E0",
    "accent": "#D4AF37"
  },
  "typography": {
    "headingFont": "Playfair Display",
    "bodyFont": "Inter",
    "headingWeight": 700,
    "bodyWeight": 400,
    "headingSize": {
      "h1": "2.5rem",
      "h2": "2rem",
      "h3": "1.5rem"
    }
  },
  "layout": {
    "itemsPerRow": 2,
    "cardStyle": "elevated",
    "spacing": "comfortable",
    "borderRadius": "8px"
  },
  "images": {
    "showHero": true,
    "itemImageAspectRatio": "4:3",
    "imagePosition": "top"
  },
  "effects": {
    "cardShadow": "0 2px 8px rgba(0,0,0,0.1)",
    "hoverEffect": "lift",
    "transitionSpeed": "0.3s"
  }
}
```

---

## Appendix G: Cost Breakdown (Detailed)

### AWS Services (Monthly)

**Lambda:**
- Free tier: 1M requests/month, 400,000 GB-seconds
- Beyond free tier: $0.20 per 1M requests
- Expected cost (low traffic): $0-5/month

**API Gateway:**
- Free tier: None (REST API)
- $3.50 per million requests
- Expected cost (10k requests/month): $0.035/month
- Expected cost (realistic): $3-5/month

**S3 Storage:**
- $0.023 per GB/month
- Expected: 10GB images = $0.23/month
- Requests: negligible (pre-signed URLs)

**S3 Data Transfer:**
- First 100GB out to internet free
- Expected: $0-2/month

**CloudFront:**
- Free tier: 1TB data transfer, 10M requests
- Expected cost: $0-1/month (within free tier initially)

**Certificate Manager:**
- Free for public certificates

**Cognito:**
- Free tier: 50,000 MAUs
- Expected cost: $0 (within free tier)

**Total AWS: ~$5-15/month**

### External Services

**Neon PostgreSQL:**
- Free tier: 0.5 GB storage, shared compute
- Expected cost: $0 (free tier sufficient for MVP)
- Paid tier starts at $19/month if needed

**OpenAI API:**
- GPT-3.5-turbo: $0.50 per 1M input tokens
- Expected: 1000 modification requests/month
- ~50 tokens per request = 50k tokens
- Cost: $0.025/month
- With caching: <$1/month

**Domain (Squarespace):**
- Already owned
- $0 additional cost

**Total External: $0-1/month**

### **Grand Total: $5-16/month for low traffic**

### Scaling Costs (1000+ active users)
- Database: $19-50/month (upgrade from Neon free tier)
- AWS: $20-50/month (beyond free tiers)
- OpenAI: $5-10/month (more modification requests)
- **Total at scale: $50-100/month**

---

## Appendix H: PWA Manifest Example

```json
{
  "name": "Eat-Sheet - Digital Menus",
  "short_name": "Eat-Sheet",
  "description": "Beautiful digital menus for restaurants",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2C3E50",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["food", "lifestyle", "business"],
  "screenshots": [
    {
      "src": "/screenshots/menu-view.png",
      "sizes": "540x720",
      "type": "image/png"
    }
  ]
}
```

---

## Appendix I: Git Branch Strategy

### Branch Naming
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/{feature-name}` - New features
- `fix/{bug-name}` - Bug fixes
- `hotfix/{critical-fix}` - Production hotfixes

### Workflow
1. Create feature branch from `develop`
2. Develop and test locally
3. Create PR to `develop`
4. Review and merge to `develop`
5. Deploy to staging
6. Merge `develop` to `main` for production release

### Commit Message Format
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

---

## Appendix J: Testing Strategy

### Unit Tests
- **Backend:** Hono route handlers, business logic
- **Frontend:** React components, utility functions
- **Tools:** Vitest, React Testing Library
- **Coverage target:** 70%+

### Integration Tests
- **API endpoints:** Request/response validation
- **Database:** CRUD operations
- **Auth flows:** Cognito integration
- **Tools:** Supertest, Vitest

### E2E Tests
- **Critical user flows:**
  - Consumer views menu
  - Maintainer creates restaurant/menu
  - Review submission
  - Order saving/sharing
- **Tools:** Playwright
- **Run frequency:** Before production deploys

### Performance Tests
- **Load testing:** API endpoints under load
- **Tools:** Artillery, k6
- **Targets:** 
  - 100 req/s sustained
  - <500ms p95 response time

### Manual Testing Checklist
- [ ] QR code scanning (iOS/Android)
- [ ] PWA installation
- [ ] Offline functionality
- [ ] Image uploads
- [ ] PDF generation
- [ ] Mobile responsiveness
- [ ] Cross-browser compatibility

---

## Appendix K: Security Checklist

### Pre-Launch Security Review
- [ ] All API endpoints require authentication where appropriate
- [ ] Input validation on all user inputs (Zod schemas)
- [ ] SQL injection protection (Drizzle ORM)
- [ ] XSS protection (React auto-escaping)
- [ ] CSRF protection (JWT tokens, SameSite cookies)
- [ ] Rate limiting on sensitive endpoints
- [ ] Secure headers (HSTS, CSP, X-Frame-Options)
- [ ] Environment variables not committed to git
- [ ] Secrets stored in AWS Secrets Manager
- [ ] S3 buckets not publicly accessible (pre-signed URLs only)
- [ ] CloudFront distributions use HTTPS only
- [ ] Cognito password policy enforced
- [ ] JWT tokens properly validated
- [ ] File upload size limits enforced
- [ ] Image upload type validation
- [ ] CORS properly configured (restrict origins)
- [ ] Database credentials rotated
- [ ] Regular dependency updates (npm audit)
- [ ] CloudWatch alarms for suspicious activity

---

## Appendix L: Accessibility Guidelines

### WCAG 2.1 Level AA Compliance

**Perceivable:**
- [ ] Text alternatives for images (alt text)
- [ ] Color contrast ratio minimum 4.5:1
- [ ] Text resizable up to 200%
- [ ] Images of text avoided (use actual text)

**Operable:**
- [ ] All functionality keyboard accessible
- [ ] Skip navigation links
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Timing adjustable where applicable

**Understandable:**
- [ ] Language of page identified (lang attribute)
- [ ] Navigation consistent across pages
- [ ] Form labels and instructions clear
- [ ] Error messages descriptive
- [ ] Help available for complex interactions

**Robust:**
- [ ] Valid HTML
- [ ] ARIA landmarks used appropriately
- [ ] Form inputs have labels
- [ ] Status messages announced to screen readers

### Testing Tools
- axe DevTools
- WAVE browser extension
- Screen reader testing (NVDA, VoiceOver)
- Keyboard-only navigation testing

---

## Appendix M: Launch Checklist

### Pre-Launch (1 week before)
- [ ] All MVP features complete and tested
- [ ] Security review completed
- [ ] Performance testing passed
- [ ] Accessibility audit passed
- [ ] Beta testing with 3-5 restaurants
- [ ] Documentation complete
- [ ] Monitoring and alerts configured
- [ ] Backup strategy in place
- [ ] Rollback plan documented

### Launch Day
- [ ] Final production deployment
- [ ] DNS pointed to CloudFront
- [ ] SSL certificate verified
- [ ] Smoke tests passed
- [ ] Monitoring dashboards active
- [ ] Support channels ready
- [ ] Announcement prepared

### Post-Launch (First Week)
- [ ] Monitor error rates
- [ ] Gather user feedback
- [ ] Fix critical bugs immediately
- [ ] Document learnings
- [ ] Plan next iteration

---

## Appendix N: Support & Maintenance Plan

### Ongoing Maintenance
- **Weekly:**
  - Review error logs
  - Check CloudWatch alarms
  - Monitor costs

- **Monthly:**
  - Security patches (dependencies)
  - Performance review
  - User feedback analysis
  - Database optimization

- **Quarterly:**
  - Infrastructure review
  - Cost optimization
  - Feature planning
  - User satisfaction survey

### Support Channels
- Email: support@eat-sheet.com
- In-app feedback form
- GitHub issues (for maintainers)

### SLA Targets
- Critical bugs: Fix within 24 hours
- High priority: Fix within 1 week
- Enhancement requests: Prioritize in roadmap

---

## Conclusion

This specification provides a comprehensive blueprint for building Eat-Sheet, a modern digital menu platform. The architecture balances cost-effectiveness with scalability, leveraging serverless technologies and Infrastructure as Code for maintainability.

**Key Success Factors:**
1. **Exceptional UX** - Focus on delight at every touchpoint
2. **Cost efficiency** - Stay within personal project budget
3. **Flexibility** - Schema designed for future enhancements
4. **Type safety** - TypeScript throughout for reliability
5. **Modern stack** - Trending, well-supported technologies

**Next Steps:**
1. Review and approve this specification
2. Set up development environment
3. Initialize Pulumi infrastructure
4. Begin Phase 1 development
5. Beta test with friendly restaurants

**Estimated Timeline:** 8-10 weeks to MVP launch

Good luck building Eat-Sheet! 🍽️
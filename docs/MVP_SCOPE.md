# MVP Scope

This document defines what is **IN** and **OUT** of scope for the Minimum Viable Product (MVP).

## MVP Features (Phase 1)

### Core Infrastructure
- ✅ AWS account setup (Lambda, API Gateway, S3, CloudFront)
- ✅ PostgreSQL database (Neon free tier)
- ✅ Authentication (AWS Cognito)
- ✅ Pulumi Infrastructure as Code

### Restaurant Management
- ✅ Create restaurant entity
- ✅ Restaurant slug (URL-friendly identifier)
- ✅ Basic restaurant info (name, description, contact)
- ✅ Restaurant landing page
- ✅ One maintainer = owner (simplified permissions)

### Menu Management
- ✅ Create/edit/delete menus
- ✅ Menu slug per restaurant
- ✅ Menu status (active/inactive/draft)
- ✅ Single default theme (no customization yet)

### Menu Items
- ✅ Create/edit/delete menu items
- ✅ Item details (name, description, price)
- ✅ Section grouping (appetizers, mains, etc.)
- ✅ Item status (available/sold_out/hidden)
- ✅ Basic image upload (one image per item)

### Consumer Features
- ✅ View restaurant landing page
- ✅ Browse active menus
- ✅ View menu items with details
- ✅ QR code generation for menus
- ✅ Public access (no auth required for viewing)

### API & Documentation
- ✅ RESTful API with Hono + Zod validation
- ✅ OpenAPI documentation (auto-generated)
- ✅ Basic error handling

---

## Post-MVP Features (Future Phases)

### Phase 2: Enhanced UX
- ❌ AI modification suggestions (OpenAI integration)
- ❌ Reviews and ratings
- ❌ Multiple images per item
- ❌ Menu theming/customization
- ❌ PDF export
- ❌ PWA capabilities (offline support)

### Phase 3: Social Features
- ❌ User authentication for consumers
- ❌ Save favorite orders
- ❌ Share orders with public links
- ❌ User-to-user sharing

### Phase 4: Analytics & Advanced
- ❌ Analytics dashboard for maintainers
- ❌ Event tracking (views, clicks)
- ❌ Custom theme builder
- ❌ Multi-restaurant management
- ❌ Maintainer collaboration (invite/remove)

### Phase 5: Polish
- ❌ Advanced image optimization (WebP, responsive)
- ❌ Performance optimizations
- ❌ Advanced caching strategies
- ❌ Mobile app (React Native/PWA)

---

## Key MVP Simplifications

### Authentication
- **MVP**: Cognito for maintainers only
- **Post-MVP**: Consumer authentication for reviews/saved orders

### Permissions
- **MVP**: Single owner per restaurant (first creator)
- **Post-MVP**: Multiple maintainers with roles

### Images
- **MVP**: One image per menu item, stored in S3
- **Post-MVP**: Multiple images, advanced optimization, WebP

### Theming
- **MVP**: Single hardcoded theme for all menus
- **Post-MVP**: Multiple pre-built themes + custom theme builder

### AI Features
- **MVP**: None - skip OpenAI integration entirely
- **Post-MVP**: AI modification suggestions with caching

### Analytics
- **MVP**: No analytics
- **Post-MVP**: Event tracking, dashboard, insights

### Social Features
- **MVP**: No saved orders, no reviews, no sharing
- **Post-MVP**: Full social feature set

---

## MVP Success Criteria

The MVP is considered **complete** when:

1. ✅ Restaurant owner can create account (Cognito)
2. ✅ Owner can create restaurant with basic info
3. ✅ Owner can create menu(s) for restaurant
4. ✅ Owner can add/edit/remove menu items with images
5. ✅ Owner can generate QR code for menu
6. ✅ Consumer can scan QR code → view menu
7. ✅ Consumer can browse menu items with images/prices
8. ✅ All data persists in PostgreSQL
9. ✅ API is deployed to AWS Lambda
10. ✅ Frontend is deployed to S3 + CloudFront

---

## Technical Debt Acceptable for MVP

- Basic error messages (no user-friendly translations)
- Minimal form validation on frontend
- No loading skeletons (simple spinners okay)
- Basic responsive design (mobile works, not perfect)
- No image compression (accept large files for now)
- No caching (beyond basic CloudFront)
- Basic logging (console.log acceptable)
- No monitoring/alerting setup

---

## Development Order for MVP

1. **Database schema** - Define core tables (restaurants, menus, items)
2. **Backend API** - Implement CRUD endpoints
3. **Authentication** - Set up Cognito for maintainers
4. **Image uploads** - S3 pre-signed URLs
5. **Frontend - Maintainer** - Dashboard for managing restaurants/menus
6. **Frontend - Consumer** - Public menu viewing pages
7. **QR code generation** - Simple QR code for each menu
8. **Deployment** - Pulumi infrastructure deployment
9. **Testing** - Manual testing of critical flows
10. **Documentation** - Basic README for setup/deployment

---

## Out of Scope for Entire Project

These features will **never** be built:

- ❌ Online ordering/checkout (focus is menu presentation only)
- ❌ Payment processing
- ❌ Delivery integration
- ❌ Reservation systems
- ❌ Table management
- ❌ POS integration
- ❌ Inventory management
- ❌ Staff scheduling

---

## Notes

- This scope can be adjusted based on user feedback and priorities
- AI features may be added in Phase 2 if budget/time allows
- Focus on **quality over quantity** - better to ship a polished MVP than rush features

          schema: RestaurantSchema,
        },
      },
      description: "Restaurant created",
    },
  },
});

app.openapi(createRoute, requireAuth, async (c) => {
  const user = c.get("user");
  const data = c.req.valid("json");

  // Create restaurant
  const [restaurant] = await db
    .insert(restaurants)
    .values(data)
    .returning();

  // Add creator as owner
  await db.insert(restaurantMaintainers).values({
    restaurantId: restaurant.id,
    userId: user.id,
    role: "owner",
  });

  return c.json(restaurant, 201);
});

// Update restaurant
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateRestaurantSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: RestaurantSchema,
        },
      },
      description: "Restaurant updated",
    },
  },
});

app.openapi(updateRoute, requireAuth, requireMaintainer, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");

  const [updated] = await db
    .update(restaurants)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(restaurants.id, id))
    .returning();

  return c.json(updated);
});

// Delete restaurant
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    204: {
      description: "Restaurant deleted",
    },
  },
});

app.openapi(deleteRoute, requireAuth, requireOwner, async (c) => {
  const { id } = c.req.valid("param");

  await db.delete(restaurants).where(eq(restaurants.id, id));

  return c.body(null, 204);
});

export default app;
```

### Step 3.2: Menu Routes

**File: `backend/src/routes/menus.ts`**
```typescript
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { db } from "../db";
import { menus } from "../db/schema";
import { requireAuth, requireMaintainer } from "../middleware/auth";
import { MenuSchema, CreateMenuSchema, UpdateMenuSchema } from "../schemas/menu";
import { eq, and } from "drizzle-orm";

const app = new OpenAPIHono();

// List menus for a restaurant
app.get("/restaurants/:restaurantId/menus", async (c) => {
  const { restaurantId } = c.req.param();

  const restaurantMenus = await db.query.menus.findMany({
    where: eq(menus.restaurantId, restaurantId),
    orderBy: (menus, { asc }) => [asc(menus.displayOrder)],
  });

  return c.json({ menus: restaurantMenus });
});

// Get specific menu by slug
app.get("/restaurants/:restaurantId/menus/:slug", async (c) => {
  const { restaurantId, slug } = c.req.param();

  const menu = await db.query.menus.findFirst({
    where: and(
      eq(menus.restaurantId, restaurantId),
      eq(menus.slug, slug)
    ),
  });

  if (!menu) {
    return c.json({ error: "Menu not found" }, 404);
  }

  return c.json(menu);
});

// Create menu
app.post(
  "/restaurants/:restaurantId/menus",
  requireAuth,
  requireMaintainer,
  async (c) => {
    const { restaurantId } = c.req.param();
    const data = await c.req.json();

    const [menu] = await db
      .insert(menus)
      .values({
        ...data,
        restaurantId,
      })
      .returning();

    return c.json(menu, 201);
  }
);

// Update menu
app.put("/menus/:id", requireAuth, async (c) => {
  const { id } = c.req.param();
  const data = await c.req.json();

  // Get menu to check restaurant ownership
  const menu = await db.query.menus.findFirst({
    where: eq(menus.id, id),
  });

  if (!menu) {
    return c.json({ error: "Menu not found" }, 404);
  }

  // Check maintainer access via restaurant
  c.req.addValidatedData("param", { restaurantId: menu.restaurantId });
  
  const [updated] = await db
    .update(menus)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(menus.id, id))
    .returning();

  return c.json(updated);
});

// Delete menu
app.delete("/menus/:id", requireAuth, requireMaintainer, async (c) => {
  const { id } = c.req.param();

  await db.delete(menus).where(eq(menus.id, id));

  return c.body(null, 204);
});

export default app;
```

### Step 3.3: Image Upload Routes

**File: `backend/src/routes/images.ts`**
```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const app = new OpenAPIHono();

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
});

// Generate pre-signed URL for upload
app.post("/upload-url", requireAuth, async (c) => {
  const body = await c.req.json<{
    fileName: string;
    fileType: string;
    context: "restaurant" | "menu" | "item";
    contextId: string;
  }>();

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(body.fileType)) {
    return c.json({ error: "Invalid file type" }, 400);
  }

  // Generate unique file name
  const timestamp = Date.now();
  const extension = body.fileType.split("/")[1];
  const key = `${body.context}/${body.contextId}/${timestamp}.${extension}`;

  // Generate pre-signed URL (15 min expiry)
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    ContentType: body.fileType,
    ContentLength: 5 * 1024 * 1024, // 5MB max
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 900, // 15 minutes
  });

  return c.json({
    uploadUrl,
    key,
    publicUrl: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
  });
});

// Confirm upload (optional - for tracking)
app.post("/confirm", requireAuth, async (c) => {
  const body = await c.req.json<{
    key: string;
  }>();

  // Here you could verify the file exists in S3
  // Or update database records
  
  return c.json({ success: true });
});

export default app;
```

### Step 3.4: AI Modification Suggestions

**File: `backend/src/routes/items.ts`**
```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "../db";
import { menuItems } from "../db/schema";
import { requireAuth, requireMaintainer } from "../middleware/auth";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

const app = new OpenAPIHono();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get menu items
app.get("/menus/:menuId/items", async (c) => {
  const { menuId } = c.req.param();

  const items = await db.query.menuItems.findMany({
    where: eq(menuItems.menuId, menuId),
    orderBy: (items, { asc }) => [asc(items.section), asc(items.displayOrder)],
  });

  return c.json({ items });
});

// Create menu item
app.post(
  "/menus/:menuId/items",
  requireAuth,
  requireMaintainer,
  async (c) => {
    const { menuId } = c.req.param();
    const data = await c.req.json();

    const [item] = await db
      .insert(menuItems)
      .values({
        ...data,
        menuId,
        price: data.price.toString(),
      })
      .returning();

    return c.json(item, 201);
  }
);

// AI modification suggestions
app.post("/items/:id/suggest-modifications", async (c) => {
  const { id } = c.req.param();

  const item = await db.query.menuItems.findFirst({
    where: eq(menuItems.id, id),
  });

  if (!item) {
    return c.json({ error: "Item not found" }, 404);
  }

  // Check if we have cached suggestions (you could store these in DB)
  // For now, always call OpenAI

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that suggests common food modifications customers might request.",
        },
        {
          role: "user",
          content: `Given this menu item:
Name: ${item.name}
Description: ${item.description || "No description"}

Suggest 5-10 common modifications customers might request (like "no pickles", "extra cheese", "spicy", etc.). Return as a JSON array of strings.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const content = response.choices[0].message.content || "[]";
    const suggestions = JSON.parse(content);

    return c.json({ suggestions });
  } catch (error) {
    console.error("OpenAI error:", error);
    
    // Fallback to generic suggestions
    return c.json({
      suggestions: [
        "No onions",
        "No tomatoes",
        "Extra cheese",
        "Light sauce",
        "On the side",
      ],
    });
  }
});

export default app;
```

### Step 3.5: Reviews Routes

**File: `backend/src/routes/reviews.ts`**
```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "../db";
import { reviews, analyticsEvents } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { eq, and } from "drizzle-orm";

const app = new OpenAPIHono();

// Get reviews for an item
app.get("/items/:itemId/reviews", async (c) => {
  const { itemId } = c.req.param();

  const itemReviews = await db.query.reviews.findMany({
    where: eq(reviews.menuItemId, itemId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
  });

  return c.json({ reviews: itemReviews });
});

// Create review
app.post("/items/:itemId/reviews", requireAuth, async (c) => {
  const { itemId } = c.req.param();
  const user = c.get("user");
  const data = await c.req.json<{
    rating: number;
    reviewText?: string;
  }>();

  // Validate rating
  if (data.rating < 1 || data.rating > 5) {
    return c.json({ error: "Rating must be between 1 and 5" }, 400);
  }

  // Check if user already reviewed this item
  const existing = await db.query.reviews.findFirst({
    where: and(
      eq(reviews.menuItemId, itemId),
      eq(reviews.userId, user.id)
    ),
  });

  if (existing) {
    return c.json({ error: "You already reviewed this item" }, 400);
  }

  // Create review
  const [review] = await db
    .insert(reviews)
    .values({
      menuItemId: itemId,
      userId: user.id,
      rating: data.rating,
      reviewText: data.reviewText,
    })
    .returning();

  // Track analytics event
  await db.insert(analyticsEvents).values({
    eventType: "review_created",
    menuItemId: itemId,
  });

  return c.json(review, 201);
});

// Update review
app.put("/reviews/:id", requireAuth, async (c) => {
  const { id } = c.req.param();
  const user = c.get("user");
  const data = await c.req.json();

  // Check ownership
  const review = await db.query.reviews.findFirst({
    where: eq(reviews.id, id),
  });

  if (!review || review.userId !== user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const [updated] = await db
    .update(reviews)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(reviews.id, id))
    .returning();

  return c.json(updated);
});

// Delete review
app.delete("/reviews/:id", requireAuth, async (c) => {
  const { id } = c.req.param();
  const user = c.get("user");

  const review = await db.query.reviews.findFirst({
    where: eq(reviews.id, id),
  });

  if (!review || review.userId !== user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await db.delete(reviews).where(eq(reviews.id, id));

  return c.body(null, 204);
});

export default app;
```

### Step 3.6: Saved Orders Routes

**File: `backend/src/routes/orders.ts`**
```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "../db";
import { savedOrders, menuItems } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { eq, and, inArray } from "drizzle-orm";

const app = new OpenAPIHono();

// Get user's saved orders
app.get("/", requireAuth, async (c) => {
  const user = c.get("user");

  const orders = await db.query.savedOrders.findMany({
    where: eq(savedOrders.userId, user.id),
    orderBy: (orders, { desc }) => [desc(orders.createdAt)],
  });

  return c.json({ orders });
});

// Create saved order
app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const data = await c.req.json<{
    restaurantId: string;
    items: Array<{ itemId: string; modifications: string[] }>;
  }>();

  const [order] = await db
    .insert(savedOrders)
    .values({
      userId: user.id,
      restaurantId: data.restaurantId,
      items: data.items,
    })
    .returning();

  return c.json(order, 201);
});

// Get saved order with item details
app.get("/:id", requireAuth, async (c) => {
  const { id } = c.req.param();
  const user = c.get("user");

  const order = await db.query.savedOrders.findFirst({
    where: and(eq(savedOrders.id, id), eq(savedOrders.userId, user.id)),
  });

  if (!order) {
    return c.json({ error: "Order not found" }, 404);
  }

  // Fetch current menu items to check availability
  const itemIds = order.items.map((item) => item.itemId);
  const items = await db.query.menuItems.findMany({
    where: inArray(menuItems.id, itemIds),
  });

  // Map items with availability status
  const enrichedItems = order.items.map((orderItem) => {
    const currentItem = items.find((i) => i.id === orderItem.itemId);
    return {
      ...orderItem,
      item: currentItem,
      available: currentItem?.status === "available",
      exists: !!currentItem,
    };
  });

  return c.json({
    ...order,
    items: enrichedItems,
  });
});

// Delete saved order
app.delete("/:id", requireAuth, async (c) => {
  const { id } = c.req.param();
  const user = c.get("user");

  await db
    .delete(savedOrders)
    .where(and(eq(savedOrders.id, id), eq(savedOrders.userId, user.id)));

  return c.body(null, 204);
});

// Generate shareable order link
app.post("/:id/share", requireAuth, async (c) => {
  const { id } = c.req.param();
  const user = c.get("user");

  const order = await db.query.savedOrders.findFirst({
    where: and(eq(savedOrders.id, id), eq(savedOrders.userId, user.id)),
  });

  if (!order) {
    return c.json({ error: "Order not found" }, 404);
  }

  // Generate shareable token (simple base64 encoding for now)
  // In production, consider using signed tokens
  const token = Buffer.from(JSON.stringify(order.items)).toString("base64url");

  return c.json({
    shareUrl: `https://eat-sheet.com/shared/${token}`,
    token,
  });
});

export default app;
```

### Step 3.7: Analytics Routes

**File: `backend/src/routes/analytics.ts`**
```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "../db";
import { analyticsEvents, reviews } from "../db/schema";
import { requireAuth, requireMaintainer } from "../middleware/auth";
import { eq, and, gte, sql } from "drizzle-orm";

const app = new OpenAPIHono();

// Track event (public endpoint)
app.post("/track", async (c) => {
  const data = await c.req.json<{
    eventType: "menu_view" | "item_view";
    menuId?: string;
    menuItemId?: string;
    restaurantId?: string;
  }>();

  await db.insert(analyticsEvents).values(data);

  return c.json({ success: true });
});

// Get restaurant analytics
app.get(
  "/restaurants/:id/analytics",
  requireAuth,
  requireMaintainer,
  async (c) => {
    const { id } = c.req.param();
    const days = parseInt(c.req.query("days") || "30");

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Menu views
    const menuViews = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.restaurantId, id),
          eq(analyticsEvents.eventType, "menu_view"),
          gte(analyticsEvents.createdAt, since)
        )
      );

    // Item views (top 10)
    const topItems = await db
      .select({
        menuItemId: analyticsEvents.menuItemId,
        count: sql<number>`count(*)::int`,
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.restaurantId, id),
          eq(analyticsEvents.eventType, "item_view"),
          gte(analyticsEvents.createdAt, since)
        )
      )
      .groupBy(analyticsEvents.menuItemId)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    // Review stats
    const reviewStats = await db
      .select({
        count: sql<number>`count(*)::int`,
        avgRating: sql<number>`avg(rating)::float`,
      })
      .from(reviews)
      .innerJoin(/* join through items, menus to restaurant */);

    return c.json({
      period: { days, since },
      menuViews: menuViews[0]?.count || 0,
      topItems,
      reviews: reviewStats[0] || { count: 0, avgRating: 0 },
    });
  }
);

export default app;
```

**Tasks for Claude Code:**
1. Implement remaining routes (auth signup/login with Cognito)
2. Add error handling middleware
3. Add request validation
4. Test all endpoints locally
5. Build for Lambda deployment

---

## Phase 4: Frontend Development (Week 3-4)

### Step 4.1: Initialize React Project

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
```

**File: `frontend/package.json` (add dependencies)**
```json
{
  "dependencies": {
    "react": "^18.3.x",
    "react-dom": "^18.3.x",
    "react-router-dom": "^6.x",
    "@mantine/core": "^7.x",
    "@mantine/hooks": "^7.x",
    "@tanstack/react-query": "^5.x",
    "@aws-amplify/auth": "^6.x",
    "axios": "^1.x",
    "zustand": "^4.x"
  },
  "devDependencies": {
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x",
    "@vitejs/plugin-react": "^4.x",
    "typescript": "^5.x",
    "vite": "^5.x",
    "vite-plugin-pwa": "^0.19.x"
  }
}
```

### Step 4.2: Set Up Mantine & Theme

**File: `frontend/src/main.tsx`**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import '@mantine/core/styles.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider defaultColorScheme="light">
        <App />
      </MantineProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
```

### Step 4.3: Set Up Routing

**File: `frontend/src/App.tsx`**
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '@mantine/core';

// Pages (create these next)
import HomePage from './pages/Home';
import RestaurantPage from './pages/Restaurant';
import MenuPage from './pages/Menu';
import DashboardPage from './pages/Dashboard';
import LoginPage from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard/*" element={<DashboardPage />} />
          <Route path="/:restaurantSlug" element={<RestaurantPage />} />
          <Route path="/:restaurantSlug/:menuSlug" element={<MenuPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
```

### Step 4.4: API Client Setup

**File: `frontend/src/lib/api.ts`**
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Step 4.5: React Query Hooks

**File: `frontend/src/hooks/useRestaurant.ts`**
```typescript
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export function useRestaurant(slug: string) {
  return useQuery({
    queryKey: ['restaurant', slug],
    queryFn: async () => {
      const { data } = await api.get(`/restaurants/${slug}`);
      return data;
    },
  });
}

export function useRestaurantMenus(restaurantId: string) {
  return useQuery({
    queryKey: ['menus', restaurantId],
    queryFn: async () => {
      const { data } = await api.get(`/restaurants/${restaurantId}/menus`);
      return data.menus;
    },
  });
}
```

**File: `frontend/src/hooks/useMenu.ts`**
```typescript
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export function useMenu(restaurantSlug: string, menuSlug: string) {
  return useQuery({
    queryKey: ['menu', restaurantSlug, menuSlug],
    queryFn: async () => {
      const { data } = await api.get(
        `/restaurants/${restaurantSlug}/menus/${menuSlug}`
      );
      return data;
    },
  });
}

export function useMenuItems(menuId: string) {
  return useQuery({
    queryKey: ['items', menuId],
    queryFn: async () => {
      const { data } = await api.get(`/menus/${menuId}/items`);
      return data.items;
    },
  });
}
```

### Step 4.6: Key Pages

**File: `frontend/src/pages/Restaurant.tsx`**
```typescript
import { useParams } from 'react-router-dom';
import { Container, Title, Text, Grid, Card, Image, Badge } from '@mantine/core';
import { useRestaurant, useRestaurantMenus } from '../hooks/useRestaurant';

export default function RestaurantPage() {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const { data: restaurant, isLoading } = useRestaurant(restaurantSlug!);
  const { data: menus } = useRestaurantMenus(restaurant?.id);

  if (isLoading) return <div>Loading...</div>;
  if (!restaurant) return <div>Restaurant not found</div>;

  return (
    <Container size="xl" py="xl">
      {/* Hero Section */}
      <div>
        <Title order={1}>{restaurant.name}</Title>
        <Text size="lg" c="dimmed" mt="md">
          {restaurant.description}
        </Text>
      </div>

      {/* Menus Grid */}
      <Title order={2} mt="xl" mb="md">
        Our Menus
      </Title>
      <Grid>
        {menus?.map((menu: any) => (
          <Grid.Col key={menu.id} span={{ base: 12, sm: 6, md: 4 }}>
            <Card
              shadow="sm"
              padding="lg"
              component="a"
              href={`/${restaurantSlug}/${menu.slug}`}
            >
              {menu.heroImageUrl && (
                <Card.Section>
                  <Image src={menu.heroImageUrl} height={160} alt={menu.title} />
                </Card.Section>
              )}

              <Title order={3} mt="md">
                {menu.title}
              </Title>
              <Text size="sm" c="dimmed" mt="xs">
                {menu.description}
              </Text>

              {menu.availability && (
                <Badge mt="sm">{menu.availability}</Badge>
              )}
            </Card>
          </Grid.Col>
        ))}
      </Grid>
    </Container>
  );
}
```

**File: `frontend/src/pages/Menu.tsx`**
```typescript
import { useParams } from 'react-router-dom';
import { Container, Title, Grid } from '@mantine/core';
import { useMenu, useMenuItems } from '../hooks/useMenu';
import MenuItemCard from '../components/MenuItemCard';

export default function MenuPage() {
  const { restaurantSlug, menuSlug } = useParams();
  const { data: menu } = useMenu(restaurantSlug!, menuSlug!);
  const { data: items } = useMenuItems(menu?.id);

  // Group items by section
  const groupedItems = items?.reduce((acc: any, item: any) => {
    const section = item.section || 'Other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  return (
    <Container size="xl" py="xl">
      <Title order={1}>{menu?.title}</Title>

      {Object.entries(groupedItems || {}).map(([section, sectionItems]: [string, any]) => (
        <div key={section}>
          <Title order={2} mt="xl" mb="md">
            {section}
          </Title>
          <Grid>
            {sectionItems.map((item: any) => (
              <Grid.Col key={item.id} span={{ base: 12, sm: 6, md: 4 }}>
                <MenuItemCard item={item} />
              </Grid.Col>
            ))}
          </Grid>
        </div>
      ))}
    </Container>
  );
}
```

### Step 4.7: PWA Configuration

**File: `frontend/vite.config.ts`**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Eat-Sheet - Digital Menus',
        short_name: 'Eat-Sheet',
        description: 'Beautiful digital menus for restaurants',
        theme_color: '#2C3E50',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.cloudfront\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.amazonaws\.com\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
});
```

**Tasks for Claude Code:**
1. Create remaining components (MenuItemCard, ReviewForm, etc.)
2. Implement authentication with Cognito
3. Build dashboard for maintainers
4. Add QR code generation component
5. Implement order saving/sharing
6. Style with Mantine themes
7. Test PWA functionality

---

## Phase 5: Lambda Deployment (Week 4)

### Step 5.1: Build Backend for Lambda

**File: `backend/tsup.config.ts`**
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  splitting: false,
  clean: true,
  minify: true,
  target: 'node20',
  bundle: true,
  external: ['aws-sdk'],
});
```

**Build command:**
```bash
cd backend
npm run build
# Creates dist/index.js
```

### Step 5.2: Update Pulumi Lambda with Real Code

**File: `infrastructure/lambda.ts` (update)**
```typescript
// Replace placeholder Lambda with actual code
const apiLambda = new aws.lambda.Function("api-lambda", {
  runtime: aws.lambda.Runtime.NodeJS20dX,
  role: lambdaRole.arn,
  handler: "index.handler",
  code: new pulumi.asset.FileArchive("../backend/dist"), // Point to built code
  timeout: 30,
  memorySize: 1024, // Increase for better performance
  environment: {
    variables: {
      NODE_ENV: pulumi.getStack(),
      COGNITO_USER_POOL_ID: cognitoUserPoolId,
      COGNITO_REGION: process.env.AWS_REGION || "us-east-1",
      S3_BUCKET_NAME: imagesBucket.bucket,
      DATABASE_URL: config.requireSecret("databaseUrl"),
      OPENAI_API_KEY: config.requireSecret("openaiApiKey"),
    },
  },
});
```

**Tasks for Claude Code:**
1. Set secrets in Pulumi:
   ```bash
   pulumi config set --secret databaseUrl "postgresql://..."
   pulumi config set --secret openaiApiKey "sk-..."
   ```
2. Build backend: `cd backend && npm run build`
3. Deploy: `cd infrastructure && pulumi up`

### Step 5.3: Deploy Frontend to S3

**Build frontend:**
```bash
cd frontend
npm run build
# Creates dist/ folder
```

**Update Pulumi to upload frontend:**
```typescript
// In infrastructure/s3.ts or new file

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function deployFrontend(bucket: aws.s3.Bucket) {
  const frontendDir = "../frontend/dist";
  
  // Upload all files from dist to S3
  const files = pulumi.output(
    new pulumi.asset.FileArchive(frontendDir)
  );

  // Create bucket objects for each file
  // This is a simplified version - in production, use a script to upload all files
  
  return bucket;
}
```

**Alternative: Use AWS CLI for frontend deployment:**
```bash
# Build
cd frontend && npm run build

# Upload to S3
aws s3 sync dist/ s3://eat-sheet-frontend-dev --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

**Tasks for Claude Code:**
1. Build frontend
2. Upload to S3
3. Invalidate CloudFront
4. Test deployment

---

## Phase 6: Testing & Refinement (Week 5)

### Step 6.1: Testing Checklist

**Backend Tests:**
```bash
cd backend
npm run test
```

**Create test file: `backend/src/__tests__/restaurants.test.ts`**
```typescript
import { describe, it, expect } from 'vitest';
import app from '../index';

describe('Restaurants API', () => {
  it('should list restaurants', async () => {
    const res = await app.request('/api/restaurants');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('restaurants');
  });

  it('should get restaurant by slug', async () => {
    const res = await app.request('/api/restaurants/test-restaurant');
    expect(res.status).toBeOneOf([200, 404]);
  });
});
```

**Frontend Tests:**
- Component tests with React Testing Library
- E2E tests with Playwright

**Manual Testing:**
1. QR code scanning on mobile
2. PWA installation
3. Offline functionality
4. Image uploads
5. Review submission
6. Order saving/sharing

### Step 6.2: Performance Optimization

**Backend:**
- Add database connection pooling
- Implement caching for frequently accessed data
- Optimize Lambda cold starts (keep warm)

**Frontend:**
- Lazy load routes
- Optimize images (WebP, responsive sizes)
- Code splitting
- Tree shaking

**File: `frontend/src/App.tsx` (lazy loading)**
```typescript
import { lazy, Suspense } from 'react';

const HomePage = lazy(() => import('./pages/Home'));
const RestaurantPage = lazy(() => import('./pages/Restaurant'));
const MenuPage = lazy(() => import('./pages/Menu'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/:restaurantSlug" element={<RestaurantPage />} />
          <Route path="/:restaurantSlug/:menuSlug" element={<MenuPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

---

## Phase 7: Beta Testing (Week 6)

### Step 7.1: Beta User Onboarding

**Create sample data script:**
```typescript
// backend/scripts/seed.ts
import { db } from '../src/db';
import { restaurants, menus, menuItems, users } from '../src/db/schema';

async function seed() {
  // Create test user
  const [user] = await db.insert(users).values({
    cognitoSub: 'test-sub-123',
    email: 'test@example.com',
    name: 'Test User',
  }).returning();

  // Create restaurant
  const [restaurant] = await db.insert(restaurants).values({
    slug: 'joes-diner',
    name: "Joe's Diner",
    description: 'Classic American diner',
    address: '123 Main St',
    status: 'active',
  }).returning();

  // Create menu
  const [menu] = await db.insert(menus).values({
    restaurantId: restaurant.id,
    slug: 'dinner-menu',
    title: 'Dinner Menu',
    description: 'Our delicious dinner options',
    status: 'active',
  }).returning();

  // Create items
  await db.insert(menuItems).values([
    {
      menuId: menu.id,
      name: 'Classic Burger',
      description: 'Beef patty with lettuce, tomato, onion',
      price: '12.99',
      section: 'Entrees',
      status: 'available',
    },
    {
      menuId: menu.id,
      name: 'Caesar Salad',
      description: 'Romaine, parmesan, croutons',
      price: '9.99',
      section: 'Salads',
      status: 'available',
    },
  ]);

  console.log('Seed complete!');
}

seed();
```

### Step 7.2: Monitoring Setup

**CloudWatch Dashboard:**
```typescript
// infrastructure/monitoring.ts
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function createMonitoring(lambda: aws.lambda.Function) {
  // Create CloudWatch dashboard
  const dashboard = new aws.cloudwatch.Dashboard("eat-sheet-dashboard", {
    dashboardName: `eat-sheet-${pulumi.getStack()}`,
    dashboardBody: JSON.stringify({
      widgets: [
        {
          type: "metric",
          properties: {
            metrics: [
              ["AWS/Lambda", "Invocations", { stat: "Sum" }],
              [".", "Errors", { stat: "Sum" }],
              [".", "Duration", { stat: "Average" }],
            ],
            period: 300,
            stat: "Average",
            region: "us-east-1",
            title: "Lambda Metrics",
          },
        },
      ],
    }),
  });

  // Create alarms
  const errorAlarm = new aws.cloudwatch.MetricAlarm("lambda-errors", {
    comparisonOperator: "GreaterThanThreshold",
    evaluationPeriods: 1,
    metricName: "Errors",
    namespace: "AWS/Lambda",
    period: 300,
    statistic: "Sum",
    threshold: 10,
    alarmDescription: "Lambda error rate too high",
    dimensions: {
      FunctionName: lambda.name,
    },
  });

  return { dashboard, errorAlarm };
}
```

### Step 7.3: Beta Feedback Collection

**Add feedback form to frontend:**
```typescript
// frontend/src/components/FeedbackButton.tsx
import { Button, Modal, Textarea } from '@mantine/core';
import { useState } from 'react';
import api from '../lib/api';

export default function FeedbackButton() {
  const [opened, setOpened] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async () => {
    await api.post('/feedback', { feedback });
    setOpened(false);
    setFeedback('');
  };

  return (
    <>
      <Button onClick={() => setOpened(true)}>Send Feedback</Button>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Feedback">
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Tell us what you think..."
          rows={4}
        />
        <Button onClick={handleSubmit} mt="md">
          Submit
        </Button>
      </Modal>
    </>
  );
}
```

---

## Phase 8: Production Launch (Week 7-8)

### Step 8.1: Pre-Launch Checklist

- [ ] All tests passing
- [ ] Security audit complete
- [ ] Performance benchmarks met (< 2s page load)
- [ ] Accessibility audit passed
- [ ] Mobile testing on iOS and Android
- [ ] QR codes tested in real restaurant
- [ ] SSL certificate valid
- [ ] DNS configured correctly
- [ ] Error monitoring active
- [ ] Backup strategy in place
- [ ] Documentation complete

### Step 8.2: Launch Day Tasks

**1. Final deployment:**
```bash
# Backend
cd backend && npm run build
cd ../infrastructure && pulumi up

# Frontend
cd ../frontend && npm run build
aws s3 sync dist/ s3://eat-sheet-frontend-prod --delete
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
```

**2. Verify production:**
```bash
# Test health endpoint
curl https://api.eat-sheet.com/health

# Test restaurant endpoint
curl https://api.eat-sheet.com/api/restaurants

# Visit frontend
open https://eat-sheet.com
```

**3. Monitor:**
- Watch CloudWatch dashboard
- Check error logs
- Monitor user signups

### Step 8.3: Post-Launch

**Week 1:**
- Daily monitoring
- Fix critical bugs immediately
- Gather user feedback
- Monitor costs

**Week 2:**
- Implement quick wins from feedback
- Optimize based on usage patterns
- Plan next iteration

---

## Development Best Practices

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/menu-theming

# Make changes, commit frequently
git add .
git commit -m "feat(menu): add theme customization"

# Push and create PR
git push origin feature/menu-theming
```

### Environment Management
```bash
# Development
DATABASE_URL=postgresql://localhost:5432/eatsheet_dev
NODE_ENV=development

# Staging
DATABASE_URL=postgresql://staging.neon.tech/eatsheet
NODE_ENV=staging

# Production
DATABASE_URL=postgresql://prod.neon.tech/eatsheet
NODE_ENV=production
```

### Code Quality
```bash
# Backend linting
cd backend
npm run lint
npm run type-check

# Frontend linting
cd frontend
npm run lint
npm run type-check

# Format all code
npm run format
```

---

## Troubleshooting Guide

### Common Issues

**1. Lambda cold starts too slow:**
```typescript
// Increase memory (faster CPU)
memorySize: 1536, // Up from 512

// Or keep warm with CloudWatch Events
const warmingRule = new aws.cloudwatch.EventRule("lambda-warming", {
  scheduleExpression: "rate(5 minutes)",
});
```

**2. CORS errors:**
```typescript
// Ensure API Gateway CORS configured
corsConfiguration: {
  allowOrigins: ["https://eat-sheet.com"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["*"],
  maxAge: 300,
}
```

**3. Database connection timeout:**
```typescript
// Use connection pooling
const client = postgres(connectionString, {
  max: 1, // For serverless
  idle_timeout: 20,
  connect_timeout: 10,
});
```

**4. Images not loading:**
- Check S3 bucket policy
- Verify CloudFront distribution
- Check CORS on S3 bucket

**5. Cognito authentication fails:**
- Verify JWT signature
- Check token expiration
- Ensure user pool ID correct

---

## Quick Reference Commands

### Development
```bash
# Start backend locally
cd backend && npm run dev

# Start frontend locally
cd frontend && npm run dev

# Database migrations
cd backend && npm run db:generate && npm run db:migrate

# View database
cd backend && npm run db:studio
```

### Deployment
```bash
# Deploy infrastructure
cd infrastructure && pulumi up

# Deploy backend
cd backend && npm run build
cd ../infrastructure && pulumi up

# Deploy frontend
cd frontend && npm run build
aws s3 sync dist/ s3://eat-sheet-frontend-prod --delete
```

### Maintenance
```bash
# View logs
aws logs tail /aws/lambda/api-lambda --follow

# Check costs
aws ce get-cost-and-usage --time-period Start=2025-01-01,End=2025-01-31 --granularity MONTHLY --metrics BlendedCost

# Database backup
pg_dump $DATABASE_URL > backup.sql
```

---

## Next Steps After MVP

### Feature Roadmap

**Phase 2 Features:**
- Custom theme builder (beyond pre-built)
- Advanced analytics (heatmaps, A/B testing)
- Multi-language support
- Nutritional information display

**Phase 3 Features:**
- Ordering & checkout system
- Payment integration (Stripe)
- Table management
- Waitlist/reservations

**Phase 4 Features:**
- Native mobile apps (React Native)
- Restaurant chain management
- Inventory tracking
- Menu scheduling (auto-activate/deactivate)

**Phase 5 Features:**
- Loyalty programs
- Email marketing integration
- Advanced reporting
- White-label solution

---

## Cost Optimization Tips

1. **Database:** Start with Neon free tier, upgrade only when needed
2. **Lambda:** Use smaller memory sizes where possible
3. **S3:** Enable intelligent tiering after 90 days
4. **CloudFront:** Cache aggressively, reduce origin requests
5. **API Gateway:** Consider HTTP API vs REST (cheaper)
6. **Images:** Compress before upload, use WebP format
7. **OpenAI:** Cache AI suggestions, use GPT-3.5 instead of GPT-4

---

## Support Resources

- **Pulumi Docs:** https://www.pulumi.com/docs/
- **Hono Docs:** https://hono.dev/
- **Drizzle Docs:** https://orm.drizzle.team/
- **Mantine Docs:** https://mantine.dev/
- **AWS Lambda:** https://docs.aws.amazon.com/lambda/
- **Neon Docs:** https://neon.tech/docs/

---

## Conclusion

This guide provides a comprehensive roadmap for building Eat-Sheet from scratch. Follow each phase sequentially, test thoroughly, and iterate based on feedback.

**Key Success Factors:**
1. Start small, iterate quickly
2. Test on real devices (mobile + QR codes)
3. Monitor costs closely
4. Gather user feedback early
5. Focus on exceptional UX

**Timeline:** 8-10 weeks from start to production launch

Good luck building Eat-Sheet! 🍽️# Eat-Sheet Development Guide for Claude Code

This guide provides step-by-step instructions for building the Eat-Sheet platform using Claude Code. Follow these phases sequentially.

---

## Prerequisites Setup

Before starting development, ensure you have:

```bash
# Required tools
node >= 18.x
npm >= 9.x
git
aws-cli (configured with credentials)
pulumi (installed globally)

# AWS Account with:
- IAM user with AdministratorAccess (for Pulumi)
- Access key + secret key configured locally

# External Services:
- Neon account (free tier) - Get PostgreSQL connection string
- OpenAI API key
- Squarespace domain registered (eat-sheet.com)
```

---

## Project Structure

```
eat-sheet/
├── infrastructure/          # Pulumi IaC
│   ├── index.ts
│   ├── cognito.ts
│   ├── lambda.ts
│   ├── s3.ts
│   ├── cloudfront.ts
│   └── apigateway.ts
├── backend/                 # Hono API
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── schemas/        # Zod schemas
│   │   ├── db/             # Drizzle
│   │   └── lib/
│   ├── drizzle/            # Migrations
│   ├── drizzle.config.ts
│   └── package.json
├── frontend/                # React PWA
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   └── package.json
├── shared/                  # Shared types
│   └── types.ts
└── README.md
```

---

## Phase 1: Infrastructure Setup (Week 1)

### Step 1.1: Initialize Project

```bash
# Create project structure
mkdir eat-sheet && cd eat-sheet
mkdir infrastructure backend frontend shared

# Initialize git
git init
echo "node_modules\n.env\n*.log\ndist\nbuild" > .gitignore
```

### Step 1.2: Set Up Pulumi Infrastructure

**File: `infrastructure/package.json`**
```json
{
  "name": "eat-sheet-infrastructure",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@pulumi/pulumi": "^3.x",
    "@pulumi/aws": "^6.x",
    "@pulumi/awsx": "^2.x"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "typescript": "^5.x"
  }
}
```

**File: `infrastructure/tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist"
  },
  "include": ["**/*.ts"]
}
```

**File: `infrastructure/Pulumi.yaml`**
```yaml
name: eat-sheet
runtime: nodejs
description: Eat-Sheet infrastructure
```

**File: `infrastructure/index.ts`**
```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Configuration
const config = new pulumi.Config();
const environment = pulumi.getStack();
const domain = config.require("domain"); // eat-sheet.com

// Export stack outputs
export const apiUrl = pulumi.output("https://api.eat-sheet.com");
export const frontendUrl = pulumi.output("https://eat-sheet.com");

// More resources will be added in subsequent steps
```

**Tasks for Claude Code:**
1. Initialize Pulumi stack: `pulumi stack init dev`
2. Set configuration: `pulumi config set aws:region us-east-1`
3. Set domain: `pulumi config set eat-sheet:domain eat-sheet.com`

### Step 1.3: Create Cognito User Pool

**File: `infrastructure/cognito.ts`**
```typescript
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function createCognito() {
  // User Pool
  const userPool = new aws.cognito.UserPool("eat-sheet-users", {
    name: `eat-sheet-users-${pulumi.getStack()}`,
    autoVerifiedAttributes: ["email"],
    usernameAttributes: ["email"],
    passwordPolicy: {
      minimumLength: 8,
      requireLowercase: true,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: false,
    },
    schemas: [
      {
        name: "email",
        attributeDataType: "String",
        required: true,
        mutable: false,
      },
      {
        name: "name",
        attributeDataType: "String",
        required: true,
        mutable: true,
      },
    ],
    accountRecoverySetting: {
      recoveryMechanisms: [
        {
          name: "verified_email",
          priority: 1,
        },
      ],
    },
  });

  // User Pool Client
  const userPoolClient = new aws.cognito.UserPoolClient(
    "eat-sheet-client",
    {
      name: `eat-sheet-client-${pulumi.getStack()}`,
      userPoolId: userPool.id,
      generateSecret: false,
      explicitAuthFlows: [
        "ALLOW_USER_PASSWORD_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
        "ALLOW_USER_SRP_AUTH",
      ],
      preventUserExistenceErrors: "ENABLED",
      accessTokenValidity: 1, // 1 hour
      idTokenValidity: 1,
      refreshTokenValidity: 30, // 30 days
      tokenValidityUnits: {
        accessToken: "hours",
        idToken: "hours",
        refreshToken: "days",
      },
    }
  );

  return {
    userPool,
    userPoolClient,
    userPoolId: userPool.id,
    userPoolClientId: userPoolClient.id,
  };
}
```

Update `infrastructure/index.ts`:
```typescript
import { createCognito } from "./cognito";

const cognito = createCognito();

export const cognitoUserPoolId = cognito.userPoolId;
export const cognitoClientId = cognito.userPoolClientId;
```

### Step 1.4: Create S3 Buckets

**File: `infrastructure/s3.ts`**
```typescript
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function createS3Buckets() {
  // Images bucket (private, pre-signed URLs only)
  const imagesBucket = new aws.s3.Bucket("eat-sheet-images", {
    bucket: `eat-sheet-images-${pulumi.getStack()}`,
    acl: "private",
    corsRules: [
      {
        allowedHeaders: ["*"],
        allowedMethods: ["PUT", "POST", "GET"],
        allowedOrigins: ["*"], // Restrict in production
        exposeHeaders: ["ETag"],
        maxAgeSeconds: 3000,
      },
    ],
    lifecycleRules: [
      {
        enabled: true,
        transitions: [
          {
            days: 90,
            storageClass: "INTELLIGENT_TIERING",
          },
        ],
      },
    ],
  });

  // Block all public access
  new aws.s3.BucketPublicAccessBlock("images-public-access-block", {
    bucket: imagesBucket.id,
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
  });

  // Frontend bucket (public via CloudFront)
  const frontendBucket = new aws.s3.Bucket("eat-sheet-frontend", {
    bucket: `eat-sheet-frontend-${pulumi.getStack()}`,
    website: {
      indexDocument: "index.html",
      errorDocument: "index.html", // SPA routing
    },
  });

  return {
    imagesBucket,
    frontendBucket,
  };
}
```

### Step 1.5: Create Lambda & API Gateway

**File: `infrastructure/lambda.ts`**
```typescript
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function createLambda(
  imagesBucket: aws.s3.Bucket,
  cognitoUserPoolId: pulumi.Output<string>
) {
  // IAM role for Lambda
  const lambdaRole = new aws.iam.Role("api-lambda-role", {
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Action: "sts:AssumeRole",
          Principal: {
            Service: "lambda.amazonaws.com",
          },
          Effect: "Allow",
        },
      ],
    }),
  });

  // Attach basic execution policy
  new aws.iam.RolePolicyAttachment("lambda-basic-execution", {
    role: lambdaRole,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
  });

  // S3 access policy
  new aws.iam.RolePolicy("lambda-s3-policy", {
    role: lambdaRole,
    policy: pulumi.interpolate`{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "s3:PutObject",
            "s3:GetObject",
            "s3:DeleteObject"
          ],
          "Resource": "${imagesBucket.arn}/*"
        }
      ]
    }`,
  });

  // Lambda function (placeholder - will deploy actual code later)
  const apiLambda = new aws.lambda.Function("api-lambda", {
    runtime: aws.lambda.Runtime.NodeJS20dX,
    role: lambdaRole.arn,
    handler: "index.handler",
    code: new pulumi.asset.AssetArchive({
      "index.js": new pulumi.asset.StringAsset(`
        exports.handler = async (event) => {
          return {
            statusCode: 200,
            body: JSON.stringify({ message: "API placeholder" })
          };
        };
      `),
    }),
    timeout: 30,
    memorySize: 512,
    environment: {
      variables: {
        NODE_ENV: pulumi.getStack(),
        COGNITO_USER_POOL_ID: cognitoUserPoolId,
        S3_BUCKET_NAME: imagesBucket.bucket,
      },
    },
  });

  return { apiLambda, lambdaRole };
}
```

**File: `infrastructure/apigateway.ts`**
```typescript
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function createApiGateway(lambda: aws.lambda.Function) {
  // API Gateway
  const api = new aws.apigatewayv2.Api("eat-sheet-api", {
    protocolType: "HTTP",
    corsConfiguration: {
      allowOrigins: ["*"], // Restrict in production
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["*"],
      maxAge: 300,
    },
  });

  // Lambda integration
  const integration = new aws.apigatewayv2.Integration("api-integration", {
    apiId: api.id,
    integrationType: "AWS_PROXY",
    integrationUri: lambda.arn,
    payloadFormatVersion: "2.0",
  });

  // Default route
  new aws.apigatewayv2.Route("api-route", {
    apiId: api.id,
    routeKey: "$default",
    target: pulumi.interpolate`integrations/${integration.id}`,
  });

  // Stage
  const stage = new aws.apigatewayv2.Stage("api-stage", {
    apiId: api.id,
    name: "$default",
    autoDeploy: true,
  });

  // Lambda permission
  new aws.lambda.Permission("api-lambda-permission", {
    action: "lambda:InvokeFunction",
    function: lambda.name,
    principal: "apigateway.amazonaws.com",
    sourceArn: pulumi.interpolate`${api.executionArn}/*/*`,
  });

  return { api, apiUrl: api.apiEndpoint };
}
```

Update `infrastructure/index.ts`:
```typescript
import { createS3Buckets } from "./s3";
import { createLambda } from "./lambda";
import { createApiGateway } from "./apigateway";

const s3 = createS3Buckets();
const lambda = createLambda(s3.imagesBucket, cognito.userPoolId);
const apiGateway = createApiGateway(lambda.apiLambda);

export const imagesBucketName = s3.imagesBucket.bucket;
export const apiEndpoint = apiGateway.apiUrl;
```

### Step 1.6: Create CloudFront Distribution

**File: `infrastructure/cloudfront.ts`**
```typescript
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function createCloudFront(
  frontendBucket: aws.s3.Bucket,
  domain: string
) {
  // SSL Certificate (must be in us-east-1 for CloudFront)
  const certificate = new aws.acm.Certificate(
    "eat-sheet-cert",
    {
      domainName: domain,
      validationMethod: "DNS",
    },
    { provider: new aws.Provider("us-east-1", { region: "us-east-1" }) }
  );

  // Origin Access Identity for S3
  const oai = new aws.cloudfront.OriginAccessIdentity("frontend-oai", {
    comment: "OAI for Eat-Sheet frontend",
  });

  // S3 bucket policy to allow CloudFront
  new aws.s3.BucketPolicy("frontend-bucket-policy", {
    bucket: frontendBucket.id,
    policy: pulumi.all([frontendBucket.arn, oai.iamArn]).apply(
      ([bucketArn, oaiArn]) =>
        JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                AWS: oaiArn,
              },
              Action: "s3:GetObject",
              Resource: `${bucketArn}/*`,
            },
          ],
        })
    ),
  });

  // CloudFront distribution
  const cdn = new aws.cloudfront.Distribution("eat-sheet-cdn", {
    enabled: true,
    isIpv6Enabled: true,
    defaultRootObject: "index.html",
    aliases: [domain],
    
    origins: [
      {
        originId: "s3-frontend",
        domainName: frontendBucket.bucketRegionalDomainName,
        s3OriginConfig: {
          originAccessIdentity: oai.cloudfrontAccessIdentityPath,
        },
      },
    ],

    defaultCacheBehavior: {
      targetOriginId: "s3-frontend",
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET", "HEAD", "OPTIONS"],
      cachedMethods: ["GET", "HEAD"],
      compress: true,
      
      forwardedValues: {
        queryString: false,
        cookies: {
          forward: "none",
        },
      },

      minTtl: 0,
      defaultTtl: 3600,
      maxTtl: 86400,
    },

    // Custom error responses for SPA routing
    customErrorResponses: [
      {
        errorCode: 404,
        responseCode: 200,
        responsePagePath: "/index.html",
      },
      {
        errorCode: 403,
        responseCode: 200,
        responsePagePath: "/index.html",
      },
    ],

    restrictions: {
      geoRestriction: {
        restrictionType: "none",
      },
    },

    viewerCertificate: {
      acmCertificateArn: certificate.arn,
      sslSupportMethod: "sni-only",
      minimumProtocolVersion: "TLSv1.2_2021",
    },
  });

  return {
    cdn,
    certificate,
    certificateValidationRecords: certificate.domainValidationOptions,
    cloudfrontDomain: cdn.domainName,
  };
}
```

Update `infrastructure/index.ts`:
```typescript
import { createCloudFront } from "./cloudfront";

const config = new pulumi.Config();
const domain = config.require("domain");

const cloudfront = createCloudFront(s3.frontendBucket, domain);

export const cloudfrontDomain = cloudfront.cloudfrontDomain;
export const certificateValidation = cloudfront.certificateValidationRecords;
```

**Tasks for Claude Code:**
1. Run `pulumi up` to create infrastructure
2. Note the certificate validation records output
3. Add DNS records in Squarespace:
   - CNAME for certificate validation (from output)
   - CNAME: `eat-sheet.com` → CloudFront domain
4. Wait for certificate validation (can take up to 30 minutes)

---

## Phase 2: Backend API Setup (Week 1-2)

### Step 2.1: Initialize Backend Project

**File: `backend/package.json`**
```json
{
  "name": "eat-sheet-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format esm --clean",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/db/migrate.ts",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "hono": "^4.x",
    "@hono/zod-openapi": "^0.15.x",
    "drizzle-orm": "^0.33.x",
    "postgres": "^3.x",
    "zod": "^3.x",
    "@aws-sdk/client-s3": "^3.x",
    "@aws-sdk/s3-request-presigner": "^3.x",
    "jsonwebtoken": "^9.x",
    "jwks-rsa": "^3.x",
    "openai": "^4.x"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "@types/jsonwebtoken": "^9.x",
    "typescript": "^5.x",
    "tsx": "^4.x",
    "tsup": "^8.x",
    "drizzle-kit": "^0.24.x",
    "vitest": "^1.x"
  }
}
```

**File: `backend/tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "outDir": "dist",
    "rootDir": "src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 2.2: Set Up Database Schema with Drizzle

**File: `backend/drizzle.config.ts`**
```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**File: `backend/src/db/schema.ts`**
```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  json,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

// Enums
export const restaurantStatusEnum = pgEnum("restaurant_status", [
  "active",
  "inactive",
]);

export const menuStatusEnum = pgEnum("menu_status", [
  "active",
  "inactive",
  "draft",
]);

export const itemStatusEnum = pgEnum("item_status", [
  "available",
  "sold_out",
  "hidden",
]);

export const maintainerRoleEnum = pgEnum("maintainer_role", [
  "owner",
  "maintainer",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "menu_view",
  "item_view",
  "review_created",
]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  cognitoSub: varchar("cognito_sub", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Restaurants table
export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  logoUrl: varchar("logo_url", { length: 500 }),
  heroImages: json("hero_images").$type<string[]>().default([]),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 500 }),
  hours: json("hours").$type<Record<string, any>>(),
  socialLinks: json("social_links").$type<Record<string, string>>(),
  status: restaurantStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Restaurant Maintainers junction table
export const restaurantMaintainers = pgTable(
  "restaurant_maintainers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .references(() => restaurants.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: maintainerRoleEnum("role").default("maintainer").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserRestaurant: unique().on(table.restaurantId, table.userId),
  })
);

// Menus table
export const menus = pgTable(
  "menus",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .references(() => restaurants.id, { onDelete: "cascade" })
      .notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    heroImageUrl: varchar("hero_image_url", { length: 500 }),
    themeConfig: json("theme_config").$type<Record<string, any>>().default({}),
    status: menuStatusEnum("status").default("draft").notNull(),
    availability: json("availability").$type<Record<string, any>>(),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueRestaurantSlug: unique().on(table.restaurantId, table.slug),
  })
);

// Menu Items table
export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  menuId: uuid("menu_id")
    .references(() => menus.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  images: json("images").$type<string[]>().default([]),
  section: varchar("section", { length: 100 }),
  displayOrder: integer("display_order").default(0).notNull(),
  status: itemStatusEnum("status").default("available").notNull(),
  tags: json("tags").$type<string[]>().default([]),
  allergens: json("allergens").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Reviews table
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    menuItemId: uuid("menu_item_id")
      .references(() => menuItems.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    rating: integer("rating").notNull(), // 1-5
    reviewText: text("review_text"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserItem: unique().on(table.menuItemId, table.userId),
  })
);

// Saved Orders table
export const savedOrders = pgTable("saved_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  restaurantId: uuid("restaurant_id")
    .references(() => restaurants.id, { onDelete: "cascade" })
    .notNull(),
  items: json("items").$type<Array<{ itemId: string; modifications: string[] }>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Analytics Events table
export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: eventTypeEnum("event_type").notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id, {
    onDelete: "set null",
  }),
  menuId: uuid("menu_id").references(() => menus.id, { onDelete: "set null" }),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id, {
    onDelete: "set null",
  }),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type exports for use in application
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Restaurant = typeof restaurants.$inferSelect;
export type NewRestaurant = typeof restaurants.$inferInsert;
export type Menu = typeof menus.$inferSelect;
export type NewMenu = typeof menus.$inferInsert;
export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type SavedOrder = typeof savedOrders.$inferSelect;
export type NewSavedOrder = typeof savedOrders.$inferInsert;
```

**File: `backend/src/db/index.ts`**
```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch for serverless environments
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
```

**File: `backend/src/db/migrate.ts`**
```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL!;
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete!");

  await sql.end();
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

**File: `backend/.env.example`**
```
DATABASE_URL=postgresql://user:password@host:5432/database
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_REGION=us-east-1
AWS_REGION=us-east-1
S3_BUCKET_NAME=eat-sheet-images-dev
OPENAI_API_KEY=sk-xxxxx
NODE_ENV=development
```

**Tasks for Claude Code:**
1. Install dependencies: `cd backend && npm install`
2. Copy `.env.example` to `.env` and fill in values
3. Generate migrations: `npm run db:generate`
4. Run migrations: `npm run db:migrate`
5. Verify with: `npm run db:studio` (opens Drizzle Studio)

### Step 2.3: Set Up Hono API with OpenAPI

**File: `backend/src/index.ts`**
```typescript
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { OpenAPIHono } from "@hono/zod-openapi";

// Import routes (will create these next)
import authRoutes from "./routes/auth";
import restaurantRoutes from "./routes/restaurants";
import menuRoutes from "./routes/menus";
import itemRoutes from "./routes/items";
import reviewRoutes from "./routes/reviews";
import orderRoutes from "./routes/orders";
import analyticsRoutes from "./routes/analytics";
import imageRoutes from "./routes/images";

const app = new OpenAPIHono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "https://eat-sheet.com"],
    credentials: true,
  })
);

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount routes
app.route("/api/auth", authRoutes);
app.route("/api/restaurants", restaurantRoutes);
app.route("/api/menus", menuRoutes);
app.route("/api/items", itemRoutes);
app.route("/api/reviews", reviewRoutes);
app.route("/api/saved-orders", orderRoutes);
app.route("/api/analytics", analyticsRoutes);
app.route("/api/images", imageRoutes);

// OpenAPI documentation
app.doc("/api/openapi.json", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Eat-Sheet API",
    description: "Digital menu platform API",
  },
});

// For local development
if (process.env.NODE_ENV === "development") {
  const port = 3000;
  console.log(`🚀 Server running at http://localhost:${port}`);
  export default {
    port,
    fetch: app.fetch,
  };
}

// For AWS Lambda
export const handler = app.fetch;
```

### Step 2.4: Create Authentication Middleware

**File: `backend/src/middleware/auth.ts`**
```typescript
import { Context, Next } from "hono";
import { verify } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const client = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const decoded: any = await new Promise((resolve, reject) => {
      verify(
        token,
        getKey,
        {
          algorithms: ["RS256"],
          issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
        },
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        }
      );
    });

    // Get or create user in database
    let user = await db.query.users.findFirst({
      where: eq(users.cognitoSub, decoded.sub),
    });

    if (!user) {
      // Create user on first login
      const [newUser] = await db
        .insert(users)
        .values({
          cognitoSub: decoded.sub,
          email: decoded.email,
          name: decoded.name || decoded.email,
        })
        .returning();
      user = newUser;
    }

    // Attach user to context
    c.set("user", user);
    await next();
  } catch (error) {
    console.error("Auth error:", error);
    return c.json({ error: "Invalid token" }, 401);
  }
}

export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    // Try to authenticate, but don't fail if invalid
    try {
      await requireAuth(c, next);
      return;
    } catch (error) {
      // Continue without auth
    }
  }

  await next();
}
```

**File: `backend/src/middleware/maintainer.ts`**
```typescript
import { Context, Next } from "hono";
import { db } from "../db";
import { restaurantMaintainers } from "../db/schema";
import { and, eq } from "drizzle-orm";

export async function requireMaintainer(c: Context, next: Next) {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const restaurantId = c.req.param("restaurantId") || c.req.param("id");
  if (!restaurantId) {
    return c.json({ error: "Restaurant ID required" }, 400);
  }

  // Check if user is a maintainer of this restaurant
  const maintainer = await db.query.restaurantMaintainers.findFirst({
    where: and(
      eq(restaurantMaintainers.restaurantId, restaurantId),
      eq(restaurantMaintainers.userId, user.id)
    ),
  });

  if (!maintainer) {
    return c.json({ error: "Forbidden" }, 403);
  }

  c.set("maintainer", maintainer);
  await next();
}

export async function requireOwner(c: Context, next: Next) {
  await requireMaintainer(c, async () => {
    const maintainer = c.get("maintainer");
    if (maintainer.role !== "owner") {
      return c.json({ error: "Owner access required" }, 403);
    }
    await next();
  });
}
```

### Step 2.5: Create Zod Schemas

**File: `backend/src/schemas/restaurant.ts`**
```typescript
import { z } from "@hono/zod-openapi";

export const RestaurantSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  heroImages: z.array(z.string()),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  website: z.string().url().nullable(),
  hours: z.record(z.any()).nullable(),
  socialLinks: z.record(z.string()).nullable(),
  status: z.enum(["active", "inactive"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateRestaurantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
});

export const UpdateRestaurantSchema = CreateRestaurantSchema.partial();
```

**File: `backend/src/schemas/menu.ts`**
```typescript
import { z } from "@hono/zod-openapi";

export const MenuSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  heroImageUrl: z.string().nullable(),
  themeConfig: z.record(z.any()),
  status: z.enum(["active", "inactive", "draft"]),
  availability: z.record(z.any()).nullable(),
  displayOrder: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateMenuSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  themeConfig: z.record(z.any()).optional(),
  status: z.enum(["active", "inactive", "draft"]).default("draft"),
  availability: z.record(z.any()).optional(),
  displayOrder: z.number().default(0),
});

export const UpdateMenuSchema = CreateMenuSchema.partial();
```

**File: `backend/src/schemas/item.ts`**
```typescript
import { z } from "@hono/zod-openapi";

export const MenuItemSchema = z.object({
  id: z.string().uuid(),
  menuId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.string(), // Decimal as string
  currency: z.string(),
  images: z.array(z.string()),
  section: z.string().nullable(),
  displayOrder: z.number(),
  status: z.enum(["available", "sold_out", "hidden"]),
  tags: z.array(z.string()),
  allergens: z.record(z.any()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateMenuItemSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().default("USD"),
  section: z.string().optional(),
  displayOrder: z.number().default(0),
  status: z.enum(["available", "sold_out", "hidden"]).default("available"),
  tags: z.array(z.string()).default([]),
  allergens: z.record(z.any()).optional(),
});

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial();
```

**Tasks for Claude Code:**
1. Create similar schemas for reviews, saved orders, etc.
2. Next step: Implement route handlers

---

## Phase 3: API Routes Implementation (Week 2-3)

### Step 3.1: Restaurant Routes

**File: `backend/src/routes/restaurants.ts`**
```typescript
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { db } from "../db";
import { restaurants, restaurantMaintainers } from "../db/schema";
import { requireAuth, requireMaintainer, requireOwner } from "../middleware/auth";
import { RestaurantSchema, CreateRestaurantSchema, UpdateRestaurantSchema } from "../schemas/restaurant";
import { eq } from "drizzle-orm";

const app = new OpenAPIHono();

// List all restaurants
const listRoute = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            restaurants: z.array(RestaurantSchema),
            total: z.number(),
          }),
        },
      },
      description: "List of restaurants",
    },
  },
});

app.openapi(listRoute, async (c) => {
  const allRestaurants = await db.query.restaurants.findMany({
    where: eq(restaurants.status, "active"),
  });

  return c.json({
    restaurants: allRestaurants,
    total: allRestaurants.length,
  });
});

// Get restaurant by slug
const getRoute = createRoute({
  method: "get",
  path: "/{slug}",
  request: {
    params: z.object({
      slug: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: RestaurantSchema,
        },
      },
      description: "Restaurant details",
    },
    404: {
      description: "Restaurant not found",
    },
  },
});

app.openapi(getRoute, async (c) => {
  const { slug } = c.req.valid("param");
  
  const restaurant = await db.query.restaurants.findFirst({
    where: eq(restaurants.slug, slug),
  });

  if (!restaurant) {
    return c.json({ error: "Restaurant not found" }, 404);
  }

  return c.json(restaurant);
});

// Create restaurant
const createRoute = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateRestaurantSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          
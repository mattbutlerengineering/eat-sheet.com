import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { db } from '../db/index.js';
import { restaurants, restaurantMaintainers } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import {
  restaurantSchema,
  createRestaurantSchema,
  updateRestaurantSchema,
  restaurantSlugParamSchema,
  restaurantIdParamSchema,
} from '../schemas/restaurant.js';
import { requireAuth } from '../middleware/auth.js';

const app = new OpenAPIHono();

// GET /restaurants - List all restaurants
const listRestaurantsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['restaurants'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(restaurantSchema),
          }),
        },
      },
      description: 'List of restaurants',
    },
  },
});

app.openapi(listRestaurantsRoute, async (c): Promise<any> => {
  const data = await db.select().from(restaurants).where(eq(restaurants.isActive, true));
  return c.json({ data });
});

// GET /restaurants/:slug - Get restaurant by slug
const getRestaurantRoute = createRoute({
  method: 'get',
  path: '/{slug}',
  tags: ['restaurants'],
  request: {
    params: restaurantSlugParamSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: restaurantSchema,
          }),
        },
      },
      description: 'Restaurant details',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Restaurant not found',
    },
  },
});

app.openapi(getRestaurantRoute, async (c): Promise<any> => {
  const { slug } = c.req.valid('param');

  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, slug))
    .limit(1);

  if (!restaurant) {
    return c.json({ error: 'Restaurant not found' }, 404);
  }

  return c.json({ data: restaurant });
});

// POST /restaurants - Create restaurant (requires auth - will add later)
const createRestaurantRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['restaurants'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createRestaurantSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            data: restaurantSchema,
          }),
        },
      },
      description: 'Restaurant created',
    },
    400: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Invalid request',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Unauthorized',
    },
    409: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Restaurant with this slug already exists',
    },
  },
});

app.openapi(createRestaurantRoute, async (c): Promise<any> => {
  // Check auth
  const authResult = await requireAuth(c, async () => {});
  if (authResult) return authResult;

  const body = c.req.valid('json');
  const user = c.get('user');

  // Check if slug already exists
  const [existing] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, body.slug))
    .limit(1);

  if (existing) {
    return c.json({ error: 'Restaurant with this slug already exists' }, 409);
  }

  // Create restaurant and make user the owner in a transaction
  const result = await db.transaction(async (tx) => {
    const [restaurant] = await tx
      .insert(restaurants)
      .values(body)
      .returning();

    // Make the creator the owner
    await tx.insert(restaurantMaintainers).values({
      restaurantId: restaurant.id,
      userId: user.id,
      role: 'owner',
    });

    return restaurant;
  });

  return c.json({ data: result }, 201);
});

// PATCH /restaurants/:id - Update restaurant (requires auth - will add later)
const updateRestaurantRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['restaurants'],
  request: {
    params: restaurantIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: updateRestaurantSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: restaurantSchema,
          }),
        },
      },
      description: 'Restaurant updated',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Unauthorized',
    },
    403: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Forbidden',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Restaurant not found',
    },
  },
});

app.openapi(updateRestaurantRoute, async (c): Promise<any> => {
  // Check auth
  const authResult = await requireAuth(c, async () => {});
  if (authResult) return authResult;

  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  const user = c.get('user');

  // Check if user is a maintainer of this restaurant
  const [maintainer] = await db
    .select()
    .from(restaurantMaintainers)
    .where(and(eq(restaurantMaintainers.restaurantId, id), eq(restaurantMaintainers.userId, user.id)))
    .limit(1);

  if (!maintainer) {
    return c.json({ error: 'Forbidden: You are not a maintainer of this restaurant' }, 403);
  }

  const [restaurant] = await db
    .update(restaurants)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(restaurants.id, id))
    .returning();

  if (!restaurant) {
    return c.json({ error: 'Restaurant not found' }, 404);
  }

  return c.json({ data: restaurant });
});

// DELETE /restaurants/:id - Delete restaurant (requires auth - will add later)
const deleteRestaurantRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['restaurants'],
  request: {
    params: restaurantIdParamSchema,
  },
  responses: {
    204: {
      description: 'Restaurant deleted',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Restaurant not found',
    },
  },
});

app.openapi(deleteRestaurantRoute, async (c): Promise<any> => {
  // Check auth
  const authResult = await requireAuth(c, async () => {});
  if (authResult) return authResult;

  const { id } = c.req.valid('param');
  const user = c.get('user');

  // Check if user is the owner of this restaurant
  const [maintainer] = await db
    .select()
    .from(restaurantMaintainers)
    .where(and(eq(restaurantMaintainers.restaurantId, id), eq(restaurantMaintainers.userId, user.id)))
    .limit(1);

  if (!maintainer || maintainer.role !== 'owner') {
    return c.json({ error: 'Forbidden: Only owners can delete restaurants' }, 403);
  }

  const result = await db
    .delete(restaurants)
    .where(eq(restaurants.id, id))
    .returning();

  if (result.length === 0) {
    return c.json({ error: 'Restaurant not found' }, 404);
  }

  return c.body(null, 204);
});

export default app;

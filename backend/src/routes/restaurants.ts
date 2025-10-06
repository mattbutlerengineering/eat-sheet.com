import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { db } from '../db/index.js';
import { restaurants } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  restaurantSchema,
  createRestaurantSchema,
  updateRestaurantSchema,
  restaurantSlugParamSchema,
  restaurantIdParamSchema,
} from '../schemas/restaurant.js';

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

app.openapi(listRestaurantsRoute, async (c) => {
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

app.openapi(getRestaurantRoute, async (c) => {
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

app.openapi(createRestaurantRoute, async (c) => {
  const body = c.req.valid('json');

  // Check if slug already exists
  const [existing] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, body.slug))
    .limit(1);

  if (existing) {
    return c.json({ error: 'Restaurant with this slug already exists' }, 409);
  }

  const [restaurant] = await db
    .insert(restaurants)
    .values(body)
    .returning();

  return c.json({ data: restaurant }, 201);
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

app.openapi(updateRestaurantRoute, async (c) => {
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

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

app.openapi(deleteRestaurantRoute, async (c) => {
  const { id } = c.req.valid('param');

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

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { db } from '../db/index.js';
import { menus, restaurants } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import {
  menuSchema,
  createMenuSchema,
  updateMenuSchema,
  menuIdParamSchema,
} from '../schemas/menu.js';

const app = new OpenAPIHono();

// GET /restaurants/:restaurantId/menus - List menus for a restaurant
const listMenusRoute = createRoute({
  method: 'get',
  path: '/:restaurantId/menus',
  tags: ['menus'],
  request: {
    params: z.object({
      restaurantId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(menuSchema),
          }),
        },
      },
      description: 'List of menus',
    },
  },
});

app.openapi(listMenusRoute, async (c) => {
  const { restaurantId } = c.req.valid('param');

  const data = await db
    .select()
    .from(menus)
    .where(eq(menus.restaurantId, restaurantId))
    .orderBy(menus.displayOrder);

  return c.json({ data });
});

// GET /restaurants/:restaurantSlug/menus/:menuSlug - Get menu by slug
const getMenuBySlugRoute = createRoute({
  method: 'get',
  path: '/:restaurantSlug/menus/:menuSlug',
  tags: ['menus'],
  request: {
    params: z.object({
      restaurantSlug: z.string(),
      menuSlug: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: menuSchema,
          }),
        },
      },
      description: 'Menu details',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Menu not found',
    },
  },
});

app.openapi(getMenuBySlugRoute, async (c) => {
  const { restaurantSlug, menuSlug } = c.req.valid('param');

  // First get restaurant by slug
  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, restaurantSlug))
    .limit(1);

  if (!restaurant) {
    return c.json({ error: 'Restaurant not found' }, 404);
  }

  // Then get menu by slug and restaurant ID
  const [menu] = await db
    .select()
    .from(menus)
    .where(and(eq(menus.restaurantId, restaurant.id), eq(menus.slug, menuSlug)))
    .limit(1);

  if (!menu) {
    return c.json({ error: 'Menu not found' }, 404);
  }

  return c.json({ data: menu });
});

// POST /restaurants/:restaurantId/menus - Create menu
const createMenuRoute = createRoute({
  method: 'post',
  path: '/:restaurantId/menus',
  tags: ['menus'],
  request: {
    params: z.object({
      restaurantId: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: createMenuSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            data: menuSchema,
          }),
        },
      },
      description: 'Menu created',
    },
    409: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Menu with this slug already exists for this restaurant',
    },
  },
});

app.openapi(createMenuRoute, async (c) => {
  const { restaurantId } = c.req.valid('param');
  const body = c.req.valid('json');

  // Check if slug already exists for this restaurant
  const [existing] = await db
    .select()
    .from(menus)
    .where(and(eq(menus.restaurantId, restaurantId), eq(menus.slug, body.slug)))
    .limit(1);

  if (existing) {
    return c.json({ error: 'Menu with this slug already exists for this restaurant' }, 409);
  }

  const [menu] = await db
    .insert(menus)
    .values({
      ...body,
      restaurantId,
    })
    .returning();

  return c.json({ data: menu }, 201);
});

// PATCH /menus/:id - Update menu
const updateMenuRoute = createRoute({
  method: 'patch',
  path: '/:id',
  tags: ['menus'],
  request: {
    params: menuIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: updateMenuSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: menuSchema,
          }),
        },
      },
      description: 'Menu updated',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Menu not found',
    },
  },
});

app.openapi(updateMenuRoute, async (c) => {
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  const [menu] = await db
    .update(menus)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(menus.id, id))
    .returning();

  if (!menu) {
    return c.json({ error: 'Menu not found' }, 404);
  }

  return c.json({ data: menu });
});

// DELETE /menus/:id - Delete menu
const deleteMenuRoute = createRoute({
  method: 'delete',
  path: '/:id',
  tags: ['menus'],
  request: {
    params: menuIdParamSchema,
  },
  responses: {
    204: {
      description: 'Menu deleted',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Menu not found',
    },
  },
});

app.openapi(deleteMenuRoute, async (c) => {
  const { id } = c.req.valid('param');

  const result = await db.delete(menus).where(eq(menus.id, id)).returning();

  if (result.length === 0) {
    return c.json({ error: 'Menu not found' }, 404);
  }

  return c.body(null, 204);
});

export default app;

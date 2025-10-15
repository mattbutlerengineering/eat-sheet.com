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
import QRCode from 'qrcode';

const app = new OpenAPIHono();

// GET /restaurants/:restaurantSlugOrId/menus - List menus for a restaurant (by slug or UUID)
const listMenusRoute = createRoute({
  method: 'get',
  path: '/:restaurantSlugOrId/menus',
  tags: ['menus'],
  request: {
    params: z.object({
      restaurantSlugOrId: z.string(),
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

app.openapi(listMenusRoute, async (c): Promise<any> => {
  const { restaurantSlugOrId } = c.req.valid('param');

  // Try to get restaurant by UUID or slug
  let restaurant;

  // Check if it's a UUID format
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantSlugOrId);

  if (isUuid) {
    [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantSlugOrId))
      .limit(1);
  } else {
    [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.slug, restaurantSlugOrId))
      .limit(1);
  }

  if (!restaurant) {
    return c.json({ error: 'Restaurant not found' }, 404);
  }

  const data = await db
    .select()
    .from(menus)
    .where(eq(menus.restaurantId, restaurant.id))
    .orderBy(menus.displayOrder);

  return c.json({ data }, 200);
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

app.openapi(getMenuBySlugRoute, async (c): Promise<any> => {
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

app.openapi(createMenuRoute, async (c): Promise<any> => {
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

app.openapi(updateMenuRoute, async (c): Promise<any> => {
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

app.openapi(deleteMenuRoute, async (c): Promise<any> => {
  const { id } = c.req.valid('param');

  const result = await db.delete(menus).where(eq(menus.id, id)).returning();

  if (result.length === 0) {
    return c.json({ error: 'Menu not found' }, 404);
  }

  return c.body(null, 204);
});

// GET /menus/:id/qr-code - Generate QR code for menu
const generateQRCodeRoute = createRoute({
  method: 'get',
  path: '/:id/qr-code',
  tags: ['menus'],
  request: {
    params: menuIdParamSchema,
    query: z.object({
      format: z.enum(['png', 'svg']).optional().default('png'),
      size: z.coerce.number().int().min(100).max(1000).optional().default(300),
    }),
  },
  responses: {
    200: {
      content: {
        'image/png': {
          schema: z.instanceof(Buffer),
        },
        'image/svg+xml': {
          schema: z.string(),
        },
      },
      description: 'QR code generated successfully',
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

app.openapi(generateQRCodeRoute, async (c): Promise<any> => {
  const { id } = c.req.valid('param');
  const { format, size } = c.req.valid('query');

  // Get menu and restaurant info to build URL
  const [menu] = await db
    .select({
      menu: menus,
      restaurant: restaurants,
    })
    .from(menus)
    .innerJoin(restaurants, eq(menus.restaurantId, restaurants.id))
    .where(eq(menus.id, id))
    .limit(1);

  if (!menu) {
    return c.json({ error: 'Menu not found' }, 404);
  }

  // Build the menu URL
  const baseUrl = process.env.FRONTEND_URL || 'https://eat-sheet.com';
  const menuUrl = `${baseUrl}/${menu.restaurant.slug}/${menu.menu.slug}`;

  try {
    if (format === 'svg') {
      // Generate SVG QR code
      const svg = await QRCode.toString(menuUrl, {
        type: 'svg',
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return c.body(svg, 200, {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `inline; filename="menu-${menu.menu.slug}-qr.svg"`,
      });
    } else {
      // Generate PNG QR code
      const png = await QRCode.toBuffer(menuUrl, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return c.body(new Uint8Array(png), 200, {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="menu-${menu.menu.slug}-qr.png"`,
      });
    }
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    return c.json(
      {
        error: 'Failed to generate QR code',
      },
      500
    );
  }
});

export default app;

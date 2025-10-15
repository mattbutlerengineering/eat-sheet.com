import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { db } from '../db/index.js';
import { menuItems } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  menuItemSchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  menuItemIdParamSchema,
} from '../schemas/menuItem.js';

const app = new OpenAPIHono();

// GET /menus/:menuId/items - List items for a menu
const listMenuItemsRoute = createRoute({
  method: 'get',
  path: '/:menuId/items',
  tags: ['menu-items'],
  request: {
    params: z.object({
      menuId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(menuItemSchema),
          }),
        },
      },
      description: 'List of menu items',
    },
  },
});

app.openapi(listMenuItemsRoute, async (c): Promise<any> => {
  const { menuId } = c.req.valid('param');

  const data = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.menuId, menuId))
    .orderBy(menuItems.displayOrder);

  return c.json({ data });
});

// GET /items/:id - Get menu item by ID
const getMenuItemRoute = createRoute({
  method: 'get',
  path: '/:id',
  tags: ['menu-items'],
  request: {
    params: menuItemIdParamSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: menuItemSchema,
          }),
        },
      },
      description: 'Menu item details',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Menu item not found',
    },
  },
});

app.openapi(getMenuItemRoute, async (c): Promise<any> => {
  const { id } = c.req.valid('param');

  const [item] = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.id, id))
    .limit(1);

  if (!item) {
    return c.json({ error: 'Menu item not found' }, 404);
  }

  return c.json({ data: item });
});

// POST /menus/:menuId/items - Create menu item
const createMenuItemRoute = createRoute({
  method: 'post',
  path: '/:menuId/items',
  tags: ['menu-items'],
  request: {
    params: z.object({
      menuId: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: createMenuItemSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            data: menuItemSchema,
          }),
        },
      },
      description: 'Menu item created',
    },
  },
});

app.openapi(createMenuItemRoute, async (c): Promise<any> => {
  const { menuId } = c.req.valid('param');
  const body = c.req.valid('json');

  const [item] = await db
    .insert(menuItems)
    .values({
      ...body,
      menuId,
    })
    .returning();

  return c.json({ data: item }, 201);
});

// PATCH /items/:id - Update menu item
const updateMenuItemRoute = createRoute({
  method: 'patch',
  path: '/:id',
  tags: ['menu-items'],
  request: {
    params: menuItemIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: updateMenuItemSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: menuItemSchema,
          }),
        },
      },
      description: 'Menu item updated',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Menu item not found',
    },
  },
});

app.openapi(updateMenuItemRoute, async (c): Promise<any> => {
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  const [item] = await db
    .update(menuItems)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(menuItems.id, id))
    .returning();

  if (!item) {
    return c.json({ error: 'Menu item not found' }, 404);
  }

  return c.json({ data: item });
});

// DELETE /items/:id - Delete menu item
const deleteMenuItemRoute = createRoute({
  method: 'delete',
  path: '/:id',
  tags: ['menu-items'],
  request: {
    params: menuItemIdParamSchema,
  },
  responses: {
    204: {
      description: 'Menu item deleted',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Menu item not found',
    },
  },
});

app.openapi(deleteMenuItemRoute, async (c): Promise<any> => {
  const { id } = c.req.valid('param');

  const result = await db.delete(menuItems).where(eq(menuItems.id, id)).returning();

  if (result.length === 0) {
    return c.json({ error: 'Menu item not found' }, 404);
  }

  return c.body(null, 204);
});

export default app;
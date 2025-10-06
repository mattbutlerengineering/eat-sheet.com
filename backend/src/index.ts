import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// Create main app
const app = new OpenAPIHono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://eat-sheet.com', 'https://www.eat-sheet.com']
    : '*',
  credentials: true,
}));

// Import routes
import restaurantsRoutes from './routes/restaurants.js';

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.route('/api/restaurants', restaurantsRoutes);

// OpenAPI documentation
app.doc('/api/openapi.json', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Eat-Sheet API',
    description: 'Digital menu platform API for restaurants',
  },
  servers: [
    {
      url: process.env.API_URL || 'http://localhost:3000',
      description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
    },
  ],
});

// Export for Lambda or local server
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📚 API docs at http://localhost:${port}/api/openapi.json`);

  // Only start server if running directly (not imported)
  if (import.meta.url === `file://${process.argv[1]}`) {
    const { serve } = await import('@hono/node-server');
    serve({
      fetch: app.fetch,
      port: Number(port),
    });
  }
}
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import 'dotenv/config';

import type { HonoEnv } from './types/hono';

const app = new Hono<HonoEnv>();

// Middleware
app.use(logger());
app.use(cors());
app.use(prettyJSON());

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: 'Installer Scheduling API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
    },
  });
});

// API routes placeholder
app.get('/api', (c) => {
  return c.json({
    message: 'API v1',
    routes: {
      installers: '/api/installers',
      locations: '/api/locations',
      bookings: '/api/bookings',
      chat: '/api/chat',
    },
  });
});

// Error handling
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json(
    {
      error: err.message || 'Internal server error',
      status: 'error',
    },
    { status: 500 }
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not found',
      path: c.req.path,
    },
    { status: 404 }
  );
});

// Start server
const port = parseInt(process.env.PORT || '3000', 10);

export default {
  port,
  fetch: app.fetch,
};

console.log(`Server running on http://localhost:${port}`);

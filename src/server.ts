import { swaggerUI } from '@hono/swagger-ui';
import { Hono } from 'hono';
import { env } from './config/env';
import { container } from './infrastructure/composition-root';
import { connectToDatabase, isDatabaseConnected } from './infrastructure/db/connection';
import { openApiSpec } from './infrastructure/web/openapi';
import type { AppEnv } from './infrastructure/web/types';

const app = new Hono<AppEnv>();

app.route('/auth', container.routes.auth);
app.route('/rates', container.routes.rates);
app.route('/exchange-requests', container.routes.exchangeRequests);

// Documentación con OpenAPI + Swagger UI
app.get('/openapi.json', (c) => c.json(openApiSpec));
app.get('/docs', swaggerUI({ url: '/openapi.json' }));

// GET /health - liveness + chequeo de conexión a Mongo
app.get('/health', (c) => {
  const dbConnected = isDatabaseConnected();
  return c.json(
    {
      status: dbConnected ? 'ok' : 'degraded',
      db: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    },
    dbConnected ? 200 : 503,
  );
});

try {
  await connectToDatabase();
  console.log('✓ Connected to MongoDB');
  await container.useCases.seedAdminUser.execute(env.ADMIN_SEED_EMAIL, env.ADMIN_SEED_PASSWORD);
} catch (error) {
  // ! si no hay DB al arrancar, no tiene sentido levantar el server
  console.error('✗ Failed to connect to MongoDB:', error);
  process.exit(1);
}

console.log(`› Server ready on http://localhost:${env.PORT}`);

// WHY: Bun detecta este default export (fetch + port) y llama a Bun.serve()
export default {
  port: env.PORT,
  fetch: app.fetch,
};

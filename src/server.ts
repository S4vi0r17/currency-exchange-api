import { Hono } from 'hono';
import { env } from './config/env';
import { connectToDatabase, isDatabaseConnected } from './db';

const app = new Hono();

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

import type { Context, Next } from 'hono';
import type { AppEnv } from '../types/hono';

// NOTE: debe correr después de authMiddleware (necesita c.get('userRole') ya seteado)
export async function adminOnlyMiddleware(c: Context<AppEnv>, next: Next) {
  if (c.get('userRole') !== 'admin') {
    return c.json({ error: 'Admin role required' }, 403);
  }

  await next();
}

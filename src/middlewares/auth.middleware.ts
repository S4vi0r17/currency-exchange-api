import type { Context, Next } from 'hono';
import { verifyAuthToken } from '../security/token';
import type { AppEnv } from '../types/hono';

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = await verifyAuthToken(token);
    c.set('userId', payload.sub);
    c.set('userRole', payload.role);
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  await next();
}

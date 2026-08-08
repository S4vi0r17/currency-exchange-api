import type { Context, MiddlewareHandler, Next } from 'hono';
import type { TokenService } from '@/domain/ports/token-service.port';
import type { AppEnv } from '../types';

// WHY: el middleware necesita el TokenService concreto que arma el composition root
export function createAuthMiddleware(tokenService: TokenService): MiddlewareHandler<AppEnv> {
  return async (c: Context<AppEnv>, next: Next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const token = header.slice('Bearer '.length);

    try {
      const payload = await tokenService.verify(token);
      c.set('userId', payload.sub);
      c.set('userRole', payload.role);
    } catch {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    await next();
  };
}

import { Hono } from 'hono';
import { z } from 'zod';
import type { LoginUserUseCase } from '@/application/use-cases/login-user.use-case';
import type { RegisterUserUseCase } from '@/application/use-cases/register-user.use-case';
import { InvalidCredentialsError, UserAlreadyExistsError } from '@/domain/errors/domain-errors';

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export interface AuthUseCases {
  registerUser: RegisterUserUseCase;
  loginUser: LoginUserUseCase;
}

// WHY: fábrica -- la ruta solo conoce los casos de uso (por su tipo), nunca un
// adapter concreto. Es el composition root el que decide qué implementación usar.
export function createAuthRoutes(useCases: AuthUseCases) {
  const authRoutes = new Hono();

  authRoutes.post('/register', async (c) => {
    const parsed = registerSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: 'Validation error', details: z.treeifyError(parsed.error) }, 400);
    }

    try {
      const { user, token } = await useCases.registerUser.execute(parsed.data);
      return c.json({ id: user.id, email: user.email, token }, 201);
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        return c.json({ error: error.message }, 409);
      }
      throw error;
    }
  });

  authRoutes.post('/login', async (c) => {
    const parsed = loginSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: 'Validation error', details: z.treeifyError(parsed.error) }, 400);
    }

    try {
      const { token } = await useCases.loginUser.execute(parsed.data);
      return c.json({ token });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        return c.json({ error: error.message }, 401);
      }
      throw error;
    }
  });

  return authRoutes;
}

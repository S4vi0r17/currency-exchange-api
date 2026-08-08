import { Hono } from 'hono';
import { z } from 'zod';
import { sendWelcomeEmail } from '../email/mailer';
import { UserModel } from '../models/user.model';
import { hashPassword, verifyPassword } from '../security/password';
import { signAuthToken } from '../security/token';

export const authRoutes = new Hono();

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

authRoutes.post('/register', async (c) => {
  const parsed = registerSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: z.treeifyError(parsed.error) }, 400);
  }
  const { email, password } = parsed.data;

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    return c.json({ error: 'Email already registered' }, 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({ email, passwordHash });

  // WHY: no bloqueamos el registro si el envío de correo falla
  sendWelcomeEmail(email).catch((error: unknown) => {
    console.error('✗ Failed to send welcome email:', error);
  });

  const token = await signAuthToken({ sub: user._id.toString(), role: user.role });

  return c.json({ id: user._id.toString(), email: user.email, token }, 201);
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

authRoutes.post('/login', async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: z.treeifyError(parsed.error) }, 400);
  }
  const { email, password } = parsed.data;

  const user = await UserModel.findOne({ email });

  // SECURITY: mismo mensaje exista o no el usuario, para no filtrar qué emails están registrados.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const token = await signAuthToken({ sub: user._id.toString(), role: user.role });

  return c.json({ token });
});

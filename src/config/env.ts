import { z } from 'zod';

// WHY: validar las env vars al arrancar (fail fast)
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  // SECURITY: solo lectura, no requiere credenciales
  EXTERNAL_RATES_URL: z.url(),

  // NOTE: llaves en formato JWK (JSON)
  JWT_PRIVATE_KEY: z.string().min(1, 'JWT_PRIVATE_KEY is required'),
  JWT_PUBLIC_KEY: z.string().min(1, 'JWT_PUBLIC_KEY is required'),
  JWT_EXPIRES_IN: z.string().default('1h'),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_FROM: z.string().default('Currency Exchange <no-reply@currency-exchange.local>'),

  // NOTE: adapter alternativo de email -- si está seteado, se usa Resend en vez de Mailhog/SMTP
  RESEND_API_KEY: z.string().optional(),

  // NOTE: se siembra el usuario al arrancar
  ADMIN_SEED_EMAIL: z.email(),
  ADMIN_SEED_PASSWORD: z.string().min(8),
});

export const env = envSchema.parse(process.env);

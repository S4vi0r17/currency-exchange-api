import { z } from 'zod';

// WHY: validar las env vars al arrancar (fail fast)
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
});

export const env = envSchema.parse(process.env);

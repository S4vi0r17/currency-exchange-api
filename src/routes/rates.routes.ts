import { Hono } from 'hono';
import { z } from 'zod';
import { adminOnlyMiddleware } from '../middlewares/admin.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { ExchangeRateModel, type RateType } from '../models/exchange-rate.model';
import type { AppEnv } from '../types/hono';

export const rateRoutes = new Hono<AppEnv>();

rateRoutes.use('*', authMiddleware, adminOnlyMiddleware);

// NOTE: se mapea los nombres de español a inglés y viceversa para que la API sea consistente
const RATE_TYPE_TO_DOMAIN: Record<string, RateType> = { compra: 'purchase', venta: 'sale' };
const RATE_TYPE_TO_PUBLIC: Record<RateType, string> = { purchase: 'compra', sale: 'venta' };

const createRateSchema = z.object({
  tipo_de_cambio: z.enum(['compra', 'venta']),
  tasa: z.number().positive(),
});

rateRoutes.post('/', async (c) => {
  const parsed = createRateSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 400);
  }

  const type = RATE_TYPE_TO_DOMAIN[parsed.data.tipo_de_cambio];

  // WHY: solo debe estar activa 1 tasa de compra y de venta a la vez
  await ExchangeRateModel.updateMany({ type, isActive: true }, { isActive: false });

  const rate = await ExchangeRateModel.create({
    type,
    value: parsed.data.tasa,
    isActive: true,
    createdBy: c.get('userId'),
  });

  return c.json(
    {
      id: rate._id.toString(),
      tipo_de_cambio: RATE_TYPE_TO_PUBLIC[rate.type],
      tasa: rate.value,
      activa: rate.isActive,
    },
    201,
  );
});

rateRoutes.get('/', async (c) => {
  const rates = await ExchangeRateModel.find().sort({ createdAt: -1 });

  return c.json(
    rates.map((rate) => ({
      id: rate._id.toString(),
      tipo_de_cambio: RATE_TYPE_TO_PUBLIC[rate.type],
      tasa: rate.value,
      activa: rate.isActive,
    })),
  );
});

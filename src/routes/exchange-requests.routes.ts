import { Hono } from 'hono';
import { z } from 'zod';
import { fetchCurrentRates } from '../external/rate-provider';
import { authMiddleware } from '../middlewares/auth.middleware';
import type { RateType } from '../models/exchange-rate.model';
import { ExchangeRequestModel } from '../models/exchange-request.model';
import type { AppEnv } from '../types/hono';
import { roundToCents } from '../utils/money';

export const exchangeRequestRoutes = new Hono<AppEnv>();

exchangeRequestRoutes.use('*', authMiddleware);

const RATE_TYPE_TO_DOMAIN: Record<string, RateType> = { compra: 'purchase', venta: 'sale' };

const createExchangeRequestSchema = z.object({
  tipo_de_cambio: z.enum(['compra', 'venta']),
  monto_enviar: z.number().positive(),
});

exchangeRequestRoutes.post('/', async (c) => {
  const parsed = createExchangeRequestSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 400);
  }

  const type = RATE_TYPE_TO_DOMAIN[parsed.data.tipo_de_cambio];
  const amountSent = parsed.data.monto_enviar;

  let rates: Awaited<ReturnType<typeof fetchCurrentRates>>;
  try {
    rates = await fetchCurrentRates();
  } catch (error) {
    console.error('✗ Failed to fetch external rates:', error);
    return c.json({ error: 'Exchange rate provider is unavailable, try again later' }, 502);
  }

  // WHY: fórmulas del enunciado -> compra multiplica por purchase_price, venta divide por sale_price
  const amountReceived = roundToCents(
    type === 'purchase' ? amountSent * rates.purchasePrice : amountSent / rates.salePrice,
  );

  const request = await ExchangeRequestModel.create({
    userId: c.get('userId'),
    type,
    amountSent,
    amountReceived,
    rateUsed: rates,
  });

  return c.json(
    {
      id: request._id.toString(),
      tipo_de_cambio: parsed.data.tipo_de_cambio,
      monto_enviar: request.amountSent,
      monto_recibir: request.amountReceived,
    },
    201,
  );
});

import { Hono } from 'hono';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { fetchCurrentRates } from '../external/rate-provider';
import { authMiddleware } from '../middlewares/auth.middleware';
import type { RateType } from '../models/exchange-rate.model';
import {
  type ExchangeRequestDocument,
  ExchangeRequestModel,
} from '../models/exchange-request.model';
import type { AppEnv } from '../types/hono';
import { roundToCents } from '../utils/money';

export const exchangeRequestRoutes = new Hono<AppEnv>();

exchangeRequestRoutes.use('*', authMiddleware);

const RATE_TYPE_TO_DOMAIN: Record<string, RateType> = { compra: 'purchase', venta: 'sale' };
const RATE_TYPE_TO_PUBLIC: Record<RateType, string> = { purchase: 'compra', sale: 'venta' };

// NOTE: mapper único para no repetir la forma pública en create/list/detail
function toPublicExchangeRequest(doc: ExchangeRequestDocument & { _id: { toString(): string } }) {
  return {
    id: doc._id.toString(),
    tipo_de_cambio: RATE_TYPE_TO_PUBLIC[doc.type],
    monto_enviar: doc.amountSent,
    monto_recibir: doc.amountReceived,
    creada_en: doc.createdAt,
  };
}

const createExchangeRequestSchema = z.object({
  tipo_de_cambio: z.enum(['compra', 'venta']),
  monto_enviar: z.number().positive(),
});

exchangeRequestRoutes.post('/', async (c) => {
  const parsed = createExchangeRequestSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: z.treeifyError(parsed.error) }, 400);
  }

  const type = RATE_TYPE_TO_DOMAIN[parsed.data.tipo_de_cambio];
  // NOTE: no confiamos en que el cliente lo mande ya redondeado
  const amountSent = roundToCents(parsed.data.monto_enviar);

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

  return c.json(toPublicExchangeRequest(request), 201);
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(50).default(10),
});

exchangeRequestRoutes.get('/', async (c) => {
  const parsed = listQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: z.treeifyError(parsed.error) }, 400);
  }
  const { page, perPage } = parsed.data;
  const userId = c.get('userId');

  // SECURITY: siempre filtrado por userId -- un cliente solo ve sus propias solicitudes
  const [items, total] = await Promise.all([
    ExchangeRequestModel.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage),
    ExchangeRequestModel.countDocuments({ userId }),
  ]);

  return c.json({
    data: items.map(toPublicExchangeRequest),
    pagination: { page, perPage, total, total_paginas: Math.ceil(total / perPage) },
  });
});

exchangeRequestRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  if (!isValidObjectId(id)) {
    return c.json({ error: 'Exchange request not found' }, 404);
  }

  // SECURITY: 404 (no 403) no confirmamos la existencia de solicitudes ajenas
  const request = await ExchangeRequestModel.findOne({ _id: id, userId: c.get('userId') });
  if (!request) {
    return c.json({ error: 'Exchange request not found' }, 404);
  }

  return c.json(toPublicExchangeRequest(request));
});

exchangeRequestRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  if (!isValidObjectId(id)) {
    return c.json({ error: 'Exchange request not found' }, 404);
  }

  const result = await ExchangeRequestModel.deleteOne({ _id: id, userId: c.get('userId') });
  if (result.deletedCount === 0) {
    return c.json({ error: 'Exchange request not found' }, 404);
  }

  return c.body(null, 204);
});

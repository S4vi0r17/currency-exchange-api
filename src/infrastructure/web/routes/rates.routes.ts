import { Hono, type MiddlewareHandler } from 'hono';
import { z } from 'zod';
import type { CreateExchangeRateUseCase } from '../../../application/use-cases/create-exchange-rate.use-case';
import type { ListExchangeRatesUseCase } from '../../../application/use-cases/list-exchange-rates.use-case';
import type { ExchangeRate, RateType } from '../../../domain/entities/exchange-rate.entity';
import { adminOnlyMiddleware } from '../middlewares/admin.middleware';
import type { AppEnv } from '../types';

// NOTE: el contrato público usa el vocabulario en español del enunciado
// (tipo_de_cambio: "compra"/"venta"); el dominio interno usa "purchase"/"sale".
const RATE_TYPE_TO_DOMAIN: Record<'compra' | 'venta', RateType> = {
  compra: 'purchase',
  venta: 'sale',
};
const RATE_TYPE_TO_PUBLIC: Record<RateType, string> = { purchase: 'compra', sale: 'venta' };

function toPublicRate(rate: ExchangeRate) {
  return {
    id: rate.id,
    tipo_de_cambio: RATE_TYPE_TO_PUBLIC[rate.type],
    tasa: rate.value,
    activa: rate.isActive,
  };
}

const createRateSchema = z.object({
  tipo_de_cambio: z.enum(['compra', 'venta']),
  tasa: z.number().positive(),
});

export interface RateUseCases {
  createExchangeRate: CreateExchangeRateUseCase;
  listExchangeRates: ListExchangeRatesUseCase;
}

export function createRateRoutes(deps: {
  authMiddleware: MiddlewareHandler<AppEnv>;
  useCases: RateUseCases;
}) {
  const rateRoutes = new Hono<AppEnv>();
  rateRoutes.use('*', deps.authMiddleware, adminOnlyMiddleware);

  rateRoutes.post('/', async (c) => {
    const parsed = createRateSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: 'Validation error', details: z.treeifyError(parsed.error) }, 400);
    }

    const rate = await deps.useCases.createExchangeRate.execute({
      type: RATE_TYPE_TO_DOMAIN[parsed.data.tipo_de_cambio],
      value: parsed.data.tasa,
      createdBy: c.get('userId'),
    });

    return c.json(toPublicRate(rate), 201);
  });

  rateRoutes.get('/', async (c) => {
    const rates = await deps.useCases.listExchangeRates.execute();
    return c.json(rates.map(toPublicRate));
  });

  return rateRoutes;
}

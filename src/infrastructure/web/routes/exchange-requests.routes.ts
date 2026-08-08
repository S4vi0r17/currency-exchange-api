import { Hono, type MiddlewareHandler } from 'hono';
import { z } from 'zod';
import type { CreateExchangeRequestUseCase } from '../../../application/use-cases/create-exchange-request.use-case';
import type { DeleteExchangeRequestUseCase } from '../../../application/use-cases/delete-exchange-request.use-case';
import type { GetExchangeRequestUseCase } from '../../../application/use-cases/get-exchange-request.use-case';
import type { ListExchangeRequestsUseCase } from '../../../application/use-cases/list-exchange-requests.use-case';
import type { RateType } from '../../../domain/entities/exchange-rate.entity';
import type { ExchangeRequest } from '../../../domain/entities/exchange-request.entity';
import {
  ExchangeRateProviderUnavailableError,
  ExchangeRequestNotFoundError,
} from '../../../domain/errors/domain-errors';
import type { AppEnv } from '../types';

const RATE_TYPE_TO_DOMAIN: Record<'compra' | 'venta', RateType> = {
  compra: 'purchase',
  venta: 'sale',
};
const RATE_TYPE_TO_PUBLIC: Record<RateType, string> = { purchase: 'compra', sale: 'venta' };

function toPublicExchangeRequest(request: ExchangeRequest) {
  return {
    id: request.id,
    tipo_de_cambio: RATE_TYPE_TO_PUBLIC[request.type],
    monto_enviar: request.amountSent,
    monto_recibir: request.amountReceived,
    creada_en: request.createdAt,
  };
}

const createExchangeRequestSchema = z.object({
  tipo_de_cambio: z.enum(['compra', 'venta']),
  monto_enviar: z.number().positive(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(50).default(10),
});

export interface ExchangeRequestUseCases {
  createExchangeRequest: CreateExchangeRequestUseCase;
  listExchangeRequests: ListExchangeRequestsUseCase;
  getExchangeRequest: GetExchangeRequestUseCase;
  deleteExchangeRequest: DeleteExchangeRequestUseCase;
}

export function createExchangeRequestRoutes(deps: {
  authMiddleware: MiddlewareHandler<AppEnv>;
  useCases: ExchangeRequestUseCases;
}) {
  const exchangeRequestRoutes = new Hono<AppEnv>();
  exchangeRequestRoutes.use('*', deps.authMiddleware);

  exchangeRequestRoutes.post('/', async (c) => {
    const parsed = createExchangeRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: 'Validation error', details: z.treeifyError(parsed.error) }, 400);
    }

    try {
      const request = await deps.useCases.createExchangeRequest.execute({
        userId: c.get('userId'),
        type: RATE_TYPE_TO_DOMAIN[parsed.data.tipo_de_cambio],
        amountSent: parsed.data.monto_enviar,
      });
      return c.json(toPublicExchangeRequest(request), 201);
    } catch (error) {
      if (error instanceof ExchangeRateProviderUnavailableError) {
        console.error('✗ Failed to fetch external rates:', error.cause);
        return c.json({ error: error.message }, 502);
      }
      throw error;
    }
  });

  exchangeRequestRoutes.get('/', async (c) => {
    const parsed = listQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ error: 'Validation error', details: z.treeifyError(parsed.error) }, 400);
    }
    const { page, perPage } = parsed.data;

    const { data, total } = await deps.useCases.listExchangeRequests.execute({
      userId: c.get('userId'),
      page,
      perPage,
    });

    return c.json({
      data: data.map(toPublicExchangeRequest),
      pagination: { page, perPage, total, total_paginas: Math.ceil(total / perPage) },
    });
  });

  exchangeRequestRoutes.get('/:id', async (c) => {
    try {
      const request = await deps.useCases.getExchangeRequest.execute(
        c.req.param('id'),
        c.get('userId'),
      );
      return c.json(toPublicExchangeRequest(request));
    } catch (error) {
      if (error instanceof ExchangeRequestNotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  });

  exchangeRequestRoutes.delete('/:id', async (c) => {
    try {
      await deps.useCases.deleteExchangeRequest.execute(c.req.param('id'), c.get('userId'));
      return c.body(null, 204);
    } catch (error) {
      if (error instanceof ExchangeRequestNotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  });

  return exchangeRequestRoutes;
}

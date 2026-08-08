import { z } from 'zod';
import { env } from '@/config/env';
import type { RateSnapshot } from '@/domain/entities/exchange-request.entity';
import type { RateProvider } from '@/domain/ports/rate-provider.port';
import { roundToRatePrecision } from '@/domain/value-objects/money';

// NOTE: solo mapeamos los campos que necesitamos
const externalRatesResponseSchema = z.object({
  error: z.boolean(),
  data: z.object({
    _id: z.string(),
    purchase_price: z.number(),
    sale_price: z.number(),
  }),
});

export class HttpRateProvider implements RateProvider {
  async fetchCurrentRates(): Promise<RateSnapshot> {
    const response = await fetch(env.EXTERNAL_RATES_URL);

    if (!response.ok) {
      throw new Error(`External rates API responded with status ${response.status}`);
    }

    const body = externalRatesResponseSchema.parse(await response.json());

    if (body.error) {
      throw new Error('External rates API returned an error');
    }

    // NOTE: forzamos 4 decimales al guardar (pseudo-esquema del enunciado)
    return {
      purchasePrice: roundToRatePrecision(body.data.purchase_price),
      salePrice: roundToRatePrecision(body.data.sale_price),
      sourceId: body.data._id,
    };
  }
}

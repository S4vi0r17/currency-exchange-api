import { z } from 'zod';
import { env } from '../config/env';

export interface ExternalRates {
  purchasePrice: number;
  salePrice: number;
  sourceId: string;
}

// NOTE: solo mapeamos los campos que necesitamos
const externalRatesResponseSchema = z.object({
  error: z.boolean(),
  data: z.object({
    _id: z.string(),
    purchase_price: z.number(),
    sale_price: z.number(),
  }),
});

export async function fetchCurrentRates(): Promise<ExternalRates> {
  const response = await fetch(env.EXTERNAL_RATES_URL);

  if (!response.ok) {
    throw new Error(`External rates API responded with status ${response.status}`);
  }

  const body = externalRatesResponseSchema.parse(await response.json());

  if (body.error) {
    throw new Error('External rates API returned an error');
  }

  return {
    purchasePrice: body.data.purchase_price,
    salePrice: body.data.sale_price,
    sourceId: body.data._id,
  };
}

import type { RateType } from './exchange-rate.entity';

// NOTE: snapshot de la tasa externa usada al momento de crear la solicitud
export interface RateSnapshot {
  purchasePrice: number;
  salePrice: number;
  sourceId: string;
}

export interface ExchangeRequest {
  id: string;
  userId: string;
  type: RateType;
  amountSent: number;
  amountReceived: number;
  rateUsed: RateSnapshot;
  createdAt: Date;
}

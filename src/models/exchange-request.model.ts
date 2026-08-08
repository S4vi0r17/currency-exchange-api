import { model, Schema, type Types } from 'mongoose';
import type { RateType } from './exchange-rate.model';

export interface ExchangeRequestDocument {
  userId: Types.ObjectId;
  type: RateType;
  amountSent: number;
  amountReceived: number;
  // NOTE: snapshot de la tasa externa usada al momento de crear la solicitud (HISTÓRICO).
  rateUsed: {
    purchasePrice: number;
    salePrice: number;
    sourceId: string;
  };
  createdAt?: Date;
}

const exchangeRequestSchema = new Schema<ExchangeRequestDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['purchase', 'sale'], required: true },
    amountSent: { type: Number, required: true, min: 0 },
    amountReceived: { type: Number, required: true, min: 0 },
    rateUsed: {
      purchasePrice: { type: Number, required: true },
      salePrice: { type: Number, required: true },
      sourceId: { type: String, required: true },
    },
  },
  { timestamps: true },
);

// PERF: índices para el listado paginado por usuario, ordenado por fecha
exchangeRequestSchema.index({ userId: 1, createdAt: -1 });

export const ExchangeRequestModel = model<ExchangeRequestDocument>(
  'ExchangeRequest',
  exchangeRequestSchema,
);

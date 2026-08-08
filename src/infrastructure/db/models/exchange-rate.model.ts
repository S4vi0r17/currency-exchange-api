import { model, Schema, type Types } from 'mongoose';

export type RateType = 'purchase' | 'sale';

export interface ExchangeRateDocument {
  type: RateType;
  value: number;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const exchangeRateSchema = new Schema<ExchangeRateDocument>(
  {
    type: { type: String, enum: ['purchase', 'sale'], required: true },
    value: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// PERF: índice para la consulta "la tasa activa de este tipo", que se hace seguido
exchangeRateSchema.index({ type: 1, isActive: 1 });

export const ExchangeRateModel = model<ExchangeRateDocument>('ExchangeRate', exchangeRateSchema);

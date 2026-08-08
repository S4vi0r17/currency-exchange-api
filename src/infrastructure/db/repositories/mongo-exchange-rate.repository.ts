import type { ExchangeRate, RateType } from '../../../domain/entities/exchange-rate.entity';
import type { ExchangeRateRepository } from '../../../domain/ports/exchange-rate-repository.port';
import { type ExchangeRateDocument, ExchangeRateModel } from '../models/exchange-rate.model';

function toDomain(doc: ExchangeRateDocument & { _id: { toString(): string } }): ExchangeRate {
  return {
    id: doc._id.toString(),
    type: doc.type,
    value: doc.value,
    isActive: doc.isActive,
    createdBy: doc.createdBy.toString(),
    createdAt: doc.createdAt,
  };
}

export class MongoExchangeRateRepository implements ExchangeRateRepository {
  async deactivateActiveByType(type: RateType): Promise<void> {
    // WHY: solo debe estar activa 1 tasa de compra y de venta a la vez
    await ExchangeRateModel.updateMany({ type, isActive: true }, { isActive: false });
  }

  async save(rate: Omit<ExchangeRate, 'id' | 'createdAt'>): Promise<ExchangeRate> {
    const doc = await ExchangeRateModel.create(rate);
    return toDomain(doc);
  }

  async findAll(): Promise<ExchangeRate[]> {
    const docs = await ExchangeRateModel.find().sort({ createdAt: -1 });
    return docs.map(toDomain);
  }
}

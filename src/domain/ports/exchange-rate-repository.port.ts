import type { ExchangeRate, RateType } from '../entities/exchange-rate.entity';

export interface ExchangeRateRepository {
  deactivateActiveByType(type: RateType): Promise<void>;
  save(rate: Omit<ExchangeRate, 'id' | 'createdAt'>): Promise<ExchangeRate>;
  findAll(): Promise<ExchangeRate[]>;
}

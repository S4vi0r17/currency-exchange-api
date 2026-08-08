import type { RateSnapshot } from '../entities/exchange-request.entity';

export interface RateProvider {
  fetchCurrentRates(): Promise<RateSnapshot>;
}

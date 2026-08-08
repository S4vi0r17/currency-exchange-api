import type { ExchangeRate } from '@/domain/entities/exchange-rate.entity';
import type { ExchangeRateRepository } from '@/domain/ports/exchange-rate-repository.port';

export class ListExchangeRatesUseCase {
  constructor(private readonly exchangeRateRepository: ExchangeRateRepository) {}

  async execute(): Promise<ExchangeRate[]> {
    return this.exchangeRateRepository.findAll();
  }
}

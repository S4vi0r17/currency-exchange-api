import type { ExchangeRate, RateType } from '../../domain/entities/exchange-rate.entity';
import type { ExchangeRateRepository } from '../../domain/ports/exchange-rate-repository.port';

export interface CreateExchangeRateInput {
  type: RateType;
  value: number;
  createdBy: string;
}

export class CreateExchangeRateUseCase {
  constructor(private readonly exchangeRateRepository: ExchangeRateRepository) {}

  async execute(input: CreateExchangeRateInput): Promise<ExchangeRate> {
    // WHY: solo debe estar activa 1 tasa de compra y de venta a la vez
    await this.exchangeRateRepository.deactivateActiveByType(input.type);

    return this.exchangeRateRepository.save({
      type: input.type,
      value: input.value,
      isActive: true,
      createdBy: input.createdBy,
    });
  }
}

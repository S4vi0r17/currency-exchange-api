import type { RateType } from '@/domain/entities/exchange-rate.entity';
import type { ExchangeRequest } from '@/domain/entities/exchange-request.entity';
import { ExchangeRateProviderUnavailableError } from '@/domain/errors/domain-errors';
import type { ExchangeRequestRepository } from '@/domain/ports/exchange-request-repository.port';
import type { RateProvider } from '@/domain/ports/rate-provider.port';
import { calculateAmountReceived } from '@/domain/services/exchange-calculator';
import { roundToCents } from '@/domain/value-objects/money';

export interface CreateExchangeRequestInput {
  userId: string;
  type: RateType;
  amountSent: number;
}

export class CreateExchangeRequestUseCase {
  constructor(
    private readonly exchangeRequestRepository: ExchangeRequestRepository,
    private readonly rateProvider: RateProvider,
  ) {}

  async execute(input: CreateExchangeRequestInput): Promise<ExchangeRequest> {
    // NOTE: no confiamos en que el cliente lo mande ya redondeado a 2 decimales
    const amountSent = roundToCents(input.amountSent);

    let rate: Awaited<ReturnType<RateProvider['fetchCurrentRates']>>;
    try {
      rate = await this.rateProvider.fetchCurrentRates();
    } catch (error) {
      throw new ExchangeRateProviderUnavailableError(error);
    }

    const amountReceived = calculateAmountReceived(amountSent, input.type, rate);

    return this.exchangeRequestRepository.save({
      userId: input.userId,
      type: input.type,
      amountSent,
      amountReceived,
      rateUsed: rate,
    });
  }
}

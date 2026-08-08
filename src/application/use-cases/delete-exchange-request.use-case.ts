import { ExchangeRequestNotFoundError } from '@/domain/errors/domain-errors';
import type { ExchangeRequestRepository } from '@/domain/ports/exchange-request-repository.port';

export class DeleteExchangeRequestUseCase {
  constructor(private readonly exchangeRequestRepository: ExchangeRequestRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    const deleted = await this.exchangeRequestRepository.deleteByIdAndOwner(id, userId);
    if (!deleted) {
      throw new ExchangeRequestNotFoundError();
    }
  }
}

import type { ExchangeRequest } from '@/domain/entities/exchange-request.entity';
import { ExchangeRequestNotFoundError } from '@/domain/errors/domain-errors';
import type { ExchangeRequestRepository } from '@/domain/ports/exchange-request-repository.port';

export class GetExchangeRequestUseCase {
  constructor(private readonly exchangeRequestRepository: ExchangeRequestRepository) {}

  async execute(id: string, userId: string): Promise<ExchangeRequest> {
    // SECURITY: 404 (no 403) -- no confirmamos la existencia de solicitudes ajenas
    const request = await this.exchangeRequestRepository.findByIdAndOwner(id, userId);
    if (!request) {
      throw new ExchangeRequestNotFoundError();
    }
    return request;
  }
}

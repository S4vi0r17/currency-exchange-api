import type { ExchangeRequest } from '../../domain/entities/exchange-request.entity';
import type {
  ExchangeRequestRepository,
  PaginatedResult,
} from '../../domain/ports/exchange-request-repository.port';

export interface ListExchangeRequestsInput {
  userId: string;
  page: number;
  perPage: number;
}

export class ListExchangeRequestsUseCase {
  constructor(private readonly exchangeRequestRepository: ExchangeRequestRepository) {}

  async execute(input: ListExchangeRequestsInput): Promise<PaginatedResult<ExchangeRequest>> {
    return this.exchangeRequestRepository.findByOwnerPaginated(
      input.userId,
      input.page,
      input.perPage,
    );
  }
}

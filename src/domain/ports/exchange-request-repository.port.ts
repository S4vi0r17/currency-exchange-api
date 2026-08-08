import type { ExchangeRequest } from '../entities/exchange-request.entity';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export interface ExchangeRequestRepository {
  save(request: Omit<ExchangeRequest, 'id' | 'createdAt'>): Promise<ExchangeRequest>;
  findByIdAndOwner(id: string, userId: string): Promise<ExchangeRequest | null>;
  findByOwnerPaginated(
    userId: string,
    page: number,
    perPage: number,
  ): Promise<PaginatedResult<ExchangeRequest>>;
  deleteByIdAndOwner(id: string, userId: string): Promise<boolean>;
}

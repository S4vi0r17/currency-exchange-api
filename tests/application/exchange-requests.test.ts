import { describe, expect, it } from 'bun:test';
import { CreateExchangeRequestUseCase } from '@/application/use-cases/create-exchange-request.use-case';
import { DeleteExchangeRequestUseCase } from '@/application/use-cases/delete-exchange-request.use-case';
import { GetExchangeRequestUseCase } from '@/application/use-cases/get-exchange-request.use-case';
import { ListExchangeRequestsUseCase } from '@/application/use-cases/list-exchange-requests.use-case';
import type { ExchangeRequest, RateSnapshot } from '@/domain/entities/exchange-request.entity';
import {
  ExchangeRateProviderUnavailableError,
  ExchangeRequestNotFoundError,
} from '@/domain/errors/domain-errors';
import type {
  ExchangeRequestRepository,
  PaginatedResult,
} from '@/domain/ports/exchange-request-repository.port';
import type { RateProvider } from '@/domain/ports/rate-provider.port';

class FakeExchangeRequestRepository implements ExchangeRequestRepository {
  public saved: ExchangeRequest[] = [];

  async save(request: Omit<ExchangeRequest, 'id' | 'createdAt'>): Promise<ExchangeRequest> {
    const created: ExchangeRequest = {
      id: `req-${this.saved.length + 1}`,
      createdAt: new Date(),
      ...request,
    };
    this.saved.push(created);
    return created;
  }

  async findByIdAndOwner(id: string, userId: string): Promise<ExchangeRequest | null> {
    return this.saved.find((r) => r.id === id && r.userId === userId) ?? null;
  }

  async findByOwnerPaginated(
    userId: string,
    page: number,
    perPage: number,
  ): Promise<PaginatedResult<ExchangeRequest>> {
    const mine = this.saved.filter((r) => r.userId === userId);
    const start = (page - 1) * perPage;
    return { data: mine.slice(start, start + perPage), total: mine.length };
  }

  async deleteByIdAndOwner(id: string, userId: string): Promise<boolean> {
    const index = this.saved.findIndex((r) => r.id === id && r.userId === userId);
    if (index === -1) return false;
    this.saved.splice(index, 1);
    return true;
  }
}

class FakeRateProvider implements RateProvider {
  constructor(private readonly result: RateSnapshot | Error) {}

  async fetchCurrentRates(): Promise<RateSnapshot> {
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

const rate: RateSnapshot = { purchasePrice: 3.8034, salePrice: 3.85, sourceId: 'ext-1' };

describe('CreateExchangeRequestUseCase', () => {
  it('calcula monto_recibir = monto_enviar * purchase_price para "compra"', async () => {
    const useCase = new CreateExchangeRequestUseCase(
      new FakeExchangeRequestRepository(),
      new FakeRateProvider(rate),
    );

    const result = await useCase.execute({ userId: 'user-1', type: 'purchase', amountSent: 100 });

    expect(result.amountReceived).toBe(380.34);
    expect(result.rateUsed).toEqual(rate);
  });

  it('calcula monto_recibir = monto_enviar / sale_price para "venta"', async () => {
    const useCase = new CreateExchangeRequestUseCase(
      new FakeExchangeRequestRepository(),
      new FakeRateProvider(rate),
    );

    const result = await useCase.execute({ userId: 'user-1', type: 'sale', amountSent: 100 });

    expect(result.amountReceived).toBe(25.97);
  });

  it('redondea monto_enviar a 2 decimales antes de persistir', async () => {
    const useCase = new CreateExchangeRequestUseCase(
      new FakeExchangeRequestRepository(),
      new FakeRateProvider(rate),
    );

    const result = await useCase.execute({
      userId: 'user-1',
      type: 'purchase',
      amountSent: 100.126,
    });

    expect(result.amountSent).toBe(100.13);
  });

  it('throws ExchangeRateProviderUnavailableError if the external provider fails', async () => {
    const useCase = new CreateExchangeRequestUseCase(
      new FakeExchangeRequestRepository(),
      new FakeRateProvider(new Error('network down')),
    );

    await expect(
      useCase.execute({ userId: 'user-1', type: 'purchase', amountSent: 100 }),
    ).rejects.toBeInstanceOf(ExchangeRateProviderUnavailableError);
  });
});

describe('ListExchangeRequestsUseCase', () => {
  it('only returns requests that belong to the given user, paginated', async () => {
    const repository = new FakeExchangeRequestRepository();
    await repository.save({
      userId: 'user-1',
      type: 'purchase',
      amountSent: 100,
      amountReceived: 380.34,
      rateUsed: rate,
    });
    await repository.save({
      userId: 'user-2',
      type: 'purchase',
      amountSent: 50,
      amountReceived: 190.17,
      rateUsed: rate,
    });

    const useCase = new ListExchangeRequestsUseCase(repository);
    const result = await useCase.execute({ userId: 'user-1', page: 1, perPage: 10 });

    expect(result.total).toBe(1);
    expect(result.data[0]?.userId).toBe('user-1');
  });
});

describe('GetExchangeRequestUseCase', () => {
  it('returns the request when it belongs to the user', async () => {
    const repository = new FakeExchangeRequestRepository();
    const saved = await repository.save({
      userId: 'user-1',
      type: 'purchase',
      amountSent: 100,
      amountReceived: 380.34,
      rateUsed: rate,
    });

    const useCase = new GetExchangeRequestUseCase(repository);
    const result = await useCase.execute(saved.id, 'user-1');

    expect(result.id).toBe(saved.id);
  });

  it('throws ExchangeRequestNotFoundError when it belongs to a different user (404, no 403)', async () => {
    const repository = new FakeExchangeRequestRepository();
    const saved = await repository.save({
      userId: 'user-1',
      type: 'purchase',
      amountSent: 100,
      amountReceived: 380.34,
      rateUsed: rate,
    });

    const useCase = new GetExchangeRequestUseCase(repository);

    await expect(useCase.execute(saved.id, 'someone-else')).rejects.toBeInstanceOf(
      ExchangeRequestNotFoundError,
    );
  });

  it('throws ExchangeRequestNotFoundError when the id does not exist', async () => {
    const useCase = new GetExchangeRequestUseCase(new FakeExchangeRequestRepository());

    await expect(useCase.execute('nonexistent', 'user-1')).rejects.toBeInstanceOf(
      ExchangeRequestNotFoundError,
    );
  });
});

describe('DeleteExchangeRequestUseCase', () => {
  it('deletes the request when it belongs to the user', async () => {
    const repository = new FakeExchangeRequestRepository();
    const saved = await repository.save({
      userId: 'user-1',
      type: 'purchase',
      amountSent: 100,
      amountReceived: 380.34,
      rateUsed: rate,
    });

    const useCase = new DeleteExchangeRequestUseCase(repository);
    await useCase.execute(saved.id, 'user-1');

    expect(repository.saved).toHaveLength(0);
  });

  it("throws ExchangeRequestNotFoundError and does not delete another user's request", async () => {
    const repository = new FakeExchangeRequestRepository();
    const saved = await repository.save({
      userId: 'user-1',
      type: 'purchase',
      amountSent: 100,
      amountReceived: 380.34,
      rateUsed: rate,
    });

    const useCase = new DeleteExchangeRequestUseCase(repository);

    await expect(useCase.execute(saved.id, 'someone-else')).rejects.toBeInstanceOf(
      ExchangeRequestNotFoundError,
    );
    expect(repository.saved).toHaveLength(1);
  });
});

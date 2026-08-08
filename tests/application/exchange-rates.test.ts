import { describe, expect, it } from 'bun:test';
import { CreateExchangeRateUseCase } from '@/application/use-cases/create-exchange-rate.use-case';
import { ListExchangeRatesUseCase } from '@/application/use-cases/list-exchange-rates.use-case';
import type { ExchangeRate, RateType } from '@/domain/entities/exchange-rate.entity';
import type { ExchangeRateRepository } from '@/domain/ports/exchange-rate-repository.port';

class FakeExchangeRateRepository implements ExchangeRateRepository {
  public rates: ExchangeRate[] = [];
  public deactivateCalls: RateType[] = [];

  async deactivateActiveByType(type: RateType): Promise<void> {
    this.deactivateCalls.push(type);
    for (const rate of this.rates) {
      if (rate.type === type) rate.isActive = false;
    }
  }

  async save(rate: Omit<ExchangeRate, 'id' | 'createdAt'>): Promise<ExchangeRate> {
    const saved: ExchangeRate = {
      id: `rate-${this.rates.length + 1}`,
      createdAt: new Date(),
      ...rate,
    };
    this.rates.push(saved);
    return saved;
  }

  async findAll(): Promise<ExchangeRate[]> {
    return [...this.rates];
  }
}

describe('CreateExchangeRateUseCase', () => {
  it('deactivates the previous active rate of the same type before creating the new one', async () => {
    const repository = new FakeExchangeRateRepository();
    await repository.save({ type: 'purchase', value: 3.7, isActive: true, createdBy: 'admin-1' });

    const useCase = new CreateExchangeRateUseCase(repository);
    const newRate = await useCase.execute({
      type: 'purchase',
      value: 3.8034,
      createdBy: 'admin-1',
    });

    expect(repository.deactivateCalls).toEqual(['purchase']);
    expect(newRate.isActive).toBe(true);
    // WHY: solo 1 activa por tipo -- la vieja quedó desactivada, solo la nueva sigue activa
    expect(repository.rates.filter((r) => r.type === 'purchase' && r.isActive)).toHaveLength(1);
    expect(repository.rates[0]?.isActive).toBe(false);
  });

  it('does not touch active rates of the other type', async () => {
    const repository = new FakeExchangeRateRepository();
    await repository.save({ type: 'sale', value: 3.85, isActive: true, createdBy: 'admin-1' });

    const useCase = new CreateExchangeRateUseCase(repository);
    await useCase.execute({ type: 'purchase', value: 3.8034, createdBy: 'admin-1' });

    const saleRate = repository.rates.find((r) => r.type === 'sale');
    expect(saleRate?.isActive).toBe(true);
  });
});

describe('ListExchangeRatesUseCase', () => {
  it('returns every rate from the repository', async () => {
    const repository = new FakeExchangeRateRepository();
    await repository.save({
      type: 'purchase',
      value: 3.8034,
      isActive: true,
      createdBy: 'admin-1',
    });
    await repository.save({ type: 'sale', value: 3.85, isActive: true, createdBy: 'admin-1' });

    const useCase = new ListExchangeRatesUseCase(repository);
    const rates = await useCase.execute();

    expect(rates).toHaveLength(2);
  });
});

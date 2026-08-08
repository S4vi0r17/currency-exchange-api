import { describe, expect, it } from 'bun:test';
import type { RateSnapshot } from '@/domain/entities/exchange-request.entity';
import { calculateAmountReceived } from '@/domain/services/exchange-calculator';

describe('calculateAmountReceived', () => {
  const rate: RateSnapshot = { purchasePrice: 3.8034, salePrice: 3.85, sourceId: 'rate-1' };

  it('multiplies by purchase_price for tipo_de_cambio "compra"', () => {
    expect(calculateAmountReceived(100, 'purchase', rate)).toBe(380.34);
  });

  it('divides by sale_price for tipo_de_cambio "venta"', () => {
    expect(calculateAmountReceived(100, 'sale', rate)).toBe(25.97);
  });

  it('rounds the result to 2 decimals', () => {
    expect(calculateAmountReceived(33.333, 'purchase', rate)).toBe(126.78);
  });

  it('never lets a purchase->sale round trip profit the client (el spread siempre favorece a la casa)', () => {
    const received = calculateAmountReceived(100, 'purchase', rate);
    const roundTrip = calculateAmountReceived(received, 'sale', rate);
    expect(roundTrip).toBeLessThan(100);
  });
});

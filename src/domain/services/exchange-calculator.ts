import type { RateType } from '../entities/exchange-rate.entity';
import type { RateSnapshot } from '../entities/exchange-request.entity';
import { roundToCents } from '../value-objects/money';

// WHY: fórmulas del enunciado -- compra multiplica por purchase_price, venta divide por sale_price.
export function calculateAmountReceived(
  amountSent: number,
  type: RateType,
  rate: RateSnapshot,
): number {
  const raw = type === 'purchase' ? amountSent * rate.purchasePrice : amountSent / rate.salePrice;
  return roundToCents(raw);
}

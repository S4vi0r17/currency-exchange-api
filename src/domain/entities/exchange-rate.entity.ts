export type RateType = 'purchase' | 'sale';

export interface ExchangeRate {
  id: string;
  type: RateType;
  value: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

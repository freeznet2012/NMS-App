import { maxStoredAmount, type Month, type PaymentSplit } from './model';
import type { Allocation } from './billing';

export function paymentSplit(total: number, cash: number): PaymentSplit | undefined {
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(cash) || total > maxStoredAmount || cash <= 0 || cash >= total) return;
  return { cash, upi: total - cash };
}

export function showAllocationBreakdown(allocations: Allocation[], credit: number, viewedMonth: Month): boolean {
  return credit > 0 || allocations.length > 1 || allocations.some(allocation => allocation.month > viewedMonth);
}

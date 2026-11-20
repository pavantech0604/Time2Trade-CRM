import { PaymentAllocation } from '../types';

// Shared amounts are entered by the user. The primary employee receives the balance.
export function balancePaymentAllocations(
  allocations: PaymentAllocation[],
  totalAmount: number,
): PaymentAllocation[] {
  const sharedAmount = allocations
    .filter((allocation) => !allocation.is_primary)
    .reduce((sum, allocation) => sum + allocation.allocation_amount, 0);
  const primaryAmount = Math.max(0, Math.round((totalAmount - sharedAmount) * 100) / 100);

  return allocations.map((allocation) => {
    const allocationAmount = allocation.is_primary ? primaryAmount : allocation.allocation_amount;
    return {
      ...allocation,
      allocation_amount: allocationAmount,
      allocation_percentage: totalAmount > 0
        ? Number(((allocationAmount / totalAmount) * 100).toFixed(1))
        : 0,
    };
  });
}

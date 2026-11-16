import { billCharge, profileAt, validMonth, type Bill, type Month, type Payment, type Register } from './model';

export interface Allocation { billId: string; month: Month; amount: number }
export interface Ledger {
  remaining: Record<string, number>;
  allocations: Record<string, Allocation[]>;
  credits: Record<string, number>;
}

// Replaying surviving payments also restores credit consumed by later bills after deletion.
export function ledger(register: Register, customerId: string): Ledger {
  const bills = register.bills.filter(b => b.customerId === customerId).sort((a, b) => a.month.localeCompare(b.month));
  const remaining: Record<string, number> = {};
  for (const bill of bills) {
    const forgiven = register.writeOffs.filter(w => w.billId === bill.id).reduce((sum, w) => sum + w.amount, 0);
    remaining[bill.id] = Math.max(0, billCharge(bill) - forgiven);
  }
  const allocations: Record<string, Allocation[]> = {};
  const credits: Record<string, number> = {};
  const payments = register.payments.filter(p => p.customerId === customerId).sort((a, b) => a.enteredAt.localeCompare(b.enteredAt));
  for (const payment of payments) {
    let available = payment.amount;
    allocations[payment.id] = [];
    const eligible = bills.filter(b => payment.targetMonth ? b.month === payment.targetMonth : b.month <= payment.creditAfter);
    for (const bill of eligible) {
      const amount = Math.min(available, remaining[bill.id]);
      if (amount > 0) allocations[payment.id].push({ billId: bill.id, month: bill.month, amount });
      remaining[bill.id] -= amount;
      available -= amount;
    }
    credits[payment.id] = available;
    // Earlier advances settle future charges before subsequently entered payments.
    for (const bill of bills.filter(b => b.month > payment.creditAfter)) {
      const amount = Math.min(credits[payment.id], remaining[bill.id]);
      if (amount > 0) allocations[payment.id].push({ billId: bill.id, month: bill.month, amount });
      remaining[bill.id] -= amount;
      credits[payment.id] -= amount;
    }
  }
  return { remaining, allocations, credits };
}

export function originalTotal(bill: Bill): number {
  return billCharge(bill) + bill.carry.reduce((sum, carry) => sum + carry.amount, 0);
}
export function remainingForBill(bill: Bill, balances: Ledger): number {
  return (balances.remaining[bill.id] ?? 0) + bill.carry.reduce(
    (sum, carry) => sum + Math.min(carry.amount, balances.remaining[carry.billId] ?? 0), 0);
}
export function paymentDefault(register: Register, customerId: string): number {
  const unpaid = Object.values(ledger(register, customerId).remaining).filter(amount => amount > 0);
  return unpaid.length === 1 ? unpaid[0] : 0;
}
export function previewPayment(register: Register, payment: Payment): Ledger {
  return ledger({ ...register, payments: [...register.payments, payment] }, payment.customerId);
}
export function prepareMonth(register: Register, month: Month, id: () => string): void {
  if (!validMonth(month) || !validMonth(register.firstMonth)) throw new Error('Choose a valid billing month');
  if (month < register.firstMonth) return;
  const [firstYear, firstNumber] = register.firstMonth.split('-').map(Number);
  const date = new Date(firstYear, firstNumber - 1, 1);
  while (`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` <= month) {
    const current = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    for (const customer of register.households) {
      if (register.bills.some(b => b.customerId === customer.id && b.month === current)) continue;
      const profile = profileAt(customer, current);
      if (!profile) continue;
      const balances = ledger(register, customer.id);
      const carry = register.bills.filter(b => b.customerId === customer.id && b.month < current && balances.remaining[b.id] > 0)
        .map(b => ({ billId: b.id, amount: balances.remaining[b.id] }));
      if (!profile.active && carry.length === 0) continue;
      const lines = profile.active ? profile.subscriptions.map(sub => {
        const paper = register.periodicals.find(p => p.id === sub.periodicalId);
        if (!paper) throw new Error('A subscribed periodical is missing');
        const rate = [...paper.rates].sort((a, b) => b.month.localeCompare(a.month)).find(r => r.month <= current);
        if (!rate) throw new Error(`Set a price for ${paper.code} in ${current}`);
        const specialApplies = sub.specialRate !== undefined && !!sub.specialSince && rate.month <= sub.specialSince;
        return { periodicalId: paper.id, code: paper.code, quantity: sub.quantity,
          rate: specialApplies ? sub.specialRate! : rate.amount, deduction: 0 };
      }) : [];
      register.bills.push({ id: id(), customerId: customer.id, month: current,
        name: profile.name, routeId: profile.routeId, boyId: profile.boyId,
        position: profile.position, lines, carry });
    }
    date.setMonth(date.getMonth() + 1);
  }
}

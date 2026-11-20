import { ledger, originalTotal, remainingForBill, summarizeBill } from './billing';
import { billCharge, maxStoredAmount, type Activity, type Bill, type Register } from './model';

export type BillItems = Pick<Bill, 'lines' | 'customItems' | 'opening'>;
type CorrectionEntry = Pick<Activity, 'id' | 'at'> & { item?: string };

export function correctedBill(register: Register, bill: Bill, items: BillItems): Bill {
  const proposed = { ...bill, ...items };
  const charge = billCharge(proposed);
  const writtenOff = register.writeOffs.filter(entry => entry.billId === bill.id).reduce((sum, entry) => sum + entry.amount, 0);
  if (writtenOff > charge) throw new Error('This bill already has a larger write-off. Review it before reducing the charge.');
  if (!Number.isSafeInteger(charge) || charge > maxStoredAmount) throw new Error('Bill charges are too large.');
  return proposed;
}

export function previewBillCorrection(register: Register, bill: Bill, items: BillItems) {
  const proposed = correctedBill(register, bill, items);
  const before = ledger(register, bill.customerId);
  const after = ledger({ ...register, bills: register.bills.map(entry => entry.id === bill.id ? proposed : entry) }, bill.customerId);
  return {
    before: summarizeBill(bill, before),
    after: summarizeBill(proposed, after),
    creditBefore: Object.values(before.credits).reduce((sum, amount) => sum + amount, 0),
    creditAfter: Object.values(after.credits).reduce((sum, amount) => sum + amount, 0),
    otherMonthsChanged: register.bills.some(entry => entry.id !== bill.id && entry.customerId === bill.customerId &&
      remainingForBill(entry, before) !== remainingForBill(entry, after)),
  };
}

export function recordBillCorrection(register: Register, bill: Bill, items: BillItems, entry: CorrectionEntry): void {
  const index = register.bills.findIndex(candidate => candidate.id === bill.id);
  const current = register.bills[index];
  if (!current || JSON.stringify(current) !== JSON.stringify(bill)) throw new Error('The bill changed. Reopen it before editing.');
  const revised = correctedBill(register, current, items);
  if (JSON.stringify(current) === JSON.stringify(revised)) return;
  const before = originalTotal(current);
  register.bills[index] = { ...revised, preparedTotal: current.preparedTotal ?? before };
  register.activity.push({
    id: entry.id, at: entry.at, action: 'Corrected bill', customerId: current.customerId, name: current.name,
    correction: { billId: current.id, item: entry.item, before, after: originalTotal(revised) },
  });
}

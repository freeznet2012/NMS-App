import { z } from 'zod';
import { billCharge, maxStoredAmount, type Register } from './model';
import { paymentSplit } from './payment-entry';

const id = z.string().min(1).max(100);
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const amount = z.number().int().nonnegative().max(maxStoredAmount);
const timestamp = z.string().datetime();
const named = z.object({ id, name: z.string().trim().min(1).max(200) });
const monthlyItem = named.extend({ amount: amount.refine(value => value > 0) });
const registerSchema = z.object({
  schema: z.literal(1), language: z.enum(['en', 'ml']), started: z.boolean(), firstMonth: month,
  routes: z.array(named), boys: z.array(named),
  periodicals: z.array(named.extend({ code: z.string().min(1).max(20), inactive: z.literal(true).optional(),
    rates: z.array(z.object({ month, amount })).min(1) })),
  households: z.array(z.object({ id, phone: z.string().max(50), versions: z.array(z.object({
    month, name: z.string().trim().min(1).max(200), routeId: id, boyId: id,
    position: z.number().int().positive(), active: z.boolean(),
    subscriptions: z.array(z.object({ periodicalId: id, quantity: z.number().int().min(1).max(100),
      specialRate: amount.optional(), specialSince: month.optional() })),
  })).min(1), monthlyItems: z.array(z.object({ month, items: z.array(monthlyItem) })).optional() })),
  bills: z.array(z.object({ id, customerId: id, month, name: z.string(), routeId: id, boyId: id,
    position: z.number().int().positive(), opening: amount.optional(),
    carry: z.array(z.object({ billId: id, amount })),
    customItems: z.array(named.extend({ amount, recurring: z.literal(true).optional() })).optional(),
    preparedTotal: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    lines: z.array(z.object({ periodicalId: id, code: z.string(), quantity: z.number().int().positive(),
      rate: amount, deduction: amount, missedDays: z.number().int().min(0).max(31).optional() })),
  })),
  payments: z.array(z.object({ id, customerId: id, amount: amount.refine(v => v > 0),
    targetMonth: month.optional(), creditAfter: month, method: z.enum(['cash', 'upi', 'split']).optional(),
    split: z.object({ cash: amount, upi: amount }).optional(),
    collectedOn: z.iso.date().optional(),
    images: z.array(z.string().regex(/^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/)),
    enteredAt: timestamp, updatedAt: timestamp })),
  writeOffs: z.array(z.object({ id, billId: id, amount: amount.refine(v => v > 0), reason: z.string(), enteredAt: timestamp })),
  activity: z.array(z.object({ id, at: timestamp, action: z.string(), customerId: id.optional(),
    name: z.string().optional(), route: z.string().optional(), amount: amount.optional(), paymentId: id.optional(),
    correction: z.object({ billId: id, item: z.string().trim().min(1).max(200).optional(),
      before: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      after: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }).optional() })),
  imports: z.array(z.string()), updatedAt: timestamp,
});

export function validateRegister(input: unknown): Register {
  const state = registerSchema.parse(input);
  const unique = (values: string[]) => new Set(values).size === values.length;
  for (const collection of [state.routes, state.boys, state.periodicals, state.households, state.bills, state.payments, state.writeOffs, state.activity]) {
    if (!unique(collection.map(item => item.id))) throw new Error('Duplicate record IDs');
  }
  if (!unique(state.periodicals.map(p => p.code.toUpperCase()))) throw new Error('Duplicate periodical codes');
  const routes = new Set(state.routes.map(r => r.id));
  const boys = new Set(state.boys.map(b => b.id));
  const papers = new Set(state.periodicals.map(p => p.id));
  const customers = new Set(state.households.map(h => h.id));
  const bills = new Map(state.bills.map(b => [b.id, b]));
  const payments = new Map(state.payments.map(payment => [payment.id, payment]));
  if (!unique(state.bills.map(b => b.customerId + ':' + b.month))) throw new Error('Duplicate monthly bills');
  for (const paper of state.periodicals) {
    if (!unique(paper.rates.map(r => r.month))) throw new Error('Duplicate effective prices');
  }
  for (const household of state.households) {
    if (!unique(household.versions.map(v => v.month))) throw new Error('Duplicate household versions');
    if (!unique((household.monthlyItems ?? []).map(version => version.month))) throw new Error('Duplicate monthly item schedules');
    for (const version of household.monthlyItems ?? []) {
      if (!unique(version.items.map(item => item.id))) throw new Error('Duplicate monthly custom items');
    }
    for (const v of household.versions) {
      if (!routes.has(v.routeId) || !boys.has(v.boyId)) throw new Error('Missing route or delivery boy');
      if (!unique(v.subscriptions.map(s => s.periodicalId))) throw new Error('Duplicate subscription');
      for (const sub of v.subscriptions) {
        if (!papers.has(sub.periodicalId)) throw new Error('Missing periodical');
        if (sub.specialRate !== undefined && !sub.specialSince) throw new Error('Missing special-price start month');
      }
    }
  }
  for (const bill of state.bills) {
    if (!customers.has(bill.customerId) || !routes.has(bill.routeId) || !boys.has(bill.boyId)) throw new Error('Invalid bill references');
    if (!unique(bill.carry.map(c => c.billId))) throw new Error('Duplicate carried dues');
    for (const carry of bill.carry) {
      const source = bills.get(carry.billId);
      if (!source || source.customerId !== bill.customerId || source.month >= bill.month) throw new Error('Invalid carried dues');
    }
    for (const line of bill.lines) {
      if (!papers.has(line.periodicalId) || line.deduction > line.rate * line.quantity) throw new Error('Invalid paper charge');
    }
    if (bill.customItems && (bill.opening !== undefined || !unique(bill.customItems.map(item => item.id)))) {
      throw new Error('Invalid custom bill items');
    }
    if (!Number.isSafeInteger(billCharge(bill) + bill.carry.reduce((sum, entry) => sum + entry.amount, 0))) {
      throw new Error('Bill total is too large');
    }
  }
  for (const activity of state.activity) {
    if (activity.correction && (!activity.customerId || bills.get(activity.correction.billId)?.customerId !== activity.customerId)) {
      throw new Error('Invalid bill correction');
    }
    const payment = activity.paymentId && payments.get(activity.paymentId);
    if (payment && payment.customerId !== activity.customerId) throw new Error('Invalid activity payment');
  }
  for (const payment of state.payments) {
    if (!customers.has(payment.customerId)) throw new Error('Missing payment household');
    if (payment.method === 'split' ? !payment.split || paymentSplit(payment.amount, payment.split.cash)?.upi !== payment.split.upi : payment.split !== undefined) {
      throw new Error('Cash and UPI amounts must both be positive and add up to the payment');
    }
  }
  for (const writeOff of state.writeOffs) if (!bills.has(writeOff.billId)) throw new Error('Missing write-off bill');
  for (const bill of state.bills) {
    const forgiven = state.writeOffs.filter(w => w.billId === bill.id).reduce((sum, w) => sum + w.amount, 0);
    if (forgiven > billCharge(bill)) throw new Error('Write-offs exceed bill charge');
  }
  return state;
}

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { emptyRegister, billCharge, parseMoney } = require('../.test-build/model');
const { prepareMonth, ledger, originalTotal, remainingForBill, paymentDefault } = require('../.test-build/billing');
const { validateRegister } = require('../.test-build/validation');
const { collectionRows, filterCollection } = require('../.test-build/collection');
const { saveHousehold } = require('../.test-build/households');
const { reportRows } = require('../.test-build/reports');
let serial = 0;
const id = () => 'test-' + ++serial;
function fixture() {
  const r = emptyRegister();
  r.firstMonth = '2026-06'; r.started = true;
  r.routes = [{ id: 'route', name: 'Temple Road' }];
  r.boys = [{ id: 'boy', name: 'Binu' }];
  r.periodicals = [{ id: 'mm', code: 'MM', name: 'Manorama', rates: [{ month: '2026-06', amount: 30000 }] }];
  r.households = [{ id: 'anu', phone: '', versions: [{ month: '2026-06', name: 'Anu', routeId: 'route', boyId: 'boy', position: 1, active: true, subscriptions: [{ periodicalId: 'mm', quantity: 2 }] }] }];
  r.bills = [{ id: 'may', customerId: 'anu', month: '2026-05', name: 'Anu', routeId: 'route', boyId: 'boy', position: 1, lines: [], carry: [], opening: 20000 }];
  return r;
}
function pay(r, amount, targetMonth) {
  const p = { id: id(), customerId: 'anu', amount, targetMonth, creditAfter: '2026-06', images: [], enteredAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  r.payments.push(p); return p;
}
test('May carry is counted once, June collection excludes July, preparation is idempotent', () => {
  const r = fixture(); prepareMonth(r, '2026-06', id);
  const june = r.bills.find(b => b.month === '2026-06');
  assert.equal(originalTotal(june), 80000); assert.equal(paymentDefault(r, 'anu'), 0);
  pay(r, 30000); assert.equal(ledger(r, 'anu').remaining.may, 0);
  assert.equal(remainingForBill(june, ledger(r, 'anu')), 50000);
  assert.equal(paymentDefault(r, 'anu'), 50000);
  prepareMonth(r, '2026-07', id); prepareMonth(r, '2026-07', id);
  assert.equal(r.bills.length, 3);
  assert.equal(remainingForBill(june, ledger(r, 'anu')), 50000);
  assert.equal(originalTotal(r.bills[2]), 110000);
  validateRegister(r);
});
test('specific-month excess stays credit and deleting payment reverses later credit use', () => {
  const r = fixture(); prepareMonth(r, '2026-06', id);
  const p = pay(r, 80000, '2026-06');
  assert.equal(ledger(r, 'anu').remaining.may, 20000);
  assert.equal(ledger(r, 'anu').credits[p.id], 20000);
  prepareMonth(r, '2026-07', id);
  assert.equal(ledger(r, 'anu').remaining[r.bills[2].id], 40000);
  r.payments = [];
  assert.equal(ledger(r, 'anu').remaining[r.bills[2].id], 60000);
  assert.equal(ledger(r, 'anu').remaining[r.bills[1].id], 60000);
});
test('new usual price expires special price without changing past bills', () => {
  const r = fixture(); Object.assign(r.households[0].versions[0].subscriptions[0], { specialRate: 25000, specialSince: '2026-06' });
  prepareMonth(r, '2026-06', id);
  r.periodicals[0].rates.push({ month: '2026-07', amount: 35000 });
  prepareMonth(r, '2026-07', id);
  assert.equal(billCharge(r.bills[1]), 50000); assert.equal(billCharge(r.bills[2]), 70000);
});
test('deductions and write-offs lower dues without becoming collections', () => {
  const r = fixture(); prepareMonth(r, '2026-06', id);
  r.bills[1].lines[0].deduction = 10000;
  r.writeOffs.push({ id: id(), billId: 'may', amount: 20000, reason: '', enteredAt: new Date().toISOString() });
  assert.equal(remainingForBill(r.bills[1], ledger(r, 'anu')), 50000);
  assert.equal(r.payments.length, 0); validateRegister(r);
});
test('invalid restore references and duplicate monthly charges are rejected', () => {
  const r = fixture(); prepareMonth(r, '2026-06', id);
  r.bills.push({ ...r.bills[1], id: id() }); assert.throws(() => validateRegister(r), /Duplicate monthly/);
  r.bills.pop(); r.bills[1].carry[0].billId = 'missing'; assert.throws(() => validateRegister(r), /carried dues/);
});
test('money uses integer paise and rejects malformed amounts', () => {
  assert.equal(parseMoney('₹1,234.50'), 123450);
  for (const value of ['-1', 'NaN', '1.234', '']) assert.throws(() => parseMoney(value));
});

test('restore rejects impossible collection dates and excessive write-offs', () => {
  const r = fixture(); prepareMonth(r, '2026-06', id);
  const payment = pay(r, 10000); payment.collectedOn = '2026-02-30';
  assert.throws(() => validateRegister(r));
  payment.collectedOn = '2024-02-29'; validateRegister(r);
  r.writeOffs.push({ id: id(), billId: 'may', amount: 20001, reason: '', enteredAt: new Date().toISOString() });
  assert.throws(() => validateRegister(r), /Write-offs exceed/);
});
test('earlier advance is consumed before a later collection', () => {
  const r = fixture(); prepareMonth(r, '2026-06', id);
  const advance = pay(r, 100000);
  prepareMonth(r, '2026-07', id);
  const later = pay(r, 40000); later.creditAfter = '2026-07';
  const balances = ledger(r, 'anu');
  assert.equal(balances.credits[advance.id], 0);
  assert.equal(balances.credits[later.id], 0);
  assert.equal(balances.allocations[advance.id].find(a => a.month === '2026-07').amount, 20000);
});
test('search temporarily includes paid households without changing route, boy, or stop', () => {
  const r = fixture(); r.households[0].versions[0].position = 7;
  prepareMonth(r, '2026-06', id); pay(r, 80000);
  const rows = collectionRows(r, '2026-06');
  const filters = { routeId: 'route', boyId: 'boy', status: 'unpaid', query: '' };
  assert.equal(filterCollection(rows, filters).length, 0);
  assert.equal(filterCollection(rows, { ...filters, query: 'anu' })[0].profile.position, 7);
  assert.equal(filterCollection(rows, { ...filters, query: 'anu', boyId: 'different' }).length, 0);
  assert.equal(filterCollection(rows, { ...filters, query: 'anu', routeId: 'different' }).length, 0);
  assert.equal(filterCollection(rows, filters).length, 0);
});
test('moving households changes collection route but preserves historical report order', () => {
  const r = fixture(); prepareMonth(r, '2026-06', id);
  r.routes.push({ id: 'canal', name: 'Canal Lane' });
  saveHousehold(r, { id: 'anu', phone: '', afterId: '', profile: { ...r.households[0].versions[0], month: '2026-07', routeId: 'canal' } });
  assert.equal(collectionRows(r, '2026-06')[0].profile.routeId, 'canal');
  const report = reportRows(r, { type: 'dues', month: '2026-06', scope: 'route', scopeId: 'route' });
  assert.equal(report[0].routeId, 'route'); assert.equal(report[0].original, 80000);
  assert.equal(reportRows(r, { type: 'master', month: '2026-06', scope: 'boy', scopeId: 'boy' }).length, 1);
});
test('insert after a stop renumbers current route without altering snapshots', () => {
  const r = fixture(); prepareMonth(r, '2026-06', id);
  saveHousehold(r, { id: 'new', phone: '', afterId: '', profile: { ...r.households[0].versions[0], name: 'New stop', month: '2026-07' } });
  assert.equal(r.households[0].versions.find(v => v.month === '2026-07').position, 2);
  assert.equal(r.bills[1].position, 1); validateRegister(r);
});

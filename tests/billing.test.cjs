const { test } = require('node:test');
const assert = require('node:assert/strict');
const { emptyRegister, billCharge, billLineCharge, monthlyItemsAt, parseMoney } = require('../.test-build/model');
const { prepareMonth, ledger, originalTotal, remainingForBill, summarizeBill, customerBalance, paymentDefault } = require('../.test-build/billing');
const { previewBillCorrection, recordBillCorrection } = require('../.test-build/bill-corrections');
const { paymentSplit, showAllocationBreakdown } = require('../.test-build/payment-entry');
const { validateRegister } = require('../.test-build/validation');
const { collectionRows, filterCollection, summarizeCollections, summarizeRouteCollection } = require('../.test-build/collection');
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
test('Cash and UPI split applies and reverses the total once using the same ledger rules', () => {
  const r = fixture();
  prepareMonth(r, '2026-06', id);
  const payment = pay(r, 30000);
  payment.method = 'split';
  payment.split = paymentSplit(payment.amount, 20000);
  assert.deepEqual(payment.split, { cash: 20000, upi: 10000 });
  validateRegister(r);
  assert.deepEqual(ledger(r, 'anu').allocations[payment.id].map(allocation => [allocation.month, allocation.amount]),
    [['2026-05', 20000], ['2026-06', 10000]]);

  payment.split.upi = 11000;
  assert.throws(() => validateRegister(r), /Cash and UPI amounts/);
  payment.split.upi = 10000;
  payment.method = 'cash';
  assert.throws(() => validateRegister(r), /Cash and UPI amounts/);
  assert.equal(paymentSplit(30000, 30000), undefined);
  assert.equal(paymentSplit(30000, 0), undefined);

  r.payments = [];
  assert.equal(ledger(r, 'anu').remaining.may, 20000);
  assert.equal(customerBalance(r, 'anu').total, 80000);
});
test('allocation breakdown appears for several months, an advance, or customer credit', () => {
  const june = { billId: 'june', month: '2026-06', amount: 3000 };
  const july = { billId: 'july', month: '2026-07', amount: 5000 };
  assert.equal(showAllocationBreakdown([], 0, '2026-06'), false);
  assert.equal(showAllocationBreakdown([june], 0, '2026-06'), false);
  assert.equal(showAllocationBreakdown([june], 0, '2026-07'), false);
  assert.equal(showAllocationBreakdown([june], 1000, '2026-06'), true);
  assert.equal(showAllocationBreakdown([], 1000, '2026-06'), true);
  assert.equal(showAllocationBreakdown([july], 0, '2026-06'), true);
  assert.equal(showAllocationBreakdown([june, july], 0, '2026-07'), true);
});
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
test('October and December summaries reuse live allocations and retain the printed carry amounts', () => {
  const r = fixture();
  r.firstMonth = '2026-10';
  r.bills = [];
  r.periodicals[0].rates[0].month = r.firstMonth;
  const profile = r.households[0].versions[0];
  profile.month = r.firstMonth;
  profile.subscriptions[0].quantity = 1;
  prepareMonth(r, '2026-10', id);
  const october = r.bills[0];
  pay(r, 15000, october.month).creditAfter = october.month;
  prepareMonth(r, '2026-12', id);
  const november = r.bills[1];
  const december = r.bills[2];
  const carried = [{ billId: october.id, amount: 15000 }, { billId: november.id, amount: 30000 }];
  assert.deepEqual(december.carry, carried);
  pay(r, 2000, october.month).creditAfter = december.month;
  const balances = ledger(r, 'anu');
  assert.deepEqual(summarizeBill(october, balances), { original: 30000, settled: 17000, remaining: 13000 });
  assert.deepEqual(summarizeBill(december, balances), { original: 75000, settled: 2000, remaining: 73000 });
  const history = customerBalance(r, 'anu');
  assert.equal(history.total, 73000);
  assert.deepEqual(history.outstanding, [
    { month: '2026-10', amount: 13000 }, { month: '2026-11', amount: 30000 }, { month: '2026-12', amount: 30000 },
  ]);

  pay(r, 10000, november.month).creditAfter = december.month;
  prepareMonth(r, '2027-01', id);
  pay(r, 10000, '2027-01').creditAfter = '2027-01';
  assert.deepEqual(summarizeBill(december, ledger(r, 'anu')), { original: 75000, settled: 12000, remaining: 63000 });
  assert.deepEqual(december.carry, carried);
  assert.deepEqual(october.carry, []);
  validateRegister(r);
});
test('customer balance separates settled months and credit and keeps payment history newest first', () => {
  const r = fixture();
  prepareMonth(r, '2026-06', id);
  const newer = pay(r, 70000, '2026-06');
  newer.enteredAt = '2026-06-20T10:00:00Z';
  const older = pay(r, 20000, '2026-05');
  older.enteredAt = '2026-06-19T10:00:00Z';
  const history = customerBalance(r, 'anu');
  assert.equal(history.total, 0);
  assert.deepEqual(history.outstanding, []);
  assert.deepEqual(history.settledMonths, ['2026-05', '2026-06']);
  assert.equal(history.credit, 10000);
  assert.deepEqual(history.payments.map(payment => payment.id), [newer.id, older.id]);

  r.payments = r.payments.filter(payment => payment.id !== newer.id);
  const afterDeletion = customerBalance(r, 'anu');
  assert.equal(afterDeletion.total, 60000);
  assert.equal(afterDeletion.credit, 0);
  assert.deepEqual(afterDeletion.outstanding, [{ month: '2026-06', amount: 60000 }]);
  assert.deepEqual(afterDeletion.settledMonths, ['2026-05']);
  assert.deepEqual(afterDeletion.payments.map(payment => payment.id), [older.id]);
});
test('a corrected multi-periodical bill uses saved line charges and separates write-offs from the original', () => {
  const r = fixture();
  const paper = { id: 'mb', code: 'MB', name: 'Mathrubhumi', rates: [{ month: '2026-06', amount: 25000 }] };
  r.periodicals.push(paper);
  r.households[0].versions[0].subscriptions.push({ periodicalId: paper.id, quantity: 1 });
  prepareMonth(r, '2026-06', id);
  const june = r.bills[1];
  june.lines[0].deduction = 5000;
  pay(r, 10000, june.month);
  r.writeOffs.push({ id: id(), billId: june.id, amount: 5000, reason: '', enteredAt: new Date().toISOString() });
  assert.deepEqual(june.lines.map(billLineCharge), [55000, 25000]);
  assert.equal(billCharge(june), 80000);
  assert.deepEqual(summarizeBill(june, ledger(r, 'anu')), { original: 100000, settled: 15000, remaining: 85000 });
  assert.deepEqual(june.carry, [{ billId: 'may', amount: 20000 }]);
  validateRegister(r);
});
test('item corrections preserve the prepared total, carry snapshots and received payments', () => {
  const r = fixture();
  r.bills = [];
  r.households[0].versions[0].subscriptions[0].quantity = 1;
  prepareMonth(r, '2026-06', id);
  const payment = pay(r, 20000, '2026-06');
  prepareMonth(r, '2026-07', id);
  const [june, july] = r.bills;
  const items = { lines: [{ ...june.lines[0], deduction: 5000, missedDays: 5 }] };
  const firstPreview = previewBillCorrection(r, june, items);
  assert.deepEqual(firstPreview.after, { original: 25000, settled: 20000, remaining: 5000 });
  assert.equal(firstPreview.otherMonthsChanged, true);
  assert.equal(june.preparedTotal, undefined);
  recordBillCorrection(r, june, items, { id: id(), at: payment.enteredAt, item: 'MM' });
  assert.equal(r.bills[0].preparedTotal, 30000);
  assert.deepEqual(july.carry, [{ billId: june.id, amount: 10000 }]);
  assert.equal(remainingForBill(july, ledger(r, 'anu')), 35000);
  assert.throws(() => recordBillCorrection(r, june, items, { id: id(), at: payment.enteredAt }), /bill changed/);

  const corrected = r.bills[0];
  const replacement = { lines: [], customItems: [{ id: id(), name: 'Festival edition', amount: 18000 }] };
  const preview = previewBillCorrection(r, corrected, replacement);
  assert.equal(preview.otherMonthsChanged, true);
  assert.equal(preview.creditAfter, 0);
  recordBillCorrection(r, corrected, replacement, { id: id(), at: payment.enteredAt, item: 'Festival edition' });
  assert.deepEqual(ledger(r, 'anu').allocations[payment.id], [
    { billId: june.id, month: june.month, amount: 18000 },
    { billId: july.id, month: july.month, amount: 2000 },
  ]);
  assert.equal(payment.amount, 20000);
  assert.equal(r.bills[0].preparedTotal, 30000);
  assert.deepEqual(r.activity.at(-1).correction, { billId: june.id, item: 'Festival edition', before: 25000, after: 18000 });
  assert.deepEqual(july.carry, [{ billId: june.id, amount: 10000 }]);
  assert.equal(july.lines.length, 1);
  assert.equal(july.customItems, undefined);
  assert.equal(r.households[0].versions[0].subscriptions[0].periodicalId, 'mm');
  validateRegister(r);
});

test('removing the last bill item previews credit and preserves the bill and write-off limits', () => {
  const r = fixture();
  r.bills = [];
  prepareMonth(r, '2026-06', id);
  const bill = r.bills[0];
  const payment = pay(r, 10000, bill.month);
  const removal = { lines: [] };
  assert.equal(previewBillCorrection(r, bill, removal).creditAfter, 10000);
  r.writeOffs.push({ id: id(), billId: bill.id, amount: 1000, reason: '', enteredAt: payment.enteredAt });
  assert.throws(() => previewBillCorrection(r, bill, removal), /larger write-off/);
  r.writeOffs = [];
  recordBillCorrection(r, bill, removal, { id: id(), at: payment.enteredAt });
  prepareMonth(r, bill.month, id);
  assert.equal(r.bills.length, 1);
  assert.equal(r.bills[0].id, bill.id);
  assert.equal(billCharge(r.bills[0]), 0);
  assert.equal(ledger(r, 'anu').credits[payment.id], 10000);
  validateRegister(r);
});

test('monthly items follow their effective months and bill overrides stay on the selected bill', () => {
  const r = fixture();
  const charge = { id: 'monthly-item', name: 'Fixed charge', amount: 4500 };
  const profile = r.households[0].versions[0];
  const save = (month, active, monthlyItems) => saveHousehold(r, {
    id: 'anu', phone: '', afterId: '', profile: { ...profile, month, active }, monthlyItems,
  });
  save('2026-06', true, [charge]);
  save('2026-08', true, [{ ...charge, amount: 6500 }]);
  save('2026-07', true);
  prepareMonth(r, '2026-07', id);
  const june = r.bills.find(bill => bill.month === '2026-06');
  const july = r.bills.find(bill => bill.month === '2026-07');
  assert.equal(billCharge(june), 64500);
  assert.equal(billCharge(july), 64500);
  assert.equal(june.customItems[0].recurring, true);
  recordBillCorrection(r, june, { lines: june.lines,
    customItems: [{ ...june.customItems[0], amount: 3000 }] }, { id: id(), at: r.updatedAt });
  assert.equal(billCharge(r.bills.find(bill => bill.id === june.id)), 63000);
  assert.equal(monthlyItemsAt(r.households[0], '2026-07')[0].amount, 4500);
  assert.equal(july.carry.find(entry => entry.billId === june.id).amount, 64500);
  prepareMonth(r, '2026-08', id);
  assert.equal(billCharge(r.bills.find(bill => bill.month === '2026-08')), 66500);
  save('2026-09', false);
  prepareMonth(r, '2026-09', id);
  assert.equal(billCharge(r.bills.find(bill => bill.month === '2026-09')), 0);
  save('2026-10', true, []);
  prepareMonth(r, '2026-10', id);
  assert.equal(billCharge(r.bills.find(bill => bill.month === '2026-10')), 60000);
  assert.equal(billCharge(july), 64500);
  validateRegister(r);
});

test('a household with only a monthly custom item can be billed without a catalog entry', () => {
  const r = fixture();
  const profile = { ...r.households[0].versions[0], name: 'Fixed charge customer', subscriptions: [] };
  const input = { id: 'fee-only', phone: '', afterId: 'anu', profile };
  assert.throws(() => saveHousehold(r, input), /paper or add a monthly custom item/);
  saveHousehold(r, { ...input, monthlyItems: [{ id: 'charge', name: 'Delivery fee', amount: 1250 }] });
  prepareMonth(r, '2026-06', id);
  const bill = r.bills.find(entry => entry.customerId === input.id);
  assert.deepEqual(bill.lines, []);
  assert.equal(billCharge(bill), 1250);
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
test('route dashboard totals include partial dues and omit later charges and paid bills', () => {
  const r = fixture();
  r.routes.push({ id: 'second-route', name: 'Canal Lane' });
  r.households.push({ id: 'mini', phone: '', versions: [{
    ...r.households[0].versions[0], name: 'Mini', routeId: 'second-route',
  }] });
  prepareMonth(r, '2026-07', id);
  const partial = pay(r, 30000);
  r.payments.push({ ...partial, customerId: 'mini', amount: 60000, id: id() });
  const result = summarizeCollections(collectionRows(r, '2026-06'), r.routes);
  assert.deepEqual(result.byRoute.get('route'), { unpaid: 1, outstanding: 50000 });
  assert.deepEqual(result.byRoute.get('second-route'), { unpaid: 0, outstanding: 0 });
  assert.deepEqual(result.total, { unpaid: 1, outstanding: 50000 });
});
test('route collection tabs distinguish recorded payments, write-offs, and the original total', () => {
  const r = fixture();
  pay(r, 5000, '2026-05');
  prepareMonth(r, '2026-06', id);
  const june = r.bills.find(bill => bill.month === '2026-06');
  pay(r, 30000, '2026-06');
  assert.deepEqual(summarizeRouteCollection(collectionRows(r, '2026-06')), {
    counts: { unpaid: 1, paid: 0, all: 1 },
    amounts: { unpaid: 45000, paid: 0, all: 75000 },
  });

  r.writeOffs.push({ id: id(), billId: june.id, amount: 5000, reason: '', enteredAt: new Date().toISOString() });
  pay(r, 25000, '2026-06');
  pay(r, 15000, '2026-05');
  prepareMonth(r, '2026-07', id);
  pay(r, 60000, '2026-07');
  assert.deepEqual(summarizeRouteCollection(collectionRows(r, '2026-06')), {
    counts: { unpaid: 0, paid: 1, all: 1 },
    amounts: { unpaid: 0, paid: 70000, all: 75000 },
  });
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

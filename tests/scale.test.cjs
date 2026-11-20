const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { emptyRegister } = require('../.test-build/model');
const { prepareMonth, ledger } = require('../.test-build/billing');
const { reportRows } = require('../.test-build/reports');
const { encodeBackup, decodeBackup } = require('../.test-build/backup-format');

test('600-household register reconciles collections, write-offs, reports and portable recovery', async () => {
  const r = emptyRegister(); r.started = true; r.firstMonth = '2026-06';
  r.routes = [{ id: 'r', name: 'Test route' }]; r.boys = [{ id: 'b', name: 'Test boy' }];
  r.periodicals = [{ id: 'mm', name: 'Manorama', code: 'MM', rates: [{ month: '2026-06', amount: 30000 }] }];
  r.households = Array.from({ length: 600 }, (_, i) => ({ id: 'h' + i, phone: '', versions: [{
    month: '2026-06', name: 'Household ' + i, routeId: 'r', boyId: 'b', position: i + 1, active: true,
    subscriptions: [{ periodicalId: 'mm', quantity: i < 400 ? 2 : 1 }],
  }] }));
  let serial = 0; const id = () => 'record-' + ++serial;
  prepareMonth(r, '2026-06', id);
  const firstBill = r.bills.find(b => b.customerId === 'h0');
  firstBill.lines[0].deduction = 10000;
  r.writeOffs.push({ id: id(), billId: firstBill.id, amount: 5000, reason: 'Test adjustment', enteredAt: r.updatedAt });
  r.payments = r.households.map(h => ({ id: id(), customerId: h.id, amount: 10000, creditAfter: '2026-06', images: [], enteredAt: r.updatedAt, updatedAt: r.updatedAt }));
  const report = month => reportRows(r, { month, type: 'dues', scope: 'boy', scopeId: 'b' });
  const total = rows => rows.reduce((sum, row) => sum + row.remaining, 0);
  assert.equal(total(report('2026-06')), 30000000 - 15000 - 6000000);
  prepareMonth(r, '2026-07', id);
  assert.equal(total(report('2026-06')), 23985000, 'later charges must not alter June collection');
  assert.equal(total(report('2026-07')), 53985000, 'carry counted exactly once');
  r.payments.shift();
  assert.equal(ledger(r, 'h0').remaining[firstBill.id], 45000, 'deletion restores the collected amount');
  const checksum = async bytes => createHash('sha256').update(bytes).digest('hex');
  const archive = await encodeBackup(r, {}, checksum);
  const recovered = await decodeBackup(archive.bytes, checksum);
  assert.deepEqual(recovered.state, r);
  assert.equal(total(reportRows(recovered.state, { month: '2026-07', type: 'dues', scope: 'all', scopeId: '' })), 53985000,
    'July collection is capped at the carried amount in its original snapshot');
  const balance = recovered.state.households.reduce((sum, h) => sum + Object.values(ledger(recovered.state, h.id).remaining).reduce((a, b) => a + b, 0), 0);
  assert.equal(balance, 53995000, 'customer balances retain the reversed collection in full');
});

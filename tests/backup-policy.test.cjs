const { test } = require('node:test');
const assert = require('node:assert/strict');
const { backupDue } = require('../.test-build/backup-policy');
const local = (day, hour) => new Date(2026, 10, day, hour);
test('daytime backup does not suppress changed data at the nightly boundary', () => {
  const latest = { createdAt: local(19, 9).toISOString(), lastChanged: 'before' };
  assert.equal(backupDue('after', latest, local(19, 21)), false);
  assert.equal(backupDue('after', latest, local(19, 22)), true);
  assert.equal(backupDue('after', latest, local(20, 8)), true);
});
test('successful nightly backup avoids duplicates and unchanged data needs no new archive', () => {
  const latest = { createdAt: local(19, 23).toISOString(), lastChanged: 'before' };
  assert.equal(backupDue('after', latest, local(20, 8)), false);
  assert.equal(backupDue('after', latest, local(20, 22)), true);
  assert.equal(backupDue('before', latest, local(21, 22)), false);
  assert.equal(backupDue('after', undefined, local(20, 8)), true);
});

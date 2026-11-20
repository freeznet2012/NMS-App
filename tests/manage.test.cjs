const { test } = require('node:test');
const assert = require('node:assert/strict');
const { activityKind, groupActivity } = require('../.test-build/activity');
const { savePeriodical, searchPeriodicals } = require('../.test-build/periodicals');
const { emptyRegister, rateAt } = require('../.test-build/model');
const { prepareMonth } = require('../.test-build/billing');

test('activity groups by local day, sorts by event time, and filters types and dates', () => {
  const now = new Date(2026, 10, 20, 12);
  const entry = (id, action, day, hour) => ({ id, action, at: new Date(2026, 10, day, hour).toISOString() });
  const activity = [
    entry('p1', 'Recorded payment', 19, 23), entry('h1', 'Added household', 20, 2),
    entry('p2', 'Deleted payment', 20, 10), entry('b1', 'Wrote off dues', 20, 11), entry('i1', 'Imported 5 households', 19, 1),
  ];
  assert.deepEqual(groupActivity(activity, 'all', 'all', now).map(group => group.data.map(item => item.id)),
    [['b1', 'p2', 'h1'], ['p1', 'i1']]);
  assert.deepEqual(groupActivity(activity, 'payments', 'yesterday', now)[0].data.map(item => item.id), ['p1']);
  assert.deepEqual(groupActivity(activity, 'imports', 'today', now), []);
  assert.equal(activityKind(activity[4]), 'imports');
});

test('periodical edits preserve past bills, allow unchanged legacy codes, and sort searchable names and codes', () => {
  const state = emptyRegister();
  state.firstMonth = '2026-10';
  state.routes = [{ id: 'r', name: 'Route' }];
  state.boys = [{ id: 'b', name: 'Delivery person' }];
  state.periodicals = [{ id: 'mm', name: 'Malayala Manorama', code: 'LEGACY', rates: [{ month: '2026-10', amount: 30000 }] }];
  state.households = [{ id: 'h', phone: '', versions: [{ month: '2026-10', name: 'Anu', routeId: 'r', boyId: 'b',
    position: 1, active: true, subscriptions: [{ periodicalId: 'mm', quantity: 1 }] }] }];
  let nextId = 0;
  const id = () => 'bill-' + ++nextId;
  prepareMonth(state, '2026-10', id);
  savePeriodical(state, { id: 'mb', name: 'Mathrubhumi', code: 'mb', month: '2026-11', amount: 31000, inactive: false });
  savePeriodical(state, { id: 'mm', name: 'Malayala Manorama', code: 'LEGACY', month: '2026-11', amount: 35000, inactive: true });
  assert.throws(() => savePeriodical(state, { id: 'dup', name: 'Alternate', code: 'MB', month: '2026-11', amount: 100, inactive: false }), /in use/);
  assert.equal(state.bills[0].lines[0].rate, 30000);
  assert.equal(state.periodicals[0].inactive, true);
  prepareMonth(state, '2026-11', id);
  assert.equal(state.bills[1].lines[0].rate, 35000);
  assert.equal(rateAt(state.periodicals[1], '2026-10'), undefined);
  assert.deepEqual(searchPeriodicals(state.periodicals, 'mb', 'name', 'en-IN').map(paper => paper.id), ['mb']);
  assert.deepEqual(searchPeriodicals(state.periodicals, 'malayala', 'name', 'en-IN').map(paper => paper.id), ['mm']);
  assert.deepEqual(searchPeriodicals(state.periodicals, '', 'nameDesc', 'en-IN').map(paper => paper.id), ['mb', 'mm']);
});

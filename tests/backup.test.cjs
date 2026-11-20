const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { unzipSync, zipSync, strToU8, strFromU8 } = require('fflate');
const { billCharge, emptyRegister } = require('../.test-build/model');
const { encodeBackup, decodeBackup } = require('../.test-build/backup-format');
const checksum=async bytes=>createHash('sha256').update(bytes).digest('hex');
test('portable backup preserves preferences, timestamps, and activity',async()=>{
  const state=emptyRegister(); state.language='ml'; state.activity.push({id:'activity',at:state.updatedAt,action:'Test action'});
  const archive=await encodeBackup(state,{},checksum); const restored=await decodeBackup(archive.bytes,checksum);
  assert.deepEqual(restored.state,state); assert.equal(restored.manifest.lastChanged,state.updatedAt);
  assert.equal(restored.manifest.version, 1);
});
test('corrupt data and unsupported backup versions are rejected before restore',async()=>{
  const archive=await encodeBackup(emptyRegister(),{},checksum);
  const files=unzipSync(archive.bytes); files['register.json']=strToU8('{}');
  await assert.rejects(decodeBackup(zipSync(files),checksum),/verification failed/);
  const original=unzipSync(archive.bytes); const manifest=JSON.parse(strFromU8(original['manifest.json'])); manifest.version=6;
  original['manifest.json']=strToU8(JSON.stringify(manifest)); await assert.rejects(decodeBackup(zipSync(original),checksum),/newer app version/);
});
test('version 3 backs up the monthly template and each bill snapshot independently', async () => {
  const state = emptyRegister();
  state.routes = [{ id: 'r', name: 'Route' }];
  state.boys = [{ id: 'b', name: 'Delivery person' }];
  const month = '2026-06';
  const item = { id: 'charge', name: 'മാസ തുക', amount: 3000 };
  state.households = [{ id: 'h', phone: '', versions: [{ month, name: 'Anu', routeId: 'r', boyId: 'b',
    position: 1, active: true, subscriptions: [] }], monthlyItems: [{ month, items: [item] }] }];
  state.bills = [{ id: 'bill', customerId: 'h', month, name: 'Anu', routeId: 'r', boyId: 'b',
    position: 1, lines: [], carry: [], customItems: [{ ...item, amount: 2000, recurring: true }] }];
  const archive = await encodeBackup(state, {}, checksum);
  assert.equal(archive.manifest.version, 3);
  assert.deepEqual((await decodeBackup(archive.bytes, checksum)).state, state);
  const files = unzipSync(archive.bytes);
  files['manifest.json'] = strToU8(JSON.stringify({ ...archive.manifest, version: 2 }));
  await assert.rejects(decodeBackup(zipSync(files), checksum), /version does not match/);
});
test('custom items and correction history round-trip through a version 2 backup', async () => {
  const state = emptyRegister();
  state.routes = [{ id: 'route', name: 'Temple Road' }];
  state.boys = [{ id: 'boy', name: 'Binu' }];
  state.households = [{ id: 'h', phone: '', versions: [{ month: '2026-06', name: 'Anu', routeId: 'route',
    boyId: 'boy', position: 1, active: true, subscriptions: [] }] }];
  state.bills = [{ id: 'bill', customerId: 'h', month: '2026-06', name: 'Anu', routeId: 'route', boyId: 'boy',
    position: 1, lines: [], carry: [], preparedTotal: 0, customItems: [{ id: 'extra', name: 'വിശേഷ പതിപ്പ്', amount: 3075 }] }];
  state.activity = [{ id: 'activity', at: state.updatedAt, action: 'Corrected bill', customerId: 'h',
    correction: { billId: 'bill', item: 'വിശേഷ പതിപ്പ്', before: 0, after: 3075 } }];
  const archive = await encodeBackup(state, {}, checksum);
  const restored = await decodeBackup(archive.bytes, checksum);
  assert.equal(restored.manifest.version, 2);
  assert.deepEqual(restored.state, state);
  assert.equal(billCharge(restored.state.bills[0]), 3075);
  const files = unzipSync(archive.bytes);
  files['manifest.json'] = strToU8(JSON.stringify({ ...archive.manifest, version: 1 }));
  await assert.rejects(decodeBackup(zipSync(files), checksum), /version does not match/);
});
test('payment image bytes survive backup and missing images prevent creating one',async()=>{
  const state=emptyRegister();state.routes=[{id:'route',name:'Temple Road'}];state.boys=[{id:'boy',name:'Binu'}];
  state.households=[{id:'h',phone:'',versions:[{month:'2026-06',name:'Anu',routeId:'route',boyId:'boy',position:1,active:false,subscriptions:[]}]}];
  state.payments=[{id:'p',customerId:'h',amount:10000,creditAfter:'2026-06',images:['photo.png'],enteredAt:state.updatedAt,updatedAt:state.updatedAt}];
  await assert.rejects(encodeBackup(state,{},checksum),/image is missing/);
  const bytes=new Uint8Array([137,80,78,71,1,2,3]); const archive=await encodeBackup(state,{'photo.png':bytes},checksum);
  const restored=await decodeBackup(archive.bytes,checksum);assert.deepEqual(restored.files['images/photo.png'],bytes);
  assert.deepEqual(restored.state,state);
});
test('version 4 restores a split payment and its receipt as one payment', async () => {
  const state = emptyRegister();
  state.routes = [{ id: 'route', name: 'Temple Road' }];
  state.boys = [{ id: 'boy', name: 'Binu' }];
  state.households = [{ id: 'h', phone: '', versions: [{ month: '2026-06', name: 'Anu', routeId: 'route',
    boyId: 'boy', position: 1, active: false, subscriptions: [] }] }];
  state.payments = [{ id: 'p', customerId: 'h', amount: 50000, method: 'split', split: { cash: 20000, upi: 30000 },
    targetMonth: '2026-06', creditAfter: '2026-06', collectedOn: '2026-07-01', images: ['photo.png'],
    enteredAt: state.updatedAt, updatedAt: state.updatedAt }];
  const image = new Uint8Array([137,80,78,71,1,2,3]);
  const archive = await encodeBackup(state, { 'photo.png': image }, checksum);
  assert.equal(archive.manifest.version, 4);
  const restored = await decodeBackup(archive.bytes, checksum);
  assert.deepEqual(restored.state, state);
  assert.deepEqual(restored.files['images/photo.png'], image);
  const files = unzipSync(archive.bytes);
  files['manifest.json'] = strToU8(JSON.stringify({ ...archive.manifest, version: 3 }));
  await assert.rejects(decodeBackup(zipSync(files), checksum), /version does not match/);
});
test('version 5 preserves inactive periodicals and payment activity links', async () => {
  const state = emptyRegister();
  state.periodicals = [{ id: 'old', name: 'Old paper', code: 'OP', inactive: true, rates: [{ month: '2026-06', amount: 20000 }] }];
  state.activity = [{ id: 'event', at: state.updatedAt, action: 'Recorded payment', customerId: 'household',
    paymentId: 'deleted-payment', amount: 15000 }];
  const archive = await encodeBackup(state, {}, checksum);
  assert.equal(archive.manifest.version, 5);
  assert.deepEqual((await decodeBackup(archive.bytes, checksum)).state, state);
});

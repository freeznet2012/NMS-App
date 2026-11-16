const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { unzipSync, zipSync, strToU8, strFromU8 } = require('fflate');
const { emptyRegister } = require('../.test-build/model');
const { encodeBackup, decodeBackup } = require('../.test-build/backup-format');
const checksum=async bytes=>createHash('sha256').update(bytes).digest('hex');
test('portable backup preserves preferences, timestamps, and activity',async()=>{
  const state=emptyRegister(); state.language='ml'; state.activity.push({id:'activity',at:state.updatedAt,action:'Test action'});
  const archive=await encodeBackup(state,{},checksum); const restored=await decodeBackup(archive.bytes,checksum);
  assert.deepEqual(restored.state,state); assert.equal(restored.manifest.lastChanged,state.updatedAt);
});
test('corrupt data and unsupported backup versions are rejected before restore',async()=>{
  const archive=await encodeBackup(emptyRegister(),{},checksum);
  const files=unzipSync(archive.bytes); files['register.json']=strToU8('{}');
  await assert.rejects(decodeBackup(zipSync(files),checksum),/verification failed/);
  const original=unzipSync(archive.bytes); const manifest=JSON.parse(strFromU8(original['manifest.json'])); manifest.version=2;
  original['manifest.json']=strToU8(JSON.stringify(manifest)); await assert.rejects(decodeBackup(zipSync(original),checksum));
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

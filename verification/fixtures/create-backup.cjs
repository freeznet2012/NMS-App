// Synthetic recovery fixture; run after npm test compiles the domain modules.
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { emptyRegister } = require('../../.test-build/model');
const { parseWorkbook, applyImport } = require('../../.test-build/import');
const { prepareMonth } = require('../../.test-build/billing');
const { encodeBackup, decodeBackup } = require('../../.test-build/backup-format');
const checksum = async bytes => createHash('sha256').update(bytes).digest('hex');
let serial = 0; const id = () => 'recovery-' + ++serial;
(async () => {
  const state = emptyRegister();
  const bytes = fs.readFileSync('verification/fixtures/temple-road.xlsx');
  applyImport(state, parseWorkbook(bytes, state, '2026-06', await checksum(bytes), 'Temple Road', id), '2026-06', id);
  prepareMonth(state, '2026-06', id);
  state.payments.push({ id: id(), customerId: state.households[0].id, amount: 30000, creditAfter: '2026-06',
    images: ['sample-image.png'], enteredAt: state.updatedAt, updatedAt: state.updatedAt });
  state.activity.push({ id: id(), at: state.updatedAt, action: 'Synthetic recovery fixture', customerId: state.households[0].id });
  const archive = await encodeBackup(state, { 'sample-image.png': fs.readFileSync('assets/newspaper.png') }, checksum);
  await decodeBackup(archive.bytes, checksum);
  fs.writeFileSync('verification/fixtures/temple-road-recovery.nms', archive.bytes);
  console.log('Created verified fixture: 42 households, payment ₹300, one synthetic image. June remaining ₹18,900.');
})();

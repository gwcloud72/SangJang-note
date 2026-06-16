import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'public/data/ipos.json');
const errors = [];
const allowed = new Set(['예비심사', '수요예측', '청약 예정', '청약 진행중', '환불일', '상장']);
function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
function normalizeDate(value) {
  const text = String(value || '').trim();
  if (/^\d{8}$/.test(text)) return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return '';
}
function kstDateOnly(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function hasDartSource(item, key) {
  if (key === 'refund') return item.refundDateSource === 'dart-document' || item.detailSource === 'document';
  if (key === 'listing') return item.listingDateSource === 'dart-document' || item.detailSource === 'document';
  return false;
}
function alertCandidateCount(item, today) {
  const status = String(item.status || item.stage || '').trim();
  const schedule = normalizeDate(item.scheduleStart || item.date || item.reportDate || item.receiptDate || item.rceptDt);
  const start = normalizeDate(item.subscriptionStart || item.subscriptionDate);
  const end = normalizeDate(item.subscriptionEnd || item.subscriptionDate || start);
  const refund = hasDartSource(item, 'refund') ? normalizeDate(item.refundDate) : '';
  const listing = hasDartSource(item, 'listing') ? normalizeDate(item.listingDate) : '';
  let count = 0;
  if (status === '예비심사' && schedule && schedule >= today) count += 1;
  if (start && today < start) count += 1;
  if (start && end && start <= today && today <= end) count += 1;
  if (refund && (!end || end < today) && today <= refund) count += 1;
  if (listing && (!refund || refund < today) && today <= listing) count += 1;
  return count;
}

if (!fs.existsSync(file)) {
  console.log('alerts:check skipped: public/data/ipos.json 없음');
  process.exit(0);
}
const payload = readJson(file);
const metadataReferenceDate = String(payload?.metadata?.referenceDate || '').slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(metadataReferenceDate)) errors.push('public/data/ipos.json: metadata.referenceDate가 필요합니다.');
const today = kstDateOnly();
const items = Array.isArray(payload.items) ? payload.items : [];
let alertableCount = 0;
for (const [index, item] of items.entries()) {
  const name = String(item.companyName || item.company || item.corpName || item.name || '').trim() || `items[${index}]`;
  const status = String(item.status || item.stage || '').trim();
  const start = normalizeDate(item.subscriptionStart || item.subscriptionDate);
  const end = normalizeDate(item.subscriptionEnd || item.subscriptionDate || start);
  const refund = normalizeDate(item.refundDate);
  const listing = normalizeDate(item.listingDate);
  if (!allowed.has(status)) errors.push(`${name}: 알림 상태는 예비심사/청약 예정/청약 진행중/환불일/상장 중 하나여야 합니다. 현재 ${status || '없음'}`);
  if (status === '청약 예정' && start && start <= today) errors.push(`${name}: 청약 예정은 기준일 전 일정만 허용됩니다.`);
  if (status === '청약 진행중' && !(start && end && start <= today && today <= end)) errors.push(`${name}: 청약 진행중은 기준일이 청약 기간 안에 있을 때만 허용됩니다.`);
  if (status === '환불일' && !(end && refund && end < today && today <= refund && hasDartSource(item, 'refund'))) errors.push(`${name}: 환불일 상태는 DART 환불일 출처와 기간 조건이 필요합니다.`);
  if (status === '상장' && !(listing && hasDartSource(item, 'listing'))) errors.push(`${name}: 상장 상태는 DART 상장일 출처가 필요합니다.`);
  alertableCount += alertCandidateCount(item, today);
}
if (items.length && alertableCount === 0) errors.push('청약 알림 후보가 0개입니다. 기준일과 일정 데이터를 확인하세요.');
if (errors.length) {
  console.error('alerts:check failed');
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}
console.log('alerts:check passed');
console.log(`alert candidates: ${alertableCount}`);

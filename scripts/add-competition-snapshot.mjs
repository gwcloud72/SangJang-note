import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { formatKstDateTime, stableId, normalizeIpoItem, isSubscriptionDay } from './competition-parser.mjs';

const root = process.cwd();
const outputPath = path.join(root, 'public/data/competition-snapshots.json');
const iposPath = path.join(root, 'public/data/ipos.json');

function env(name, fallback = '') { return String(process.env[name] || fallback).trim(); }
function numberEnv(name, optional = false) {
  const raw = env(name);
  if (!raw && optional) return null;
  const value = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name}: 양수 숫자가 필요합니다.`);
  return value;
}
async function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch { return fallback; }
}
async function resolveIpo(companyName) {
  const payload = await readJson(iposPath, { items: [] });
  const item = Array.isArray(payload.items) ? payload.items.find((row) => String(row.companyName || row.company || '').trim() === companyName) : null;
  return item ? normalizeIpoItem(item) : { id: companyName, companyName, subscriptionStart: '', subscriptionEnd: '' };
}

async function main() {
  const companyName = env('COMPANY_NAME');
  if (!companyName) throw new Error('COMPANY_NAME이 필요합니다.');
  const underwriter = env('UNDERWRITER', '주관사 확인');
  const capturedKstTime = env('CAPTURED_KST_TIME', formatKstDateTime());
  const totalCompetition = numberEnv('TOTAL_COMPETITION');
  const proportionalCompetition = numberEnv('PROPORTIONAL_COMPETITION', true);
  const sourceLabel = env('SOURCE_LABEL', '확인 입력');
  const sourceUrl = env('SOURCE_URL');
  const ipo = await resolveIpo(companyName);
  const ipoId = env('IPO_ID') || ipo.id;
  const capturedDate = new Date(capturedKstTime).toString() === 'Invalid Date' ? new Date() : new Date(capturedKstTime);
  if (!isSubscriptionDay(ipo, capturedDate)) {
    throw new Error(`${companyName}: 청약 진행일이 아니라 경쟁률 확인값을 저장하지 않습니다.`);
  }
  const capturedAt = capturedDate.toISOString();

  const snapshot = {
    id: stableId(`${ipoId}:${underwriter}:${capturedKstTime}:${totalCompetition}`, 'snapshot'),
    ipoId,
    companyName,
    underwriter,
    capturedAt,
    capturedKstTime,
    totalCompetition,
    proportionalCompetition,
    sourceType: 'manual',
    sourceLabel,
    sourceUrl,
    confidence: 'verified',
    createdAt: new Date().toISOString(),
  };

  const current = await readJson(outputPath, { metadata: {}, items: [] });
  const items = Array.isArray(current.items) ? current.items : [];
  const merged = [...items.filter((item) => item.id !== snapshot.id), snapshot]
    .sort((a, b) => String(b.capturedAt || '').localeCompare(String(a.capturedAt || '')))
    .slice(0, 120);
  const payload = {
    metadata: {
      source: 'manual-snapshot',
      displayLabel: '확인 입력',
      updatedAt: new Date().toISOString(),
      updatedKst: formatKstDateTime(),
      policy: '관리자가 확인한 청약 경쟁률입니다. 최종 배정 결과와 다를 수 있습니다.',
    },
    items: merged,
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(payload, null, 2) + '\n');
  console.log(`competition snapshot added: ${companyName} ${totalCompetition}:1`);
}

main().catch((error) => { console.error(error); process.exit(1); });

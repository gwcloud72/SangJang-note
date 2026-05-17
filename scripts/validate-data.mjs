import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const DATA_PATH = new URL('../public/data/ipos.json', import.meta.url);
const payload = JSON.parse(await readFile(DATA_PATH, 'utf8'));

if (!payload || !Array.isArray(payload.items)) {
  throw new Error('public/data/ipos.json must contain an items array.');
}

const dataSource = String(payload?.metadata?.source || '').trim().toLowerCase();
if (payload.items.length > 0 && dataSource && dataSource !== 'opendart') {
  throw new Error('public/data/ipos.json contains a non-live data source. Run update:data before deployment.');
}

for (const [index, item] of payload.items.entries()) {
  if (!item || typeof item !== 'object') {
    throw new Error(`items[${index}] must be an object.`);
  }
  if (!item.companyName) {
    throw new Error(`items[${index}] companyName is required.`);
  }
  if (!item.scheduleStart && !item.subscriptionDate) {
    console.warn(`items[${index}] ${item.companyName}: scheduleStart 또는 subscriptionDate 확인 필요`);
  }
}

console.log(`Data validation passed: ${payload.items.length} item(s).`);

const REPORT_PATH = new URL('../public/data/ipo-ai-report.json', import.meta.url);
const FORBIDDEN_WORD_PATTERN = /(추천|권유|수익률|수익|전망|매수|매도|유망|투자\s*포인트)/;

if (existsSync(REPORT_PATH)) {
  const report = JSON.parse(await readFile(REPORT_PATH, 'utf8'));
  if (!report || !Array.isArray(report.lines)) {
    throw new Error('public/data/ipo-ai-report.json must contain a lines array when present.');
  }
  for (const [index, line] of report.lines.entries()) {
    if (typeof line !== 'string' || !line.trim()) {
      throw new Error(`ipo-ai-report.lines[${index}] must be a non-empty string.`);
    }
    if (FORBIDDEN_WORD_PATTERN.test(line)) {
      throw new Error(`ipo-ai-report.lines[${index}] contains investment-like wording.`);
    }
  }
  console.log(`Report validation passed: ${report.lines.length} line(s).`);
}

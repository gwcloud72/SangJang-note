import { readFile } from 'node:fs/promises';

const DATA_PATH = new URL('../public/data/ipos.json', import.meta.url);
const payload = JSON.parse(await readFile(DATA_PATH, 'utf8'));

if (!payload || !Array.isArray(payload.items)) {
  throw new Error('public/data/ipos.json must contain an items array.');
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

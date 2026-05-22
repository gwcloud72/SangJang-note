#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

function readJsonIfExists(filePath, { optional = false } = {}) {
  if (!fs.existsSync(filePath)) {
    if (!optional) errors.push(`${path.relative(root, filePath)}: 파일이 없습니다.`);
    else warnings.push(`${path.relative(root, filePath)}: 운영 데이터 파일 없음 - empty state로 렌더링됩니다.`);
    return null;
  }
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (error) { errors.push(`${path.relative(root, filePath)}: JSON parse 실패 (${error.message})`); return null; }
}

function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function safeUrl(value) {
  if (!value) return true;
  try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol); }
  catch { return false; }
}

function validateIpos(payload, label) {
  if (!isObject(payload)) { errors.push(`${label}: 루트는 객체여야 합니다.`); return; }
  if (payload.items !== undefined && !Array.isArray(payload.items)) { errors.push(`${label}.items: 배열이어야 합니다.`); return; }
  const items = Array.isArray(payload.items) ? payload.items : [];
  items.forEach((item, index) => {
    if (!isObject(item)) { errors.push(`${label}.items[${index}]: 객체여야 합니다.`); return; }
    const name = item.company || item.companyName || item.corpName || item.name;
    if (name !== undefined && String(name).trim() === '') warnings.push(`${label}.items[${index}]: 기업명이 비어 있습니다.`);
    const url = item.dartUrl || item.url || item.link;
    if (!safeUrl(url)) errors.push(`${label}.items[${index}]: 공시 URL은 http/https만 허용됩니다.`);
  });
}

function validateReport(payload, label) {
  if (!isObject(payload)) { errors.push(`${label}: 루트는 객체여야 합니다.`); return; }
  if (payload.metadata !== undefined && !isObject(payload.metadata)) warnings.push(`${label}.metadata: 객체가 아니면 메타 정보는 fallback으로 표시됩니다.`);
}

function validateFixtureBundle(payload, label) {
  if (!isObject(payload)) { errors.push(`${label}: fixture bundle은 객체여야 합니다.`); return; }
  for (const key of ['normal', 'edge', 'empty']) {
    if (!isObject(payload[key])) { errors.push(`${label}.${key}: fixture 객체가 필요합니다.`); continue; }
    validateIpos(payload[key].ipos, `${label}.${key}.ipos`);
    validateReport(payload[key].report, `${label}.${key}.report`);
  }
}

const ipos = readJsonIfExists(path.join(root, 'public/data/ipos.json'), { optional: true });
if (ipos) validateIpos(ipos, 'public/data/ipos.json');
const report = readJsonIfExists(path.join(root, 'public/data/ipo-ai-report.json'), { optional: true });
if (report) validateReport(report, 'public/data/ipo-ai-report.json');
const fixtures = readJsonIfExists(path.join(root, 'scripts/fixtures/data-contract-fixtures.json'));
if (fixtures) validateFixtureBundle(fixtures, 'scripts/fixtures/data-contract-fixtures.json');

if (warnings.length) { console.log('data:check warnings'); warnings.forEach((message) => console.log(`- ${message}`)); }
if (errors.length) { console.error('data:check failed'); errors.forEach((message) => console.error(`- ${message}`)); process.exit(1); }
console.log('data:check passed');

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const extensions = new Set(['.ts', '.tsx', '.mjs', '.cjs', '.js', '.yml', '.yaml']);
const ignored = new Set([
  path.normalize('scripts/date-literal-check.mjs'),
]);
const isoDateLiteral = /(?<![\\\w])20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])(?![\\\w])/g;
const kstTimestampLiteral = /(?<![\\\w])20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})(?![\\\w])/g;
const shortDateLiteral = /(['\"`])(?:0[1-9]|1[0-2])\.(?:0[1-9]|[12]\d|3[01])\1/g;
const ddayLiteral = /(['\"`])D-[1-9]\d*\1/g;

function walk(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target).flatMap((entry) => walk(path.join(target, entry)));
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

for (const file of ['src', 'scripts', '.github/workflows'].flatMap((entry) => walk(path.join(root, entry)))) {
  const rel = path.relative(root, file);
  if (ignored.has(path.normalize(rel)) || !extensions.has(path.extname(file))) continue;
  const source = fs.readFileSync(file, 'utf8');
  const matches = [
    ...source.matchAll(kstTimestampLiteral),
    ...source.matchAll(isoDateLiteral),
    ...source.matchAll(shortDateLiteral),
    ...source.matchAll(ddayLiteral),
  ].filter((match) => !source.slice(Math.max(0, match.index - 12), match.index).includes('RegExp'));
  for (const match of matches) {
    errors.push(`${rel}:${lineNumber(source, match.index)} 고정 날짜 리터럴 금지 (${match[0]})`);
  }
}

if (errors.length) {
  console.error('date:check failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('date:check passed');

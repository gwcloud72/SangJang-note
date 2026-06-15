import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const updateScript = fileURLToPath(new URL('./update-ipos.mjs', import.meta.url));

function runNode(scriptPath, options = {}) {
 return new Promise((resolve) => {
  const child = spawn(process.execPath, [scriptPath], {
   cwd: projectRoot,
   env: options.env,
   stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.on('close', (status) => resolve({ status, stdout, stderr }));
 });
}

const tempDir = await mkdtemp(path.join(tmpdir(), 'dart-empty-collection-'));
const outputPath = path.join(tempDir, 'ipos.json');
const emptyPayload = {
 metadata: {
  updatedAt: '2026-06-15T00:00:00.000Z',
  source: 'OpenDART',
  referenceDate: '2026-06-15',
  status: 'empty',
  totalItems: 0,
 },
 items: [],
};

try {
 await writeFile(outputPath, `${JSON.stringify(emptyPayload, null, 2)}\n`, 'utf8');
 const env = { ...process.env, DART_API_KEY: '', DART_IPOS_OUTPUT_PATH: outputPath };
 const result = await runNode(updateScript, { env });
 if (result.status !== 0) {
  throw new Error(`빈 IPO 컬렉션 유지 검증 실패: exit=${result.status}\n${result.stdout}${result.stderr}`);
 }
 const after = JSON.parse(await readFile(outputPath, 'utf8'));
 if (!Array.isArray(after.items) || after.items.length !== 0) {
  throw new Error('빈 IPO 컬렉션이 유지되지 않았습니다.');
 }
 if (after.metadata?.status !== 'empty') {
  throw new Error('빈 IPO 컬렉션 metadata.status가 유지되지 않았습니다.');
 }
 console.log('dart-empty:check passed');
} finally {
 await rm(tempDir, { recursive: true, force: true });
}

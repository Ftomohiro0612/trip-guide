// Isolated transpilation lets node:test run the repo's TypeScript tests on Node 20+.
// No Next build, dependency sharing, persistent emitted files, or runtime-canon load.
import { mkdtemp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const output = await mkdtemp(join(tmpdir(), 'memorips-soudan-test-'));
try {
  const files = (await readdir('lib/soudan')).filter((name) => name.endsWith('.ts')).map((name) => `lib/soudan/${name}`);
  files.push('lib/config.ts', 'components/analytics-url.ts', 'components/analytics-url.test.ts');
  for (const file of files) {
    const source = (await readFile(file, 'utf8')).replace(/\.ts(["'])/g, '.js$1');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } });
    const destination = join(output, file.replace(/\.ts$/, '.js'));
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, compiled.outputText);
  }
  const tests = files.filter((file) => file.endsWith('.test.ts')).map((file) => resolve(output, file.replace(/\.ts$/, '.js')));
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...tests], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  // Only the exact mkdtemp-created directory is removed.
  await rm(output, { recursive: true, force: true });
}

import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? files(path.join(directory, entry.name)) : entry.name.endsWith('.js') ? [path.join(directory, entry.name)] : []));
  return nested.flat();
}
const sources = [...await files('backend'), ...await files('frontend'), ...await files('tests')];
for (const source of sources) {
  const result = spawnSync(process.execPath, ['--check', source], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax check passed for ${sources.length} JavaScript files.`);

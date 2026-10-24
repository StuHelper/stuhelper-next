import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function cacheBytes(directory) {
  if (!fs.existsSync(directory)) return 0;
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return total + cacheBytes(target);
    return total + (entry.isFile() ? fs.statSync(target).size : 0);
  }, 0);
}
export function eligible(bytes, limitMiB) {
  return bytes > 0 && bytes <= limitMiB * 1024 ** 2;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [directory, limit] = process.argv.slice(2);
  const limitMiB = Number(limit);
  if (!directory || !Number.isSafeInteger(limitMiB) || limitMiB <= 0) throw new Error('Use ci-cache.mjs DIRECTORY POSITIVE_LIMIT_MIB');
  const bytes = cacheBytes(directory);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `save=${eligible(bytes, limitMiB)}\n`);
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Dependency cache: ${(bytes / 1024 ** 2).toFixed(1)} MiB; upload limit ${limitMiB} MiB; eligible: ${eligible(bytes, limitMiB)}.\n`);
}

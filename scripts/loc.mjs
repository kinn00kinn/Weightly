import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

async function files(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await files(path));
    else if (['.js', '.jsx', '.mjs', '.css'].includes(extname(entry.name))) out.push(path);
  }
  return out;
}

async function count(dirs) {
  let total = 0;
  for (const dir of dirs) {
    for (const file of await files(dir)) {
      const text = await readFile(file, 'utf8');
      total += text.split('\n').filter((line) => line.trim()).length;
    }
  }
  return total;
}

const source = await count(['src', 'worker', 'functions']);
const tests = await count(['test']);
console.log(`Source LOC (nonblank): ${source}`);
console.log(`Test LOC (nonblank):   ${tests}`);
console.log(`Source LOC budget:     650`);
if (source > 650) process.exitCode = 1;

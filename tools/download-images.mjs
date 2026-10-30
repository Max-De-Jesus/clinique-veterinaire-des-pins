// Télécharge les images listées dans tools/images.txt vers assets/img/.
// Usage : node tools/download-images.mjs   (Node 18+ requis pour fetch)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'assets', 'img');

const manifest = await readFile(path.join(root, 'tools', 'images.txt'), 'utf8');
const entries = manifest
  .split(/\r?\n/)
  .filter((line) => line.trim() && !line.startsWith('#'))
  .map((line) => line.split('|').map((part) => part.trim()));

await mkdir(outDir, { recursive: true });

let failures = 0;
for (const [file, id, width] of entries) {
  const url = `https://images.unsplash.com/${id}?w=${width}&q=72&fm=jpg&fit=crop`;
  const res = await fetch(url);
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.startsWith('image/')) {
    failures += 1;
    console.error(`ÉCHEC ${file} (${res.status} ${type})`);
    continue;
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(outDir, file), bytes);
  console.log(`OK ${file} ${Math.round(bytes.length / 1024)} Ko`);
}

console.log(`attendu=${entries.length}, réussis=${entries.length - failures}`);
if (failures > 0) process.exit(1);

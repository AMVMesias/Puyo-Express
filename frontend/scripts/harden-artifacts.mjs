import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = path.join(root, 'dist');
const leafletPackage = JSON.parse(
  await readFile(path.join(root, 'node_modules', 'leaflet', 'package.json'), 'utf8'),
);
const exposedVersion = leafletPackage.version;
let replacements = 0;

async function hardenDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await hardenDirectory(target);
      continue;
    }
    if (!entry.name.endsWith('.js') && !entry.name.endsWith('.css')) continue;

    const source = await readFile(target, 'utf8');
    const hardened = source.replaceAll(exposedVersion, 'version-redacted');
    if (source !== hardened) {
      replacements += source.split(exposedVersion).length - 1;
      await writeFile(target, hardened, 'utf8');
    }
  }
}

await hardenDirectory(distDirectory);

const remainingFiles = [];
async function verifyDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await verifyDirectory(target);
      continue;
    }
    if (!entry.name.endsWith('.js') && !entry.name.endsWith('.css')) continue;
    if ((await readFile(target, 'utf8')).includes(exposedVersion)) {
      remainingFiles.push(path.relative(distDirectory, target));
    }
  }
}

await verifyDirectory(distDirectory);
if (remainingFiles.length > 0) {
  throw new Error(`La versión de Leaflet sigue expuesta en: ${remainingFiles.join(', ')}`);
}

console.log(`Artefactos endurecidos: ${replacements} referencia(s) de versión de Leaflet retirada(s).`);

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'psicarte.db');
const WAL_PATH = DB_PATH + '-wal';
const SHM_PATH = DB_PATH + '-shm';

for (const f of [DB_PATH, WAL_PATH, SHM_PATH]) {
  try {
    fs.unlinkSync(f);
    console.log(`Eliminado: ${f}`);
  } catch {
    // ignore if not exists
  }
}

console.log('Base de datos eliminada. Ejecutando db:init...');

await import('./init.js');

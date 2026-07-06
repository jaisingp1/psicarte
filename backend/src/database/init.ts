import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'psicarte.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SEED_PATH = path.join(__dirname, 'seed.sql');

const args = process.argv.slice(2);
const schemaOnly = args.includes('--schema-only');
const seedOnly = args.includes('--seed-only');

async function run() {
  const SQL = await initSqlJs();

  let db: ReturnType<typeof SQL.Database>;

  if (seedOnly && fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('Base existente cargada.');
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys=ON;');

  if (!seedOnly) {
    console.log('Ejecutando schema.sql...');
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.run(schema);
    console.log('Esquema creado correctamente.');
  }

  if (!schemaOnly) {
    console.log('Ejecutando seed.sql...');
    const seed = fs.readFileSync(SEED_PATH, 'utf-8');
    db.run(seed);
    console.log('Datos iniciales insertados correctamente.');
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();

  console.log(`Base de datos lista: ${DB_PATH}`);
}

run().catch(err => {
  console.error('Error inicializando la base de datos:', err);
  process.exit(1);
});

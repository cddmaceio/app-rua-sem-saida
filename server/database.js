import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'app.sqlite'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_cliente TEXT,
    nome_cliente TEXT,
    tipo_cliente TEXT,
    prioridade TEXT,
    tempo_espera TEXT,
    setor TEXT,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    latitude REAL,
    longitude REAL,
    sem_saida TEXT DEFAULT 'Nao',
    distancia_metros REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ruas_sem_saida (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    osm_id TEXT,
    nome TEXT,
    geojson TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Config table with migration support
const colExists = db.prepare("PRAGMA table_info('configuracao')").all().some(c => c.name === 'modo_calculo');

if (!colExists) {
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='configuracao'").get();
  if (tableExists) {
    db.exec(`ALTER TABLE configuracao ADD COLUMN modo_calculo TEXT DEFAULT 'ponto_final'`);
    db.exec(`UPDATE configuracao SET modo_calculo = 'ponto_final' WHERE modo_calculo IS NULL`);
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS configuracao (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        raio_busca INTEGER DEFAULT 50,
        modo_calculo TEXT DEFAULT 'ponto_final'
      );
      INSERT OR IGNORE INTO configuracao (id, raio_busca, modo_calculo) VALUES (1, 50, 'ponto_final');
    `);
  }
} else {
  db.exec(`UPDATE configuracao SET modo_calculo = 'ponto_final' WHERE modo_calculo IS NULL`);
}

export default db;

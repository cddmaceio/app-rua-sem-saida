# Sistema de Análise de Clientes em Ruas Sem Saída — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local full-stack SPA that identifies customers near dead-end streets in Maceió/AL using geospatial analysis.

**Architecture:** Vite+React frontend on :5173 proxies `/api` to Express on :3001. Frontend parses files with SheetJS and sends to backend. Backend stores data in SQLite via better-sqlite3, runs Turf.js calculations, and exposes REST API. Leaflet+React-Leaflet renders map with colored markers.

**Tech Stack:** Vite, React 18, Express, better-sqlite3, Turf.js, Leaflet, React-Leaflet, SheetJS/xlsx, concurrently, pure CSS

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: directories: `server/`, `server/routes/`, `server/data/`, `src/`, `src/components/`, `src/utils/`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "app-rua-sem-saida",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "node server/index.js",
    "client": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@turf/turf": "^7.0.0",
    "better-sqlite3": "^11.3.0",
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "leaflet": "^1.9.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-leaflet": "^4.2.1",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "concurrently": "^9.0.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create vite.config.js**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
```

- [ ] **Step 3: Create directory structure**

Run:
```
New-Item -ItemType Directory -Path "server\routes" -Force
New-Item -ItemType Directory -Path "server\data" -Force
New-Item -ItemType Directory -Path "src\components" -Force
New-Item -ItemType Directory -Path "src\utils" -Force
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: All packages installed without errors.

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rua Sem Saída - Análise de Clientes</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 6: Commit**

```bash
git add package.json vite.config.js index.html server/ src/
git commit -m "feat: scaffold project with Vite+React+Express structure"
```

---

### Task 2: Database Module

**Files:**
- Create: `server/database.js`

- [ ] **Step 1: Create server/database.js**

```js
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

  CREATE TABLE IF NOT EXISTS configuracao (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    raio_busca INTEGER DEFAULT 50
  );

  INSERT OR IGNORE INTO configuracao (id, raio_busca) VALUES (1, 50);
`);

export default db;
```

- [ ] **Step 2: Verify database creation**

Run: `node -e "import('./server/database.js').then(m => { const r = m.default.prepare('SELECT raio_busca FROM configuracao WHERE id=1').get(); console.log('Config OK:', r); })"`
Expected: `Config OK: { raio_busca: 50 }`

- [ ] **Step 3: Commit**

```bash
git add server/database.js
git commit -m "feat: add SQLite database module with clientes, ruas, config tables"
```

---

### Task 3: Express Server Entry

**Files:**
- Create: `server/index.js`

- [ ] **Step 1: Create server/index.js**

```js
import express from 'express';
import cors from 'cors';
import clientesRouter from './routes/clientes.js';
import ruasRouter from './routes/ruas.js';
import analiseRouter from './routes/analise.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/clientes', clientesRouter);
app.use('/api/ruas', ruasRouter);
app.use('/api', analiseRouter);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
```

- [ ] **Step 2: Verify server starts (routes will 404 until created)**

Run: `node server/index.js` (terminate after confirming)
Expected: `Servidor rodando em http://localhost:3001`

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat: add Express server entry with health endpoint and route mounting"
```

---

### Task 4: Clientes API Routes

**Files:**
- Create: `server/routes/clientes.js`

- [ ] **Step 1: Create server/routes/clientes.js**

```js
import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  const { sem_saida, setor, busca } = req.query;
  let query = 'SELECT * FROM clientes WHERE 1=1';
  const params = [];

  if (sem_saida) {
    query += ' AND sem_saida = ?';
    params.push(sem_saida);
  }
  if (setor) {
    query += ' AND setor = ?';
    params.push(setor);
  }
  if (busca) {
    query += ' AND (codigo_cliente LIKE ? OR nome_cliente LIKE ?)';
    params.push(`%${busca}%`, `%${busca}%`);
  }

  query += ' ORDER BY sem_saida DESC, distancia_metros ASC';
  const clientes = db.prepare(query).all(...params);
  res.json(clientes);
});

router.post('/importar', (req, res) => {
  const { clientes, substituir } = req.body;

  if (!Array.isArray(clientes) || clientes.length === 0) {
    return res.status(400).json({ erro: 'Array de clientes vazio ou invalido' });
  }

  if (substituir) {
    db.prepare('DELETE FROM clientes').run();
  }

  const insert = db.prepare(`
    INSERT INTO clientes (codigo_cliente, nome_cliente, tipo_cliente, prioridade, tempo_espera, setor, endereco, cidade, estado, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insert.run(
        row.codigo_cliente || null,
        row.nome_cliente || null,
        row.tipo_cliente || null,
        row.prioridade || null,
        row.tempo_espera || null,
        row.setor || null,
        row.endereco || null,
        row.cidade || null,
        row.estado || null,
        row.latitude || null,
        row.longitude || null
      );
    }
  });

  insertMany(clientes);
  res.json({ importados: clientes.length });
});

router.delete('/', (req, res) => {
  const result = db.prepare('DELETE FROM clientes').run();
  res.json({ removidos: result.changes });
});

export default router;
```

- [ ] **Step 2: Verify clientes endpoints**

Start server with `node server/index.js` (keep running), then in another terminal:
```
curl http://localhost:3001/api/clientes
curl -X POST http://localhost:3001/api/clientes/importar -H "Content-Type: application/json" -d "{\"clientes\":[{\"codigo_cliente\":\"001\",\"nome_cliente\":\"Teste\",\"latitude\":-9.6658,\"longitude\":-35.7353}]}"
curl http://localhost:3001/api/clientes
curl -X DELETE http://localhost:3001/api/clientes
```
Expected: Empty array, `{"importados":1}`, array with 1 item, `{"removidos":1}`

- [ ] **Step 3: Commit**

```bash
git add server/routes/clientes.js
git commit -m "feat: add clientes CRUD API routes with import and delete"
```

---

### Task 5: Ruas API Routes

**Files:**
- Create: `server/routes/ruas.js`

- [ ] **Step 1: Create server/routes/ruas.js**

```js
import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  const ruas = db.prepare('SELECT * FROM ruas_sem_saida ORDER BY id').all();
  res.json(ruas);
});

router.post('/importar', (req, res) => {
  const { ruas, substituir } = req.body;

  if (!Array.isArray(ruas) || ruas.length === 0) {
    return res.status(400).json({ erro: 'Array de ruas vazio ou invalido' });
  }

  if (substituir) {
    db.prepare('DELETE FROM ruas_sem_saida').run();
  }

  const insert = db.prepare(`
    INSERT INTO ruas_sem_saida (osm_id, nome, geojson)
    VALUES (?, ?, ?)
  `);

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insert.run(
        row.osm_id || null,
        row.nome || null,
        row.geojson || null
      );
    }
  });

  insertMany(ruas);
  res.json({ importados: ruas.length });
});

router.delete('/', (req, res) => {
  const result = db.prepare('DELETE FROM ruas_sem_saida').run();
  res.json({ removidos: result.changes });
});

export default router;
```

- [ ] **Step 2: Verify ruas endpoints**

```
curl -X POST http://localhost:3001/api/ruas/importar -H "Content-Type: application/json" -d "{\"ruas\":[{\"osm_id\":\"123\",\"nome\":\"Rua Teste\",\"geojson\":\"{\\\"type\\\":\\\"LineString\\\",\\\"coordinates\\\":[[-35.735,-9.665],[-35.736,-9.666]]}\"}]}"
curl http://localhost:3001/api/ruas
curl -X DELETE http://localhost:3001/api/ruas
```
Expected: `{"importados":1}`, array with 1 item, `{"removidos":1}`

- [ ] **Step 3: Commit**

```bash
git add server/routes/ruas.js
git commit -m "feat: add ruas CRUD API routes with import and delete"
```

---

### Task 6: Análise, Configuração, and Export Routes

**Files:**
- Create: `server/routes/analise.js`

- [ ] **Step 1: Create server/routes/analise.js**

```js
import { Router } from 'express';
import * as turf from '@turf/turf';
import XLSX from 'xlsx';
import db from '../database.js';

const router = Router();

router.get('/configuracao', (req, res) => {
  const config = db.prepare('SELECT raio_busca FROM configuracao WHERE id = 1').get();
  res.json(config);
});

router.put('/configuracao', (req, res) => {
  const { raio_busca } = req.body;
  if (!raio_busca || raio_busca <= 0) {
    return res.status(400).json({ erro: 'Raio de busca invalido' });
  }
  db.prepare('UPDATE configuracao SET raio_busca = ? WHERE id = 1').run(raio_busca);
  res.json({ raio_busca });
});

router.post('/analise/recalcular', (req, res) => {
  const config = db.prepare('SELECT raio_busca FROM configuracao WHERE id = 1').get();
  const raio = config.raio_busca;

  const clientes = db.prepare('SELECT * FROM clientes').all();
  const ruas = db.prepare('SELECT * FROM ruas_sem_saida').all();

  if (clientes.length === 0) {
    return res.status(400).json({ erro: 'Nenhum cliente importado' });
  }
  if (ruas.length === 0) {
    return res.status(400).json({ erro: 'Nenhuma rua importada' });
  }

  const updateStmt = db.prepare('UPDATE clientes SET sem_saida = ?, distancia_metros = ? WHERE id = ?');
  let processados = 0;
  let ignorados = 0;

  const updateBatch = db.transaction(() => {
    for (const cliente of clientes) {
      const lat = Number(cliente.latitude);
      const lng = Number(cliente.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        ignorados++;
        continue;
      }

      const ponto = turf.point([lng, lat]);
      let menorDistancia = Infinity;

      for (const rua of ruas) {
        try {
          const geometria = JSON.parse(rua.geojson);
          let dist;

          if (geometria.type === 'LineString' || geometria.type === 'MultiLineString') {
            dist = turf.pointToLineDistance(ponto, geometria, { units: 'meters' });
          } else if (geometria.type === 'Point') {
            dist = turf.distance(ponto, geometria, { units: 'meters' });
          } else {
            continue;
          }

          if (dist < menorDistancia) {
            menorDistancia = dist;
          }
        } catch (e) {
          continue;
        }
      }

      const semSaida = menorDistancia <= raio ? 'Sim' : 'Nao';
      const distanciaFinal = menorDistancia === Infinity ? null : Math.round(menorDistancia * 100) / 100;

      updateStmt.run(semSaida, distanciaFinal, cliente.id);
      processados++;
    }
  });

  updateBatch();

  const totalSim = db.prepare("SELECT COUNT(*) as count FROM clientes WHERE sem_saida = 'Sim'").get().count;
  const totalNao = db.prepare("SELECT COUNT(*) as count FROM clientes WHERE sem_saida = 'Nao'").get().count;

  res.json({
    processados,
    ignorados,
    total_clientes: clientes.length,
    total_ruas: ruas.length,
    raio_busca: raio,
    em_rua_sem_saida: totalSim,
    fora: totalNao
  });
});

router.get('/resumo', (req, res) => {
  const totalClientes = db.prepare('SELECT COUNT(*) as count FROM clientes').get().count;
  const totalRuas = db.prepare('SELECT COUNT(*) as count FROM ruas_sem_saida').get().count;
  const emRuaSemSaida = db.prepare("SELECT COUNT(*) as count FROM clientes WHERE sem_saida = 'Sim'").get().count;
  const fora = db.prepare("SELECT COUNT(*) as count FROM clientes WHERE sem_saida = 'Nao'").get().count;
  const config = db.prepare('SELECT raio_busca FROM configuracao WHERE id = 1').get();
  const percentual = totalClientes > 0 ? Math.round((emRuaSemSaida / totalClientes) * 10000) / 100 : 0;

  res.json({
    total_clientes: totalClientes,
    em_rua_sem_saida: emRuaSemSaida,
    fora,
    total_ruas: totalRuas,
    raio_busca: config.raio_busca,
    percentual
  });
});

router.get('/exportar', (req, res) => {
  const clientes = db.prepare('SELECT * FROM clientes').all();
  const ruas = db.prepare('SELECT * FROM ruas_sem_saida').all();
  const config = db.prepare('SELECT * FROM configuracao WHERE id = 1').get();

  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(clientes);
  XLSX.utils.book_append_sheet(wb, ws1, 'base_cliente');

  const ws2 = XLSX.utils.json_to_sheet(ruas.map(r => ({
    id: r.id, osm_id: r.osm_id, nome: r.nome, geojson: r.geojson
  })));
  XLSX.utils.book_append_sheet(wb, ws2, 'base_ruas_sem_saidas');

  const resumoClientes = clientes.map(c => ({
    codigo_cliente: c.codigo_cliente,
    nome_cliente: c.nome_cliente,
    setor: c.setor,
    endereco: c.endereco,
    cidade: c.cidade,
    estado: c.estado,
    latitude: c.latitude,
    longitude: c.longitude,
    sem_saida: c.sem_saida,
    distancia_metros: c.distancia_metros
  }));
  const ws3 = XLSX.utils.json_to_sheet(resumoClientes);
  XLSX.utils.book_append_sheet(wb, ws3, 'resumo');

  const emRuaSemSaida = db.prepare("SELECT COUNT(*) as count FROM clientes WHERE sem_saida = 'Sim'").get().count;
  const ws4 = XLSX.utils.json_to_sheet([{
    raio_busca: config.raio_busca,
    total_clientes: clientes.length,
    total_ruas: ruas.length,
    em_rua_sem_saida: emRuaSemSaida,
    data_exportacao: new Date().toLocaleString('pt-BR')
  }]);
  XLSX.utils.book_append_sheet(wb, ws4, 'configuracao');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=analise_ruas_sem_saida.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

export default router;
```

- [ ] **Step 2: Verify análise endpoints**

Start server, then:
```
curl http://localhost:3001/api/configuracao
curl -X PUT http://localhost:3001/api/configuracao -H "Content-Type: application/json" -d "{\"raio_busca\":75}"
curl http://localhost:3001/api/resumo
```
Expected: `{"raio_busca":50}`, `{"raio_busca":75}`, summary object

- [ ] **Step 3: Commit**

```bash
git add server/routes/analise.js
git commit -m "feat: add config, recalculate, summary, and export API routes"
```

---

### Task 7: Frontend API Client

**Files:**
- Create: `src/api.js`

- [ ] **Step 1: Create src/api.js**

```js
const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ erro: res.statusText }));
    throw new Error(err.erro || 'Erro na requisicao');
  }
  return res;
}

export async function getClientes(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  const q = qs.toString();
  const res = await request(`/clientes${q ? '?' + q : ''}`);
  return res.json();
}

export async function importarClientes(clientes, substituir = false) {
  const res = await request('/clientes/importar', {
    method: 'POST',
    body: JSON.stringify({ clientes, substituir }),
  });
  return res.json();
}

export async function deletarClientes() {
  const res = await request('/clientes', { method: 'DELETE' });
  return res.json();
}

export async function getRuas() {
  const res = await request('/ruas');
  return res.json();
}

export async function importarRuas(ruas, substituir = false) {
  const res = await request('/ruas/importar', {
    method: 'POST',
    body: JSON.stringify({ ruas, substituir }),
  });
  return res.json();
}

export async function deletarRuas() {
  const res = await request('/ruas', { method: 'DELETE' });
  return res.json();
}

export async function getConfiguracao() {
  const res = await request('/configuracao');
  return res.json();
}

export async function atualizarConfiguracao(raio_busca) {
  const res = await request('/configuracao', {
    method: 'PUT',
    body: JSON.stringify({ raio_busca }),
  });
  return res.json();
}

export async function recalcular() {
  const res = await request('/analise/recalcular', { method: 'POST' });
  return res.json();
}

export async function getResumo() {
  const res = await request('/resumo');
  return res.json();
}

export function getExportarUrl() {
  return `${BASE}/exportar`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api.js
git commit -m "feat: add frontend API client with all endpoint wrappers"
```

---

### Task 8: Frontend Utilities

**Files:**
- Create: `src/utils/parseClientes.js`
- Create: `src/utils/geoUtils.js`

- [ ] **Step 1: Create src/utils/parseClientes.js**

```js
import * as XLSX from 'xlsx';

const COLUMN_MAP = {
  'codigo_cliente': ['codigo_cliente', 'codigo cliente', 'código cliente', 'codigo', 'código', 'cod_cliente'],
  'nome_cliente': ['nome_cliente', 'nome cliente', 'nome', 'cliente', 'razao_social', 'razão social', 'razao social'],
  'tipo_cliente': ['tipo_cliente', 'tipo cliente', 'tipo', 'categoria'],
  'prioridade': ['prioridade'],
  'tempo_espera': ['tempo_espera', 'tempo espera', 'tempo', 'espera'],
  'setor': ['setor', 'bairro'],
  'endereco': ['endereco', 'endereço', 'endereco_completo', 'endereço completo', 'logradouro'],
  'cidade': ['cidade', 'municipio', 'município'],
  'estado': ['estado', 'uf'],
  'latitude': ['latitude', 'lat'],
  'longitude': ['longitude', 'long', 'lng', 'lon'],
};

function normalizeHeader(h) {
  const cleaned = String(h).toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return cleaned;
}

function findColumn(headers, target) {
  const variants = COLUMN_MAP[target] || [target];
  for (const variant of variants) {
    const idx = headers.findIndex(h => h === normalizeHeader(variant));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (rows.length < 2) {
          return reject(new Error('Arquivo vazio ou sem dados'));
        }

        const rawHeaders = rows[0];
        const headers = rawHeaders.map(normalizeHeader);

        const colIndexes = {};
        for (const target of Object.keys(COLUMN_MAP)) {
          colIndexes[target] = findColumn(headers, target);
        }

        const clientes = [];
        let ignorados = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every(cell => cell === '' || cell === undefined || cell === null)) continue;

          const latIdx = colIndexes.latitude;
          const lngIdx = colIndexes.longitude;
          const latRaw = latIdx !== -1 ? String(row[latIdx]).replace(',', '.') : '';
          const lngRaw = lngIdx !== -1 ? String(row[lngIdx]).replace(',', '.') : '';
          const lat = parseFloat(latRaw);
          const lng = parseFloat(lngRaw);

          if (isNaN(lat) || isNaN(lng)) {
            ignorados++;
            continue;
          }

          const cliente = {};
          for (const [key, idx] of Object.entries(colIndexes)) {
            if (key === 'latitude' || key === 'longitude') {
              cliente[key] = key === 'latitude' ? lat : lng;
            } else {
              cliente[key] = idx !== -1 ? String(row[idx]).trim() : null;
            }
          }
          clientes.push(cliente);
        }

        resolve({ clientes, ignorados, preview: rows.slice(0, 6) });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}
```

- [ ] **Step 2: Create src/utils/geoUtils.js**

```js
import L from 'leaflet';

export function isValidCoordinate(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  return !isNaN(latNum) && !isNaN(lngNum)
    && latNum >= -90 && latNum <= 90
    && lngNum >= -180 && lngNum <= 180;
}

export function getMarkerColor(semSaida) {
  return semSaida === 'Sim' ? '#e74c3c' : '#3498db';
}

export function getMarkerIcon(semSaida) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${semSaida === 'Sim' ? '#e74c3c' : '#3498db'};
      border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/parseClientes.js src/utils/geoUtils.js
git commit -m "feat: add file parsing and geoutils utilities"
```

---

### Task 9: Frontend Entry and App Shell

**Files:**
- Create: `src/main.jsx`
- Create: `src/App.jsx`

- [ ] **Step 1: Create src/main.jsx**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 2: Create src/App.jsx**

```jsx
import { useState, useCallback, useEffect } from 'react';
import Layout from './components/Layout';
import UploadClientes from './components/UploadClientes';
import UploadRuas from './components/UploadRuas';
import PainelConfiguracao from './components/PainelConfiguracao';
import PainelResumo from './components/PainelResumo';
import MapaClientes from './components/MapaClientes';
import TabelaResumo from './components/TabelaResumo';
import * as api from './api';

export default function App() {
  const [clientes, setClientes] = useState([]);
  const [ruas, setRuas] = useState([]);
  const [config, setConfig] = useState({ raio_busca: 50 });
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ sem_saida: 'Sim', setor: '', busca: '' });
  const [error, setError] = useState(null);

  const clearError = () => setError(null);

  const carregarClientes = useCallback(async () => {
    try {
      const data = await api.getClientes(filtros);
      setClientes(data);
    } catch (e) {
      setError(e.message);
    }
  }, [filtros]);

  const carregarRuas = useCallback(async () => {
    try {
      const data = await api.getRuas();
      setRuas(data);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const carregarResumo = useCallback(async () => {
    try {
      const data = await api.getResumo();
      setResumo(data);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const carregarConfig = useCallback(async () => {
    try {
      const data = await api.getConfiguracao();
      setConfig(data);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { carregarConfig(); carregarRuas(); }, [carregarConfig, carregarRuas]);
  useEffect(() => { carregarClientes(); carregarResumo(); }, [carregarClientes, carregarResumo]);

  const handleImportClientes = async (clientesData, substituir) => {
    setLoading(true);
    clearError();
    try {
      await api.importarClientes(clientesData, substituir);
      await carregarClientes();
      await carregarResumo();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearClientes = async () => {
    setLoading(true);
    clearError();
    try {
      await api.deletarClientes();
      setClientes([]);
      setResumo(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportRuas = async (ruasData, substituir) => {
    setLoading(true);
    clearError();
    try {
      await api.importarRuas(ruasData, substituir);
      await carregarRuas();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearRuas = async () => {
    setLoading(true);
    clearError();
    try {
      await api.deletarRuas();
      setRuas([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = async (raio_busca) => {
    clearError();
    try {
      await api.atualizarConfiguracao(raio_busca);
      setConfig({ raio_busca });
    } catch (e) {
      setError(e.message);
    }
  };

  const handleRecalcular = async () => {
    setLoading(true);
    clearError();
    try {
      const result = await api.recalcular();
      await carregarClientes();
      await carregarResumo();
      alert(`Recalculo concluido! ${result.processados} clientes processados. ${result.em_rua_sem_saida} em rua sem saida.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = () => {
    window.open(api.getExportarUrl(), '_blank');
  };

  const sidebar = (
    <>
      <UploadClientes onImport={handleImportClientes} onClear={handleClearClientes} loading={loading} />
      <UploadRuas onImport={handleImportRuas} onClear={handleClearRuas} loading={loading} />
      <PainelConfiguracao
        config={config}
        onRecalcular={handleRecalcular}
        onConfigChange={handleConfigChange}
        loading={loading}
        onExportar={handleExportar}
      />
      <PainelResumo resumo={resumo} />
    </>
  );

  const setoresUnicos = [...new Set(clientes.map(c => c.setor).filter(Boolean))].sort();

  const filtrosBar = (
    <div className="filtros-bar">
      <label>
        <input
          type="radio"
          name="sem_saida"
          value="Sim"
          checked={filtros.sem_saida === 'Sim'}
          onChange={(e) => setFiltros(f => ({ ...f, sem_saida: e.target.value }))}
        />
        Apenas Sim
      </label>
      <label>
        <input
          type="radio"
          name="sem_saida"
          value="Nao"
          checked={filtros.sem_saida === 'Nao'}
          onChange={(e) => setFiltros(f => ({ ...f, sem_saida: e.target.value }))}
        />
        Apenas Nao
      </label>
      <label>
        <input
          type="radio"
          name="sem_saida"
          value=""
          checked={filtros.sem_saida === ''}
          onChange={(e) => setFiltros(f => ({ ...f, sem_saida: '' }))}
        />
        Todos
      </label>
      <select
        value={filtros.setor}
        onChange={(e) => setFiltros(f => ({ ...f, setor: e.target.value }))}
        className="filtro-setor"
      >
        <option value="">Todos os setores</option>
        {setoresUnicos.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <input
        type="text"
        placeholder="Buscar codigo ou nome..."
        value={filtros.busca}
        onChange={(e) => setFiltros(f => ({ ...f, busca: e.target.value }))}
        className="filtro-busca"
      />
      <button onClick={() => setFiltros({ sem_saida: 'Sim', setor: '', busca: '' })} className="btn-sm">
        Limpar filtros
      </button>
    </div>
  );

  return (
    <>
      {error && (
        <div className="error-banner" onClick={clearError}>
          {error} (clique para fechar)
        </div>
      )}
      {loading && <div className="loading-overlay">Processando...</div>}
      <Layout sidebar={sidebar} filtros={filtrosBar}>
        <MapaClientes clientes={clientes} ruas={ruas} />
        <TabelaResumo clientes={clientes} filtros={filtros} onFiltroChange={setFiltros} />
      </Layout>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/main.jsx src/App.jsx
git commit -m "feat: add React entry, App shell with state management and handlers"
```

---

### Task 10: Layout Component

**Files:**
- Create: `src/components/Layout.jsx`

- [ ] **Step 1: Create src/components/Layout.jsx**

```jsx
import { useState } from 'react';

export default function Layout({ sidebar, filtros, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-layout">
      <button
        className={`sidebar-toggle ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? '\u25C0' : '\u25B6'}
      </button>
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <h2>Rua Sem Saida</h2>
        {sidebar}
      </aside>
      <main className="main-area">
        {filtros}
        <div className="main-content">
          {children}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Layout.jsx
git commit -m "feat: add Layout component with collapsible sidebar"
```

---

### Task 11: Upload Components

**Files:**
- Create: `src/components/UploadClientes.jsx`
- Create: `src/components/UploadRuas.jsx`

- [ ] **Step 1: Create src/components/UploadClientes.jsx**

```jsx
import { useState, useRef } from 'react';
import { parseFile } from '../utils/parseClientes';

export default function UploadClientes({ onImport, onClear, loading }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ignorados, setIgnorados] = useState(0);
  const [parsedData, setParsedData] = useState(null);
  const fileRef = useRef(null);

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    try {
      const result = await parseFile(f);
      setParsedData(result.clientes);
      setPreview(result.preview);
      setIgnorados(result.ignorados);
    } catch (err) {
      alert(err.message);
      setFile(null);
    }
  };

  const handleImport = () => {
    if (parsedData && parsedData.length > 0) {
      const substituir = window.confirm('Substituir todos os clientes existentes?');
      onImport(parsedData, substituir);
      setFile(null);
      setPreview(null);
      setParsedData(null);
    }
  };

  return (
    <div className="panel">
      <h3>Clientes</h3>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        ref={fileRef}
        disabled={loading}
      />
      {file && (
        <div className="file-info">
          <p>{file.name} ({parsedData ? `${parsedData.length} clientes` : 'processando...'})</p>
          {ignorados > 0 && <p className="info-ignorados">{ignorados} linhas ignoradas (sem coordenadas validas)</p>}
          {preview && (
            <div className="preview-table">
              <table>
                <thead>
                  <tr>{preview[0].map((h, i) => <th key={i}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.slice(1).map((row, i) => (
                    <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <div className="btn-group">
        <button onClick={handleImport} disabled={!parsedData || loading} className="btn-primary">
          Importar
        </button>
        <button onClick={() => { onClear(); setFile(null); setPreview(null); setParsedData(null); }} disabled={loading} className="btn-danger">
          Limpar base
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create src/components/UploadRuas.jsx**

```jsx
import { useState, useRef } from 'react';

export default function UploadRuas({ onImport, onClear, loading }) {
  const [file, setFile] = useState(null);
  const [features, setFeatures] = useState(null);
  const [ruasData, setRuasData] = useState(null);
  const fileRef = useRef(null);

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    try {
      const text = await f.text();
      const geojson = JSON.parse(text);

      if (!geojson.features || !Array.isArray(geojson.features)) {
        throw new Error('Arquivo GeoJSON invalido: sem array features');
      }

      const parsedRuas = [];
      let skipCount = 0;

      for (const feature of geojson.features) {
        try {
          if (!feature.geometry) {
            skipCount++;
            continue;
          }
          const props = feature.properties || {};
          parsedRuas.push({
            osm_id: String(props['@id'] || props.osm_id || props.id || ''),
            nome: props.name || props.nome || '',
            geojson: JSON.stringify(feature.geometry),
          });
        } catch (e) {
          skipCount++;
        }
      }

      setFeatures(geojson.features.length);
      setRuasData(parsedRuas);

      if (skipCount > 0) {
        alert(`${skipCount} features ignoradas por geometria invalida`);
      }
    } catch (err) {
      alert('Erro ao processar GeoJSON: ' + err.message);
      setFile(null);
    }
  };

  const handleImport = () => {
    if (ruasData && ruasData.length > 0) {
      const substituir = window.confirm('Substituir todas as ruas existentes?');
      onImport(ruasData, substituir);
      setFile(null);
      setFeatures(null);
      setRuasData(null);
    }
  };

  return (
    <div className="panel">
      <h3>Ruas Sem Saida</h3>
      <input
        type="file"
        accept=".geojson,.json"
        onChange={handleFileChange}
        ref={fileRef}
        disabled={loading}
      />
      {file && features !== null && (
        <div className="file-info">
          <p>{file.name} ({ruasData.length} ruas de {features} features)</p>
        </div>
      )}
      <div className="btn-group">
        <button onClick={handleImport} disabled={!ruasData || loading} className="btn-primary">
          Importar
        </button>
        <button onClick={() => { onClear(); setFile(null); setFeatures(null); setRuasData(null); }} disabled={loading} className="btn-danger">
          Limpar base
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/UploadClientes.jsx src/components/UploadRuas.jsx
git commit -m "feat: add UploadClientes and UploadRuas components with file parsing"
```

---

### Task 12: Configuration and Summary Panels

**Files:**
- Create: `src/components/PainelConfiguracao.jsx`
- Create: `src/components/PainelResumo.jsx`

- [ ] **Step 1: Create src/components/PainelConfiguracao.jsx**

```jsx
import { useState } from 'react';

const PRESETS = [20, 30, 40, 50, 75, 100];

export default function PainelConfiguracao({ config, onRecalcular, onConfigChange, loading, onExportar }) {
  const [customRaio, setCustomRaio] = useState('');

  const handlePreset = (r) => {
    setCustomRaio('');
    onConfigChange(r);
  };

  const handleCustom = () => {
    const val = parseInt(customRaio, 10);
    if (val > 0) {
      onConfigChange(val);
    }
  };

  return (
    <div className="panel">
      <h3>Configuracao</h3>
      <div className="raio-selector">
        <label>Raio de busca:</label>
        <div className="preset-btns">
          {PRESETS.map(r => (
            <button
              key={r}
              onClick={() => handlePreset(r)}
              className={`btn-preset ${config.raio_busca === r ? 'active' : ''}`}
              disabled={loading}
            >
              {r}m
            </button>
          ))}
        </div>
        <div className="custom-raio">
          <input
            type="number"
            placeholder="Personalizado (m)"
            value={customRaio}
            onChange={(e) => setCustomRaio(e.target.value)}
            min="1"
            disabled={loading}
          />
          <button onClick={handleCustom} disabled={loading || !customRaio}>Aplicar</button>
        </div>
      </div>
      <p className="raio-atual">Raio atual: <strong>{config.raio_busca}m</strong></p>
      <div className="btn-group">
        <button onClick={onRecalcular} disabled={loading} className="btn-primary btn-wide">
          {loading ? 'Recalculando...' : 'Recalcular Analise'}
        </button>
        <button onClick={onExportar} disabled={loading} className="btn-export">
          Exportar Excel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create src/components/PainelResumo.jsx**

```jsx
export default function PainelResumo({ resumo }) {
  if (!resumo) {
    return (
      <div className="panel">
        <h3>Resumo</h3>
        <p className="text-muted">Importe dados e recalcule para ver o resumo.</p>
      </div>
    );
  }

  const cards = [
    { label: 'Total Clientes', value: resumo.total_clientes },
    { label: 'Em Rua Sem Saida', value: resumo.em_rua_sem_saida, color: '#e74c3c' },
    { label: 'Fora', value: resumo.fora, color: '#3498db' },
    { label: 'Total Ruas', value: resumo.total_ruas },
    { label: 'Raio Atual', value: `${resumo.raio_busca}m` },
    { label: 'Percentual', value: `${resumo.percentual}%`, color: resumo.percentual > 0 ? '#e67e22' : undefined },
  ];

  return (
    <div className="panel">
      <h3>Resumo</h3>
      <div className="cards-grid">
        {cards.map((card, i) => (
          <div key={i} className="card" style={card.color ? { borderLeftColor: card.color } : {}}>
            <div className="card-value" style={card.color ? { color: card.color } : {}}>{card.value}</div>
            <div className="card-label">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PainelConfiguracao.jsx src/components/PainelResumo.jsx
git commit -m "feat: add PainelConfiguracao and PainelResumo components"
```

---

### Task 13: Map and Table Components

**Files:**
- Create: `src/components/MapaClientes.jsx`
- Create: `src/components/TabelaResumo.jsx`

- [ ] **Step 1: Create src/components/MapaClientes.jsx**

```jsx
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { getMarkerIcon } from '../utils/geoUtils';
import L from 'leaflet';

const CENTER = [-9.6658, -35.7353];
const DEFAULT_ZOOM = 14;

function RuaLayer({ rua }) {
  try {
    const geom = JSON.parse(rua.geojson);
    if (geom.type === 'Point') {
      const [lng, lat] = geom.coordinates;
      if (isNaN(lat) || isNaN(lng)) return null;
      return (
        <Marker position={[lat, lng]} icon={L.divIcon({
          className: 'custom-marker',
          html: '<div style="width:10px;height:10px;border-radius:50%;background:#e67e22;border:2px solid white;"></div>',
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        })}>
          <Popup>
            <strong>{rua.nome || 'Sem nome'}</strong><br />
            OSM ID: {rua.osm_id}
          </Popup>
        </Marker>
      );
    }
    if (geom.type === 'LineString') {
      const coords = geom.coordinates.map(([lng, lat]) => [lat, lng]);
      return <Polyline positions={coords} pathOptions={{ color: '#e67e22', weight: 3, opacity: 0.7 }} />;
    }
    if (geom.type === 'MultiLineString') {
      return (
        <>
          {geom.coordinates.map((line, i) => {
            const coords = line.map(([lng, lat]) => [lat, lng]);
            return <Polyline key={i} positions={coords} pathOptions={{ color: '#e67e22', weight: 3, opacity: 0.7 }} />;
          })}
        </>
      );
    }
    return null;
  } catch (e) {
    return null;
  }
}

export default function MapaClientes({ clientes, ruas }) {
  return (
    <div className="map-container">
      <MapContainer center={CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {ruas.map((rua) => (
          <RuaLayer key={`rua-${rua.id}`} rua={rua} />
        ))}
        {clientes.filter(c => c.latitude && c.longitude).map((cliente) => (
          <Marker
            key={`cliente-${cliente.id}`}
            position={[Number(cliente.latitude), Number(cliente.longitude)]}
            icon={getMarkerIcon(cliente.sem_saida)}
          >
            <Popup>
              <strong>{cliente.nome_cliente || 'Sem nome'}</strong><br />
              Codigo: {cliente.codigo_cliente}<br />
              Setor: {cliente.setor}<br />
              Rua sem saida: <strong style={{ color: cliente.sem_saida === 'Sim' ? '#e74c3c' : '#3498db' }}>
                {cliente.sem_saida}
              </strong><br />
              Distancia: {cliente.distancia_metros ? `${cliente.distancia_metros}m` : 'N/A'}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="map-legend">
        <div><span className="legend-dot" style={{ background: '#e74c3c' }} /> Em rua sem saida</div>
        <div><span className="legend-dot" style={{ background: '#3498db' }} /> Fora</div>
        <div><span className="legend-dot" style={{ background: '#e67e22' }} /> Ruas sem saida</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create src/components/TabelaResumo.jsx**

```jsx
export default function TabelaResumo({ clientes, filtros, onFiltroChange }) {
  const columns = [
    { key: 'codigo_cliente', label: 'Codigo' },
    { key: 'nome_cliente', label: 'Nome' },
    { key: 'setor', label: 'Setor' },
    { key: 'endereco', label: 'Endereco' },
    { key: 'cidade', label: 'Cidade' },
    { key: 'sem_saida', label: 'Sem Saida' },
    { key: 'distancia_metros', label: 'Distancia (m)' },
  ];

  return (
    <div className="table-container">
      <div className="table-toolbar">
        <span>{clientes.length} clientes encontrados</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={col.key === 'sem_saida' ? 'clickable' : ''}
                onClick={() => {
                  if (col.key === 'sem_saida') {
                    const next = filtros.sem_saida === 'Sim' ? 'Nao' : filtros.sem_saida === 'Nao' ? '' : 'Sim';
                    onFiltroChange(f => ({ ...f, sem_saida: next }));
                  }
                }}
              >
                {col.label}
                {col.key === 'sem_saida' && (
                  <span className="filter-indicator">
                    {filtros.sem_saida ? ` (${filtros.sem_saida === 'Sim' ? 'Sim' : 'Nao'})` : ' (Todos)'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clientes.length === 0 ? (
            <tr><td colSpan={columns.length} className="text-center">Nenhum cliente encontrado</td></tr>
          ) : (
            clientes.map(cliente => (
              <tr key={cliente.id}>
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={col.key === 'sem_saida' ? (cliente.sem_saida === 'Sim' ? 'td-sim' : 'td-nao') : ''}
                  >
                    {col.key === 'distancia_metros' && cliente.distancia_metros != null
                      ? `${cliente.distancia_metros}m`
                      : (cliente[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/MapaClientes.jsx src/components/TabelaResumo.jsx
git commit -m "feat: add MapaClientes with Leaflet and TabelaResumo components"
```

---

### Task 14: CSS Styles

**Files:**
- Create: `src/styles.css`

- [ ] **Step 1: Create src/styles.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: #333;
  background: #f5f5f5;
}

#root {
  height: 100vh;
}

/* Layout */
.app-layout {
  display: flex;
  height: 100vh;
  position: relative;
}

.sidebar-toggle {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
}

.sidebar-toggle.open {
  left: 360px;
}

.sidebar {
  width: 350px;
  min-width: 350px;
  background: white;
  border-right: 1px solid #ddd;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: margin-left 0.3s;
}

.sidebar.collapsed {
  margin-left: -350px;
}

.sidebar h2 {
  font-size: 18px;
  color: #e74c3c;
  padding-bottom: 8px;
  border-bottom: 2px solid #e74c3c;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Panels */
.panel {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
}

.panel h3 {
  font-size: 14px;
  margin-bottom: 8px;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.panel input[type="file"] {
  font-size: 12px;
  margin-bottom: 8px;
}

/* Buttons */
button {
  cursor: pointer;
  border: none;
  border-radius: 4px;
  padding: 6px 14px;
  font-size: 13px;
  transition: background 0.2s;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c0392b;
}

.btn-export {
  background: #27ae60;
  color: white;
}

.btn-export:hover:not(:disabled) {
  background: #219a52;
}

.btn-wide {
  width: 100%;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
  background: #eee;
  color: #555;
}

.btn-sm:hover {
  background: #ddd;
}

.btn-group {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

/* Raio selector */
.raio-selector label {
  font-size: 12px;
  color: #666;
}

.preset-btns {
  display: flex;
  gap: 4px;
  margin: 6px 0;
  flex-wrap: wrap;
}

.btn-preset {
  padding: 4px 10px;
  font-size: 12px;
  background: #eee;
  color: #555;
  border: 1px solid #ccc;
}

.btn-preset.active {
  background: #3498db;
  color: white;
  border-color: #3498db;
}

.custom-raio {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.custom-raio input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
}

.raio-atual {
  font-size: 13px;
  margin: 8px 0;
  color: #555;
}

/* File info */
.file-info {
  font-size: 12px;
  color: #555;
  margin-bottom: 8px;
}

.info-ignorados {
  color: #e67e22;
  margin-top: 4px;
}

/* Preview table */
.preview-table {
  max-height: 180px;
  overflow: auto;
  margin-top: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.preview-table table {
  font-size: 11px;
  border-collapse: collapse;
  width: 100%;
}

.preview-table th,
.preview-table td {
  padding: 3px 6px;
  border: 1px solid #eee;
  white-space: nowrap;
}

.preview-table th {
  background: #f0f0f0;
  font-weight: 600;
}

/* Cards grid */
.cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.card {
  background: white;
  border: 1px solid #e0e0e0;
  border-left: 3px solid #ccc;
  border-radius: 4px;
  padding: 8px;
  text-align: center;
}

.card-value {
  font-size: 22px;
  font-weight: 700;
}

.card-label {
  font-size: 11px;
  color: #888;
  margin-top: 2px;
}

.text-muted {
  color: #999;
  font-size: 13px;
}

/* Map container */
.map-container {
  flex: 1;
  min-height: 300px;
  position: relative;
  border-bottom: 1px solid #ddd;
}

.map-legend {
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 1000;
  background: white;
  padding: 8px 12px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  font-size: 12px;
}

.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}

/* Table */
.table-container {
  max-height: 40%;
  overflow: auto;
}

.table-toolbar {
  padding: 8px 12px;
  font-size: 12px;
  color: #666;
  background: #fafafa;
  border-bottom: 1px solid #eee;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.data-table th {
  background: #f5f5f5;
  padding: 8px 10px;
  text-align: left;
  border-bottom: 2px solid #ddd;
  font-weight: 600;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}

.data-table th.clickable {
  cursor: pointer;
  user-select: none;
}

.data-table th.clickable:hover {
  background: #e8e8e8;
}

.filter-indicator {
  font-weight: normal;
  color: #e74c3c;
  font-size: 11px;
}

.data-table td {
  padding: 6px 10px;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
}

.data-table tr:hover {
  background: #f9f9f9;
}

.td-sim {
  color: #e74c3c;
  font-weight: 600;
}

.td-nao {
  color: #3498db;
}

.text-center {
  text-align: center;
  color: #999;
  padding: 20px;
}

/* Filtros bar */
.filtros-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background: white;
  border-bottom: 1px solid #ddd;
  flex-wrap: wrap;
  font-size: 13px;
}

.filtros-bar label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.filtro-busca {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
  width: 200px;
}

.filtro-setor {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
}

/* Error banner */
.error-banner {
  background: #e74c3c;
  color: white;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  text-align: center;
}

/* Loading overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  color: white;
  font-size: 18px;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 2000;
    box-shadow: 2px 0 8px rgba(0,0,0,0.2);
  }

  .sidebar.collapsed {
    margin-left: -350px;
  }

  .sidebar-toggle {
    z-index: 2001;
    left: 10px;
  }

  .sidebar-toggle.open {
    left: 360px;
  }

  .cards-grid {
    grid-template-columns: 1fr 1fr;
  }

  .filtros-bar {
    gap: 8px;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles.css
git commit -m "feat: add complete CSS styles for all components"
```

---

### Task 15: Integration Smoke Test

**Files:** none (verification only)

- [ ] **Step 1: Start the full application**

Run: `npm run dev`
Expected: Server on :3001, Vite on :5173, no errors

- [ ] **Step 2: Verify health endpoint**

Run: `curl http://localhost:3001/api/health`
Expected: `{"status":"ok"}`

- [ ] **Step 3: Verify frontend loads**

Open browser at `http://localhost:5173`
Expected: App renders with sidebar, file upload areas, empty map centered on Maceio, empty table

- [ ] **Step 4: Verify config endpoint**

Run: `curl http://localhost:3001/api/configuracao`
Expected: `{"raio_busca":50}`

- [ ] **Step 5: Verify resumo endpoint**

Run: `curl http://localhost:3001/api/resumo`
Expected: `{"total_clientes":0,"em_rua_sem_saida":0,"fora":0,"total_ruas":0,"raio_busca":50,"percentual":0}`

- [ ] **Step 6: Verify error handling (recalcular without data)**

Run: `curl -X POST http://localhost:3001/api/analise/recalcular`
Expected: `{"erro":"Nenhum cliente importado"}`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: integration smoke test passed, all endpoints verified"
```

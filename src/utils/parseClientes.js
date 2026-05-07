import * as XLSX from 'xlsx';

const COLUMN_MAP = {
  'codigo_cliente': ['codigo_cliente', 'codigo cliente', 'codigo', 'cod_cliente'],
  'nome_cliente': ['nome_cliente', 'nome cliente', 'nome', 'cliente', 'razao_social', 'razao social'],
  'tipo_cliente': ['tipo_cliente', 'tipo cliente', 'tipo', 'categoria'],
  'prioridade': ['prioridade'],
  'tempo_espera': ['tempo_espera', 'tempo espera', 'tempo', 'espera'],
  'setor': ['setor', 'bairro'],
  'endereco': ['endereco', 'endereco_completo', 'logradouro'],
  'cidade': ['cidade', 'municipio'],
  'estado': ['estado', 'uf'],
  'latitude': ['latitude', 'lat'],
  'longitude': ['longitude', 'long', 'lng', 'lon'],
};

function normalizeHeader(h) {
  return String(h).toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
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

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

export async function atualizarConfiguracao(raio_busca, modo_calculo) {
  const body = {};
  if (raio_busca) body.raio_busca = raio_busca;
  if (modo_calculo) body.modo_calculo = modo_calculo;
  const res = await request('/configuracao', {
    method: 'PUT',
    body: JSON.stringify(body),
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

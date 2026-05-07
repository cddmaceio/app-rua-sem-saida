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
  const tStart = Date.now();
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

  console.log(`[Recalculo] Iniciando: ${clientes.length} clientes x ${ruas.length} ruas, raio=${raio}m`);

  // Pre-parse all geometries once and compute bounding boxes
  const ruasParsed = [];
  for (const rua of ruas) {
    try {
      const geom = JSON.parse(rua.geojson);
      const bbox = turf.bbox(geom);
      ruasParsed.push({ id: rua.id, geometry: geom, bbox });
    } catch (e) {
      console.log(`[Recalculo] Geometria invalida na rua id=${rua.id}, ignorando`);
    }
  }

  if (ruasParsed.length === 0) {
    return res.status(400).json({ erro: 'Nenhuma rua com geometria valida' });
  }

  console.log(`[Recalculo] ${ruasParsed.length} geometrias parseadas`);

  const updateStmt = db.prepare('UPDATE clientes SET sem_saida = ?, distancia_metros = ? WHERE id = ?');
  const degPerMeter = 1 / 111000;
  const bboxBuffer = (raio + 200) * degPerMeter;

  let processados = 0;
  let ignorados = 0;
  const BATCH = 500;

  for (let i = 0; i < clientes.length; i += BATCH) {
    const lote = clientes.slice(i, i + BATCH);

    const transaction = db.transaction(() => {
      for (const cliente of lote) {
        const lat = Number(cliente.latitude);
        const lng = Number(cliente.longitude);

        if (isNaN(lat) || isNaN(lng)) {
          ignorados++;
          continue;
        }

        let menorDistancia = Infinity;

        for (const rua of ruasParsed) {
          const [minLng, minLat, maxLng, maxLat] = rua.bbox;

          // Bounding box pre-filter: skip streets clearly too far
          if (lng < minLng - bboxBuffer || lng > maxLng + bboxBuffer ||
              lat < minLat - bboxBuffer || lat > maxLat + bboxBuffer) {
            continue;
          }

          try {
            let dist;
            if (rua.geometry.type === 'LineString' || rua.geometry.type === 'MultiLineString') {
              dist = turf.pointToLineDistance(
                turf.point([lng, lat]),
                rua.geometry,
                { units: 'meters' }
              );
            } else if (rua.geometry.type === 'Point') {
              dist = turf.distance(
                turf.point([lng, lat]),
                rua.geometry,
                { units: 'meters' }
              );
            } else {
              continue;
            }

            if (dist < menorDistancia) {
              menorDistancia = dist;
              if (dist <= raio) break; // Early exit: already within radius
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

    transaction();
    const pct = Math.round((Math.min(i + BATCH, clientes.length) / clientes.length) * 100);
    console.log(`[Recalculo] ${pct}% — ${Math.min(i + BATCH, clientes.length)}/${clientes.length} clientes (${((Date.now() - tStart) / 1000).toFixed(1)}s)`);
  }

  const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
  const totalSim = db.prepare("SELECT COUNT(*) as count FROM clientes WHERE sem_saida = 'Sim'").get().count;
  const totalNao = db.prepare("SELECT COUNT(*) as count FROM clientes WHERE sem_saida = 'Nao'").get().count;

  console.log(`[Recalculo] Concluido em ${elapsed}s — ${totalSim} Sim / ${totalNao} Nao`);

  res.json({
    processados,
    ignorados,
    total_clientes: clientes.length,
    total_ruas: ruas.length,
    raio_busca: raio,
    em_rua_sem_saida: totalSim,
    fora: totalNao,
    tempo_segundos: parseFloat(elapsed)
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

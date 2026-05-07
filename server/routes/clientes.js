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

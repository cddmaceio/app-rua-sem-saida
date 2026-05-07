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

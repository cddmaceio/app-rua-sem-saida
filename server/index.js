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

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import clientesRouter from './routes/clientes.js';
import ruasRouter from './routes/ruas.js';
import analiseRouter from './routes/analise.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
  res.setTimeout(300000, () => {
    res.status(408).json({ erro: 'Timeout do servidor' });
  });
  next();
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.use('/api/clientes', clientesRouter);
app.use('/api/ruas', ruasRouter);
app.use('/api', analiseRouter);

// Production: serve static frontend build
if (isProduction) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} (modo: ${isProduction ? 'producao' : 'dev'})`);
});

server.timeout = 300000;

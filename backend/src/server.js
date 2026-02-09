/**
 * AgroFocus API Server
 * Servidor unificado com todas as rotas
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Importações de rotas
const talhoesRoutes = require('./routes/talhoes.routes');
const indicesRoutes = require('./routes/indices.routes');
const produtividadeRoutes = require('./routes/produtividade.routes');
const meteorologiaRoutes = require('./routes/meteorologia.routes');

const app = express();
const PORT = process.env.PORT || 3002;

// Caminho para o build do frontend
const FRONTEND_BUILD_PATH = path.join(__dirname, '../build');

// Middlewares
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve arquivos estáticos do frontend
app.use(express.static(FRONTEND_BUILD_PATH));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    servico: 'AgroFocus API',
    versao: '1.2.0',
    endpoints: {
      indices: '/api/indices',
      ndvi: '/api/ndvi/:talhaoId',
      ndre: '/api/ndre/:talhaoId',
      msavi: '/api/msavi/:talhaoId',
      produtividade: '/api/produtividade',
      meteorologia: '/api/meteorologia',
      delineamento: '/api/talhoes/delinear-auto'
    }
  });
});

// Rotas
app.use('/api/talhoes', talhoesRoutes);
app.use('/api', indicesRoutes);
app.use('/api', produtividadeRoutes);
app.use('/api/meteorologia', meteorologiaRoutes);

// Rota raiz - serve o frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_BUILD_PATH, 'index.html'));
});

// API 404 handler - só responde JSON para rotas /api/*
app.use('/api/*', (req, res) => {
  res.status(404).json({
    sucesso: false,
    erro: 'Rota não encontrada',
    caminho: req.path,
    documentacao: '/'
  });
});

// Catch-all route para o frontend (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({
    sucesso: false,
    erro: err.message || 'Erro interno do servidor'
  });
});

app.listen(PORT, () => {
  console.log(`
🌾 AgroFocus API v1.2.0
========================
✅ Servidor rodando na porta ${PORT}
📚 Documentação: http://localhost:${PORT}/

Endpoints disponíveis:
  Índices:
    GET /api/indices
    GET /api/ndvi/:talhaoId
    GET /api/ndre/:talhaoId
    GET /api/msavi/:talhaoId
    GET /api/comparar/:talhaoId
  
  Produtividade:
    GET /api/produtividade/estimar/:talhaoId
    GET /api/produtividade/culturas
    GET /api/produtividade/historico/:talhaoId
  
  Meteorologia:
    GET /api/meteorologia/gdd/:talhaoId
    GET /api/meteorologia/gdd/culturas
    GET /api/meteorologia/clima-atual
    GET /api/meteorologia/previsao
  
  Delineamento:
    POST /api/talhoes/delinear-auto
    GET  /api/talhoes/algoritmos
  `);
});

module.exports = app;
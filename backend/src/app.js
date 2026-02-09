/**
 * AgroFocus API - Backend
 * Serviço de índices de vegetação integrado com Google Earth Engine
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const indicesRoutes = require('./routes/indices.routes');
const produtividadeRoutes = require('./routes/produtividade.routes');
const meteorologiaRoutes = require('./routes/meteorologia.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api', indicesRoutes);
app.use('/api', produtividadeRoutes);
app.use('/api/meteorologia', meteorologiaRoutes);

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    servico: 'AgroFocus API',
    versao: '1.2.0',
    endpoints: {
      indices: '/api/indices',
      ndvi: '/api/ndvi/:talhaoId',
      ndre: '/api/ndre/:talhaoId',
      msavi: '/api/msavi/:talhaoId',
      comparar: '/api/comparar/:talhaoId',
      produtividade: {
        estimar: '/api/produtividade/estimar/:talhaoId?safra=AAAA/AAAA&cultura_id=1',
        culturas: '/api/produtividade/culturas',
        historico: '/api/produtividade/historico/:talhaoId',
        comparar: '/api/produtividade/comparar/:talhaoId'
      },
      meteorologia: {
        gdd: '/api/meteorologia/gdd/:talhaoId',
        culturas: '/api/meteorologia/gdd/culturas',
        clima: '/api/meteorologia/clima-atual',
        previsao: '/api/meteorologia/previsao'
      }
    }
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    nome: 'AgroFocus API',
    descricao: 'API de índices de vegetação e estimativa de produtividade para agricultura de precisão',
    versao: '1.2.0',
    documentacao: {
      indices: '/api/indices',
      produtividade: '/api/produtividade/culturas',
      meteorologia: '/api/meteorologia/gdd/culturas'
    },
    endpoints: {
      indices: {
        listar: 'GET /api/indices',
        ndvi: 'GET /api/ndvi/:talhaoId?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD',
        ndre: 'GET /api/ndre/:talhaoId?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD',
        msavi: 'GET /api/msavi/:talhaoId?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD',
        comparar: 'GET /api/comparar/:talhaoId?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD'
      },
      produtividade: {
        estimar: 'GET /api/produtividade/estimar/:talhaoId?safra=AAAA/AAAA&cultura_id=1',
        culturas: 'GET /api/produtividade/culturas',
        historico: 'GET /api/produtividade/historico/:talhaoId?cultura_id=1&anos=3',
        comparar: 'GET /api/produtividade/comparar/:talhaoId?safra1=AAAA/AAAA&safra2=AAAA/AAAA&cultura_id=1',
        exemplo: 'GET /api/produtividade/exemplo/:cultura'
      }
    },
    features: [
      'Cálculo de índices de vegetação (NDVI, NDRE, MSAVI)',
      'Estimativa de produtividade com Machine Learning',
      'Análise de tendências históricas',
      'Comparativo entre safras',
      'GDD (Growing Degree Days) e meteorologia',
      'Suporte offline para dados críticos'
    ]
  });
});

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    erro: 'Rota não encontrada',
    caminho: req.path
  });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({
    sucesso: false,
    erro: 'Erro interno do servidor',
    mensagem: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`
🌾 AgroFocus API v1.2.0
========================
✅ Servidor rodando na porta ${PORT}
📍 URL: http://localhost:${PORT}
📚 Documentação: http://localhost:${PORT}/

Endpoints disponíveis:
  Índices:
    GET /api/indices
    GET /api/ndvi/:talhaoId
    GET /api/ndre/:talhaoId
    GET /api/msavi/:talhaoId
    GET /api/comparar/:talhaoId
  
  Produtividade:
    GET /api/produtividade/estimar/:talhaoId?safra=AAAA/AAAA&cultura_id=1
    GET /api/produtividade/culturas
    GET /api/produtividade/historico/:talhaoId
    GET /api/produtividade/comparar/:talhaoId
    GET /api/produtividade/exemplo/:cultura
  
  Meteorologia:
    GET /api/meteorologia/gdd/:talhaoId?data_plantio=YYYY-MM-DD&cultura_id=milho&lat=-23.5&lng=-46.6
    GET /api/meteorologia/gdd/culturas
    GET /api/meteorologia/clima-atual?lat=-23.5&lng=-46.6
    GET /api/meteorologia/previsao?lat=-23.5&lng=-46.6&dias=7
  `);
});

module.exports = app;

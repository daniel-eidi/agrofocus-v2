/**
 * AgroFocus API Server
 * Servidor unificado com PostgreSQL
 */

// Carregar variáveis de ambiente PRIMEIRO
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Importar configuração do banco de dados
const { testConnection } = require('./config/database');

// Debug: mostrar variáveis de ambiente
console.log('🔧 ENV Check - DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configurado' : '❌ Não definido');
console.log('🔧 ENV Check - GEE_PROJECT_ID:', process.env.GEE_PROJECT_ID ? '✅ OK' : '❌ Não definido');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Importações de rotas
const talhoesRoutes = require('./routes/talhoes.routes');
const indicesRoutes = require('./routes/indices.routes');
const produtividadeRoutes = require('./routes/produtividade.routes');
const meteorologiaRoutes = require('./routes/meteorologia.routes');
const { router: authRoutes, authMiddleware } = require('./routes/auth.routes');

// NOVAS ROTAS COM POSTGRESQL
const fazendasRoutes = require('./routes/fazendas.routes');
const talhoesDbRoutes = require('./routes/talhoes-db.routes');
const ocorrenciasRoutes = require('./routes/ocorrencias.routes');
// const inspecoesRoutes = require('./routes/inspecoes.routes'); // TEMPORARIAMENTE DESATIVADO

// Models para acesso direto (se necessário)
const { 
  Fazenda, Talhao, Safra, Ocorrencia, 
  Operador, Equipamento, Insumo, Despesa, Atividade 
} = require('./models/db.models');

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

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', async (req, res) => {
  // Testar conexão com banco
  const dbStatus = await testConnection();
  
  res.json({ 
    status: dbStatus ? 'OK' : 'DEGRADED', 
    timestamp: new Date().toISOString(),
    servico: 'AgroFocus API',
    versao: '2.0.0 (PostgreSQL)',
    database: dbStatus ? 'connected' : 'disconnected',
    endpoints: {
      auth: '/api/auth',
      fazendas: '/api/fazendas',
      talhoes: '/api/talhoes',
      safras: '/api/safras',
      ocorrencias: '/api/ocorrencias',
      inspecoes: '/api/inspecoes',
      indices: '/api/indices',
      ndvi: '/api/ndvi/:talhaoId',
      produtividade: '/api/produtividade',
      meteorologia: '/api/meteorologia'
    }
  });
});

// ============================================
// ROTAS DE AUTENTICAÇÃO
// ============================================
app.use('/api/auth', authRoutes);

// ============================================
// ROTAS COM POSTGRESQL
// ============================================

// Fazendas
app.use('/api/fazendas', authMiddleware, fazendasRoutes);

// Talhões (novas rotas com PostgreSQL)
app.use('/api/talhoes-db', authMiddleware, talhoesDbRoutes);

// Ocorrências
app.use('/api/ocorrencias', authMiddleware, ocorrenciasRoutes);

// Inspeções (TEMPORARIAMENTE DESATIVADO)
// app.use('/api/inspecoes', authMiddleware, inspecoesRoutes);

// ============================================
// ROTAS DE CADASTROS (PostgreSQL)
// ============================================

// Safras
app.get('/api/safras', authMiddleware, async (req, res) => {
  try {
    const { fazenda_id } = req.query;
    const safras = await Safra.findAll({ fazenda_id });
    res.json(safras);
  } catch (err) {
    console.error('Erro ao listar safras:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

app.post('/api/safras', authMiddleware, async (req, res) => {
  try {
    const { nome, cultura, ano_inicio, ano_fim, status, fazenda_id, data_inicio, data_fim } = req.body;
    
    if (!nome || !fazenda_id) {
      return res.status(400).json({ sucesso: false, erro: 'Nome e fazenda são obrigatórios' });
    }
    
    const safra = await Safra.create({
      nome, cultura, ano_inicio, ano_fim, status, fazenda_id, data_inicio, data_fim
    });
    
    res.status(201).json({ sucesso: true, safra });
  } catch (err) {
    console.error('Erro ao criar safra:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// Operadores
app.get('/api/operadores', authMiddleware, async (req, res) => {
  try {
    const { fazenda_id } = req.query;
    const operadores = await Operador.findAll({ fazenda_id });
    res.json(operadores);
  } catch (err) {
    console.error('Erro ao listar operadores:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// Equipamentos
app.get('/api/equipamentos', authMiddleware, async (req, res) => {
  try {
    const { fazenda_id } = req.query;
    const equipamentos = await Equipamento.findAll({ fazenda_id });
    res.json(equipamentos);
  } catch (err) {
    console.error('Erro ao listar equipamentos:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// Atividades
app.get('/api/atividades', authMiddleware, async (req, res) => {
  try {
    const { fazenda_id, talhao_id } = req.query;
    const atividades = await Atividade.findAll({ fazenda_id, talhao_id });
    res.json(atividades);
  } catch (err) {
    console.error('Erro ao listar atividades:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// Insumos
app.get('/api/estoque/insumos', authMiddleware, async (req, res) => {
  try {
    const { fazenda_id } = req.query;
    const insumos = await Insumo.findAll({ fazenda_id });
    res.json(insumos);
  } catch (err) {
    console.error('Erro ao listar insumos:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// Despesas
app.get('/api/financeiro/despesas', authMiddleware, async (req, res) => {
  try {
    const { fazenda_id, talhao_id } = req.query;
    const despesas = await Despesa.findAll({ fazenda_id, talhao_id });
    res.json(despesas);
  } catch (err) {
    console.error('Erro ao listar despesas:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// ============================================
// ROTAS ORIGINAIS (mantidas para compatibilidade)
// ============================================
app.use('/api/talhoes', talhoesRoutes);
app.use('/api', indicesRoutes);
app.use('/api', produtividadeRoutes);
app.use('/api/meteorologia', meteorologiaRoutes);

// Rotas de IA (Vision API)
const iaRoutes = require('./routes/ia.routes');
app.use('/api/ia', authMiddleware, iaRoutes);

// ============================================
// ROTA RAIZ
// ============================================
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_BUILD_PATH, 'index.html'));
});

// API 404 handler
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

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`
🌾 AgroFocus API v2.0.0 (PostgreSQL)
=====================================
✅ Servidor rodando na porta ${PORT}
📚 Documentação: http://localhost:${PORT}/
`);

  // Testar conexão com banco ao iniciar
  console.log('🔄 Testando conexão com PostgreSQL...');
  const dbOk = await testConnection();
  
  if (dbOk) {
    console.log('✅ Banco de dados conectado e pronto!');
  } else {
    console.log('⚠️  Aviso: Banco de dados não disponível');
    console.log('   Configure DATABASE_URL no arquivo .env');
  }
  
  console.log(`
Endpoints disponíveis:
  Autenticação:
    POST /api/auth/login
    POST /api/auth/registro
    GET  /api/auth/minhas-fazendas
  
  Cadastros (PostgreSQL):
    GET    /api/fazendas
    POST   /api/fazendas
    GET    /api/fazendas/:id
    PUT    /api/fazendas/:id
    DELETE /api/fazendas/:id
    GET    /api/fazendas/:id/talhoes
    
    GET    /api/talhoes-db
    POST   /api/talhoes-db
    GET    /api/talhoes-db/:id
    GET    /api/talhoes-db/:id/geojson
    PUT    /api/talhoes-db/:id
    DELETE /api/talhoes-db/:id
    
    GET    /api/safras
    POST   /api/safras
    GET    /api/operadores
    GET    /api/equipamentos
  
  Ocorrências:
    GET    /api/ocorrencias
    POST   /api/ocorrencias
    GET    /api/ocorrencias/:id
    PUT    /api/ocorrencias/:id
    DELETE /api/ocorrencias/:id
  
  Inspeções:
    GET    /api/inspecoes
    POST   /api/inspecoes/pendentes
    GET    /api/inspecoes/pendentes
    POST   /api/inspecoes/pendentes/:id/analisar
    GET    /api/inspecoes/:id/status
  
  Índices (GEE):
    GET /api/indices
    GET /api/ndvi/:talhaoId
  
  Produtividade:
    GET /api/produtividade/estimar/:talhaoId
  
  Meteorologia:
    GET /api/meteorologia/gdd/:talhaoId
  `);
});

module.exports = app;

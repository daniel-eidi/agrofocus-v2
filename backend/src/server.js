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

// Dados mockados para cadastros
const fazendas = [
  { id: '1', nome: 'Fazenda São João', municipio: 'Ribeirão Preto', estado: 'SP', area_total: 150.5, car: 'SP-123456' },
  { id: '2', nome: 'Fazenda Boa Vista', municipio: 'Uberaba', estado: 'MG', area_total: 320.0, car: 'MG-789012' }
];

const safras = [
  { id: '1', nome: 'Safra 2024/25', cultura: 'Soja', ano_inicio: 2024, ano_fim: 2025, status: 'em_andamento' },
  { id: '2', nome: 'Safra 2023/24', cultura: 'Milho', ano_inicio: 2023, ano_fim: 2024, status: 'finalizada' }
];

const talhoes = [
  { id: '1', nome: 'Talhão A1', area_hectares: 45.5, tipo_solo: 'Latossolo Vermelho', fazenda_nome: 'Fazenda São João' },
  { id: '2', nome: 'Talhão A2', area_hectares: 38.0, tipo_solo: 'Argissolo', fazenda_nome: 'Fazenda São João' }
];

const operadores = [
  { id: '1', nome: 'João Silva', funcao: 'Tratorista', telefone: '(16) 99999-1111', ativo: true },
  { id: '2', nome: 'Maria Santos', funcao: 'Aplicadora', telefone: '(16) 99999-2222', ativo: true }
];

const equipamentos = [
  { id: '1', nome: 'Trator John Deere 8R', tipo: 'Trator', marca: 'John Deere', ano: 2022, status: 'disponivel' },
  { id: '2', nome: 'Pulverizador Autopropelido', tipo: 'Pulverizador', marca: 'Stara', ano: 2021, status: 'em_uso' }
];

const atividades = [
  { id: '1', descricao: 'Aplicação de Herbicida', data: '2025-02-08', tipo: 'Aplicação', status: 'concluida', talhao_nome: 'Talhão A1' },
  { id: '2', descricao: 'Plantio de Soja', data: '2025-02-10', tipo: 'Plantio', status: 'em_andamento', talhao_nome: 'Talhão A2' }
];

const ocorrencias = [
  { id: '1', tipo: 'Lagarta', descricao: 'Infestação leve na área norte', data: '2025-02-05', gravidade: 'media', status: 'pendente', talhao_nome: 'Talhão A1' },
  { id: '2', tipo: 'Ferrugem', descricao: 'Manchas identificadas', data: '2025-02-07', gravidade: 'baixa', status: 'concluida', talhao_nome: 'Talhão A2' }
];

const insumos = [
  { id: '1', nome: 'Glifosato', tipo: 'Herbicida', quantidade: 500, unidade: 'L', preco_medio: 45.50, estoque_minimo: 100 },
  { id: '2', nome: 'Semente Soja', tipo: 'Semente', quantidade: 80, unidade: 'kg', preco_medio: 120.00, estoque_minimo: 50 }
];

const despesas = [
  { id: '1', descricao: 'Compra de combustível', valor: 2500.00, data: '2025-02-01', categoria: 'Combustível', talhao_nome: 'Geral' },
  { id: '2', descricao: 'Manutenção trator', valor: 800.00, data: '2025-02-03', categoria: 'Manutenção', talhao_nome: 'Talhão A1' }
];

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

// Rotas de cadastros
app.get('/api/fazendas', (req, res) => res.json(fazendas));
app.post('/api/fazendas', (req, res) => {
  const nova = { id: Date.now().toString(), ...req.body };
  fazendas.push(nova);
  res.status(201).json(nova);
});

app.get('/api/safras', (req, res) => res.json(safras));
app.get('/api/talhoes', (req, res) => res.json(talhoes));
app.get('/api/operadores', (req, res) => res.json(operadores));
app.get('/api/equipamentos', (req, res) => res.json(equipamentos));

// Rotas operacionais
app.get('/api/atividades', (req, res) => res.json(atividades));
app.get('/api/ocorrencias', (req, res) => res.json(ocorrencias));
app.get('/api/estoque/insumos', (req, res) => res.json(insumos));
app.get('/api/financeiro/despesas', (req, res) => res.json(despesas));

// Rotas originais
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
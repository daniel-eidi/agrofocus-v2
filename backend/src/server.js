/**
 * AgroFocus API Server
 * Servidor unificado com todas as rotas
 */

// Carregar variáveis de ambiente PRIMEIRO - antes de qualquer importação
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Debug: mostrar se as variáveis GEE foram carregadas
console.log('🔧 ENV Check - GEE_PROJECT_ID:', process.env.GEE_PROJECT_ID ? '✅ OK' : '❌ Não definido');
console.log('🔧 ENV Check - GEE_CLIENT_EMAIL:', process.env.GEE_CLIENT_EMAIL ? '✅ OK' : '❌ Não definido');
console.log('🔧 ENV Check - GEE_PRIVATE_KEY:', process.env.GEE_PRIVATE_KEY ? `✅ OK (${process.env.GEE_PRIVATE_KEY.length} chars)` : '❌ Não definido');
console.log('🔧 ENV Check - OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ OK' : '❌ Não definido');

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
  { id: '1', nome: 'Talhão A1', area_hectares: 45.5, tipo_solo: 'Latossolo Vermelho', fazenda_id: '1', fazenda_nome: 'Fazenda São João', centroide: { lat: -21.123456, lng: -47.123456 } },
  { id: '2', nome: 'Talhão A2', area_hectares: 38.0, tipo_solo: 'Argissolo', fazenda_id: '1', fazenda_nome: 'Fazenda São João', centroide: { lat: -21.234567, lng: -47.234567 } },
  { id: '3', nome: 'Talhão B1', area_hectares: 52.0, tipo_solo: 'Latossolo Vermelho-Amarelo', fazenda_id: '2', fazenda_nome: 'Fazenda Boa Vista', centroide: { lat: -19.7166, lng: -47.8833 } }
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
  { 
    id: '1', 
    tipo: 'Lagarta', 
    categoria: 'praga',
    titulo: 'Infestação leve na área norte',
    descricao: 'Detectado: Lagarta Helicoverpa armigera (91% confiança). Recomendação: Aplicar inseticida específico nas próximas 48h.',
    data: '2025-02-05', 
    gravidade: 'media', 
    status: 'aberta', 
    talhao_nome: 'Talhão A1',
    latitude: -21.123456,
    longitude: -47.123456,
    ia_analise: 'Lagarta Helicoverpa armigera (91% confiança)'
  },
  { 
    id: '2', 
    tipo: 'Ferrugem', 
    categoria: 'doenca',
    titulo: 'Manchas identificadas no limbo foliar',
    descricao: 'Detectado: Ferrugem Asiática (87% confiança). Recomendação: Monitorar e aplicar fungicida preventivo.',
    data: '2025-02-07', 
    gravidade: 'baixa', 
    status: 'resolvida', 
    talhao_nome: 'Talhão A2',
    latitude: -21.234567,
    longitude: -47.234567,
    ia_analise: 'Ferrugem Asiática (87% confiança)'
  }
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

// Rotas de autenticação e fazendas
app.use('/api/auth', authRoutes);

// Importar dados e funções do auth
const { 
  getFazendasUsuario, 
  getPermissaoFazenda,
  PERMISSOES,
  fazendas: fazendasAuth,
  permissoesFazendas 
} = require('./routes/auth.routes');

// Rotas de fazendas (protegidas por autenticação)
app.get('/api/fazendas', authMiddleware, (req, res) => {
  const fazendasUsuario = getFazendasUsuario(req.usuario.id);
  res.json(fazendasUsuario);
});

app.post('/api/fazendas', authMiddleware, (req, res) => {
  const { nome, municipio, estado, area_total, car } = req.body;
  
  if (!nome) {
    return res.status(400).json({ sucesso: false, erro: 'Nome da fazenda é obrigatório' });
  }
  
  const novaFazenda = {
    id: Date.now().toString(),
    nome,
    municipio: municipio || '',
    estado: estado || '',
    area_total: area_total || 0,
    car: car || '',
    proprietario_id: req.usuario.id,
    minha_permissao: PERMISSOES.DONO,
    compartilhada: false,
    created_at: new Date().toISOString()
  };
  
  fazendasAuth.push(novaFazenda);
  res.status(201).json(novaFazenda);
});

// Middleware para verificar permissão em fazendas
const checkFazendaPermissao = (nivelMinimo) => {
  return (req, res, next) => {
    const { fazendaId } = req.params;
    const permissao = getPermissaoFazenda(req.usuario.id, fazendaId);
    
    if (!permissao) {
      return res.status(403).json({ sucesso: false, erro: 'Acesso negado à fazenda' });
    }
    
    const niveis = [PERMISSOES.VISUALIZADOR, PERMISSOES.OPERADOR, PERMISSOES.GERENTE, PERMISSOES.DONO];
    const nivelUsuario = niveis.indexOf(permissao);
    const nivelRequerido = niveis.indexOf(nivelMinimo);
    
    if (nivelUsuario < nivelRequerido) {
      return res.status(403).json({ sucesso: false, erro: 'Permissão insuficiente' });
    }
    
    req.permissaoFazenda = permissao;
    next();
  };
};

// Rotas de cadastros (filtradas por fazenda do usuário)
app.get('/api/safras', authMiddleware, (req, res) => {
  // TODO: Filtrar safras pelas fazendas que o usuário tem acesso
  res.json(safras);
});

app.get('/api/talhoes', authMiddleware, (req, res) => {
  // TODO: Filtrar talhões pelas fazendas que o usuário tem acesso
  res.json(talhoes);
});

app.get('/api/operadores', authMiddleware, (req, res) => {
  res.json(operadores);
});

app.get('/api/equipamentos', authMiddleware, (req, res) => {
  res.json(equipamentos);
});

// Rotas operacionais
app.get('/api/atividades', authMiddleware, (req, res) => {
  res.json(atividades);
});

app.get('/api/ocorrencias', authMiddleware, (req, res) => {
  res.json(ocorrencias);
});

app.post('/api/ocorrencias', authMiddleware, (req, res) => {
  const { 
    tipo, categoria, titulo, descricao, severidade, 
    latitude, longitude, fotos, talhao_id, fazenda_id,
    talhao_nome, fazenda_nome, area_afetada, metodo_analise, status
  } = req.body;
  
  // Buscar nomes se não foram enviados
  const talhao = talhoes.find(t => t.id === talhao_id);
  const fazenda = fazendas.find(f => f.id === (fazenda_id || talhao?.fazenda_id));
  
  const novaOcorrencia = {
    id: Date.now().toString(),
    tipo: tipo || 'Outro',
    categoria: categoria || 'outro',
    titulo: titulo || '',
    descricao: descricao || '',
    data: new Date().toISOString(),
    severidade: severidade || 'media',
    status: status || 'aberta',
    talhao_id: talhao_id || null,
    talhao_nome: talhao_nome || talhao?.nome || 'Sem talhão',
    fazenda_id: fazenda_id || talhao?.fazenda_id || null,
    fazenda_nome: fazenda_nome || fazenda?.nome || 'Sem fazenda',
    operador_nome: req.usuario?.nome || 'Usuário',
    latitude: latitude || null,
    longitude: longitude || null,
    area_afetada: area_afetada || null,
    metodo_analise: metodo_analise || 'manual',
    foto_url_1: fotos?.[0] || null,
    foto_url_2: fotos?.[1] || null,
    foto_url_3: fotos?.[2] || null
  };
  
  ocorrencias.unshift(novaOcorrencia);
  
  // Se for análise por especialista, notificar
  if (metodo_analise === 'especialista') {
    console.log(`🔔 NOTIFICAÇÃO: Nova inspeção pendente de análise - ID ${novaOcorrencia.id}`);
    console.log(`   Talhão: ${novaOcorrencia.talhao_nome}`);
    console.log(`   Fotos: ${fotos?.length || 0}`);
  }
  
  res.status(201).json(novaOcorrencia);
});

// Rota de notificações para inspeções pendentes
const notificacoesPendentes = [];

app.post('/api/notificacoes/inspecao-pendente', authMiddleware, (req, res) => {
  const { mensagem, talhao, fotos } = req.body;
  
  const notificacao = {
    id: Date.now().toString(),
    tipo: 'inspecao_pendente',
    mensagem,
    talhao,
    fotos,
    usuario_id: req.usuario.id,
    usuario_nome: req.usuario.nome,
    data: new Date().toISOString(),
    lida: false
  };
  
  notificacoesPendentes.push(notificacao);
  
  // Log para debug
  console.log(`🔔 NOTIFICAÇÃO ESPECIALISTA:`);
  console.log(`   De: ${req.usuario.nome}`);
  console.log(`   Talhão: ${talhao}`);
  console.log(`   Fotos: ${fotos}`);
  console.log(`   Data: ${new Date().toLocaleString('pt-BR')}`);
  
  res.json({ sucesso: true, notificacao });
});

app.get('/api/notificacoes', authMiddleware, (req, res) => {
  res.json(notificacoesPendentes.filter(n => !n.lida));
});

app.get('/api/estoque/insumos', authMiddleware, (req, res) => {
  res.json(insumos);
});

app.get('/api/financeiro/despesas', authMiddleware, (req, res) => {
  res.json(despesas);
});

// Rotas de IA (Vision API)
const iaRoutes = require('./routes/ia.routes');
app.use('/api/ia', authMiddleware, iaRoutes);

// Rotas de Inspeção por Especialista (Workflow Híbrido)
const inspecaoEspecialistaRoutes = require('./routes/inspecao-especialista.routes');
app.use('/api/inspecoes', authMiddleware, inspecaoEspecialistaRoutes);

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
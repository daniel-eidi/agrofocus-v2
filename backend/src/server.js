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
const inspecoesRoutes = require('./routes/inspecoes.routes'); // TEMPORARIAMENTE DESATIVADO
const monitoramentoRoutes = require('./routes/monitoramento.routes'); // SUPER MAPA

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

// Inspeções
app.use('/api/inspecoes', authMiddleware, inspecoesRoutes);

// Monitoramento Integrado (Super Mapa)
app.use('/api/monitoramento', authMiddleware, monitoramentoRoutes);

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
    
    if (!nome) {
      return res.status(400).json({ sucesso: false, erro: 'Nome da safra é obrigatório' });
    }
    
    const safra = await Safra.create({
      nome, 
      cultura: cultura || null, 
      ano_inicio: ano_inicio || new Date().getFullYear(), 
      ano_fim: ano_fim || new Date().getFullYear() + 1, 
      status: status || 'planejada', 
      fazenda_id: fazenda_id || null, 
      data_inicio, 
      data_fim
    });
    
    res.status(201).json({ sucesso: true, safra });
  } catch (err) {
    console.error('Erro ao criar safra:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// UPDATE Safra
app.put('/api/safras/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const safra = await Safra.update(id, req.body);
    if (!safra) {
      return res.status(404).json({ sucesso: false, erro: 'Safra não encontrada' });
    }
    res.json({ sucesso: true, safra });
  } catch (err) {
    console.error('Erro ao atualizar safra:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// DELETE Safra com verificação de integridade
app.delete('/api/safras/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { query } = require('./config/database');
    
    // Verificar se há talhões vinculados a esta safra
    const talhoesResult = await query(
      'SELECT COUNT(*) as total FROM talhoes WHERE safra_id = $1',
      [id]
    );
    const totalTalhoes = parseInt(talhoesResult.rows[0].total);
    
    if (totalTalhoes > 0) {
      return res.status(400).json({
        sucesso: false,
        erro: `Não é possível excluir. Existem ${totalTalhoes} talhão(ões) vinculado(s) a esta safra.`
      });
    }
    
    await Safra.delete(id);
    res.json({ sucesso: true, mensagem: 'Safra excluída com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir safra:', err);
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

app.post('/api/operadores', authMiddleware, async (req, res) => {
  try {
    const { nome, funcao, telefone, email, fazenda_id } = req.body;
    
    if (!nome) {
      return res.status(400).json({ sucesso: false, erro: 'Nome é obrigatório' });
    }
    
    const operador = await Operador.create({
      nome,
      funcao: funcao || null,
      telefone: telefone || null,
      email: email || null,
      fazenda_id: fazenda_id || null
    });
    
    res.status(201).json({ sucesso: true, operador });
  } catch (err) {
    console.error('Erro ao criar operador:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

app.delete('/api/operadores/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await Operador.delete(id);
    res.json({ sucesso: true, mensagem: 'Operador desativado' });
  } catch (err) {
    console.error('Erro ao excluir operador:', err);
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

app.post('/api/equipamentos', authMiddleware, async (req, res) => {
  try {
    const { nome, tipo, placa, marca, modelo, ano, fazenda_id } = req.body;
    
    if (!nome) {
      return res.status(400).json({ sucesso: false, erro: 'Nome é obrigatório' });
    }
    
    const equipamento = await Equipamento.create({
      nome,
      tipo: tipo || null,
      placa: placa || null,
      marca: marca || null,
      modelo: modelo || null,
      ano: ano || null,
      status: 'disponivel',
      fazenda_id: fazenda_id || null
    });
    
    res.status(201).json({ sucesso: true, equipamento });
  } catch (err) {
    console.error('Erro ao criar equipamento:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

app.delete('/api/equipamentos/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await Equipamento.delete(id);
    res.json({ sucesso: true, mensagem: 'Equipamento excluído' });
  } catch (err) {
    console.error('Erro ao excluir equipamento:', err);
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

app.post('/api/atividades', authMiddleware, async (req, res) => {
  try {
    const { 
      descricao, tipo, data, data_atividade, status,
      talhao_id, fazenda_id, operador_id, equipamento_id,
      custo_total, observacoes
    } = req.body;
    
    if (!descricao) {
      return res.status(400).json({ sucesso: false, erro: 'Descrição é obrigatória' });
    }
    
    // Buscar primeira fazenda do usuário se não fornecida
    let finalFazendaId = fazenda_id;
    let finalTalhaoId = talhao_id;
    
    if (!finalFazendaId && req.user) {
      const fazendas = await Fazenda.findByProprietario(req.user.id);
      if (fazendas.length > 0) {
        finalFazendaId = fazendas[0].id;
        
        // Se talhao_id foi fornecido, usá-lo; senão, buscar primeiro talhão
        if (!finalTalhaoId) {
          const talhoes = await Talhao.findByFazenda(finalFazendaId);
          if (talhoes.length > 0) {
            finalTalhaoId = talhoes[0].id;
          }
        }
      }
    }
    
    const atividade = await Atividade.create({
      descricao, 
      tipo: tipo || 'PLANTIO', 
      data_atividade: data || data_atividade, 
      status: status || 'planejada',
      talhao_id: finalTalhaoId || null, 
      fazenda_id: finalFazendaId || null, 
      operador_id: operador_id || null, 
      equipamento_id: equipamento_id || null,
      custo_total: custo_total || null, 
      observacoes: observacoes || null
    });
    
    res.status(201).json({ sucesso: true, atividade });
  } catch (err) {
    console.error('Erro ao criar atividade:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

app.put('/api/atividades/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const atividade = await Atividade.update(id, req.body);
    if (!atividade) {
      return res.status(404).json({ sucesso: false, erro: 'Atividade não encontrada' });
    }
    res.json({ sucesso: true, atividade });
  } catch (err) {
    console.error('Erro ao atualizar atividade:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

app.delete('/api/atividades/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await Atividade.delete(id);
    res.json({ sucesso: true, mensagem: 'Atividade excluída' });
  } catch (err) {
    console.error('Erro ao excluir atividade:', err);
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

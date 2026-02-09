/**
 * AgroFocus - Ocorrências Routes (PostgreSQL)
 * CRUD completo de ocorrências (pragas, doenças, etc.)
 */

const express = require('express');
const router = express.Router();
const { Ocorrencia, Talhao } = require('../models/db.models');
const { authMiddleware, getPermissaoFazenda, PERMISSOES } = require('./auth.routes');

// LISTAR todas as ocorrências
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { fazenda_id, talhao_id, status, categoria } = req.query;
    
    // Verificar permissão se filtrando por fazenda
    if (fazenda_id) {
      const permissao = await getPermissaoFazenda(req.usuario.id, fazenda_id);
      if (!permissao) {
        return res.status(403).json({ sucesso: false, erro: 'Acesso negado à fazenda' });
      }
    }
    
    const ocorrencias = await Ocorrencia.findAll({ 
      fazenda_id, 
      talhao_id, 
      status, 
      categoria 
    });
    
    res.json(ocorrencias);
  } catch (err) {
    console.error('Erro ao listar ocorrências:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// OBTER uma ocorrência específica
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const ocorrencia = await Ocorrencia.findById(id);
    if (!ocorrencia) {
      return res.status(404).json({ sucesso: false, erro: 'Ocorrência não encontrada' });
    }
    
    // Verificar permissão na fazenda
    const permissao = await getPermissaoFazenda(req.usuario.id, ocorrencia.fazenda_id);
    if (!permissao) {
      return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
    }
    
    res.json(ocorrencia);
  } catch (err) {
    console.error('Erro ao buscar ocorrência:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// CRIAR nova ocorrência
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      tipo, categoria, titulo, descricao, severidade, status = 'aberta',
      talhao_id, fazenda_id, talhao_nome, fazenda_nome,
      latitude, longitude, area_afetada,
      metodo_analise = 'manual', ia_analise, ia_confianca,
      foto_url_1, foto_url_2, foto_url_3
    } = req.body;
    
    if (!tipo) {
      return res.status(400).json({ sucesso: false, erro: 'Tipo da ocorrência é obrigatório' });
    }
    
    // Determinar fazenda e talhão
    let finalFazendaId = fazenda_id;
    let finalTalhaoNome = talhao_nome;
    let finalFazendaNome = fazenda_nome;
    
    if (talhao_id && !fazenda_id) {
      const talhao = await Talhao.findById(talhao_id);
      if (talhao) {
        finalFazendaId = talhao.fazenda_id;
        finalTalhaoNome = finalTalhaoNome || talhao.nome;
      }
    }
    
    // Verificar permissão
    if (finalFazendaId) {
      const permissao = await getPermissaoFazenda(req.usuario.id, finalFazendaId);
      if (!permissao) {
        return res.status(403).json({ sucesso: false, erro: 'Acesso negado à fazenda' });
      }
    }
    
    const ocorrencia = await Ocorrencia.create({
      tipo,
      categoria,
      titulo,
      descricao,
      severidade,
      status,
      talhao_id,
      fazenda_id: finalFazendaId,
      talhao_nome: finalTalhaoNome,
      fazenda_nome: finalFazendaNome,
      operador_id: req.usuario.id,
      operador_nome: req.usuario.nome,
      latitude,
      longitude,
      area_afetada,
      metodo_analise,
      ia_analise,
      ia_confianca,
      foto_url_1,
      foto_url_2,
      foto_url_3
    });
    
    res.status(201).json({
      sucesso: true,
      mensagem: 'Ocorrência registrada com sucesso',
      ocorrencia
    });
  } catch (err) {
    console.error('Erro ao criar ocorrência:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// ATUALIZAR ocorrência
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar ocorrência existente
    const ocorrenciaExistente = await Ocorrencia.findById(id);
    if (!ocorrenciaExistente) {
      return res.status(404).json({ sucesso: false, erro: 'Ocorrência não encontrada' });
    }
    
    // Verificar permissão
    const permissao = await getPermissaoFazenda(req.usuario.id, ocorrenciaExistente.fazenda_id);
    if (!permissao || (permissao === PERMISSOES.VISUALIZADOR)) {
      return res.status(403).json({ sucesso: false, erro: 'Permissão insuficiente' });
    }
    
    const updates = req.body;
    
    // Se está resolvendo, adicionar data de resolução
    if (updates.status === 'resolvida' && ocorrenciaExistente.status !== 'resolvida') {
      updates.data_resolucao = new Date().toISOString();
    }
    
    const ocorrencia = await Ocorrencia.update(id, updates);
    
    res.json({
      sucesso: true,
      mensagem: 'Ocorrência atualizada com sucesso',
      ocorrencia
    });
  } catch (err) {
    console.error('Erro ao atualizar ocorrência:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// EXCLUIR ocorrência
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar ocorrência existente
    const ocorrenciaExistente = await Ocorrencia.findById(id);
    if (!ocorrenciaExistente) {
      return res.status(404).json({ sucesso: false, erro: 'Ocorrência não encontrada' });
    }
    
    // Verificar permissão (apenas dono ou gerente pode excluir)
    const permissao = await getPermissaoFazenda(req.usuario.id, ocorrenciaExistente.fazenda_id);
    if (permissao !== PERMISSOES.DONO && permissao !== PERMISSOES.GERENTE) {
      return res.status(403).json({ sucesso: false, erro: 'Permissão insuficiente' });
    }
    
    await Ocorrencia.delete(id);
    
    res.json({
      sucesso: true,
      mensagem: 'Ocorrência excluída com sucesso'
    });
  } catch (err) {
    console.error('Erro ao excluir ocorrência:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// OBTER resumo/estatísticas de ocorrências
router.get('/estatisticas/resumo', authMiddleware, async (req, res) => {
  try {
    const { fazenda_id } = req.query;
    const { query } = require('../config/database');
    
    if (!fazenda_id) {
      return res.status(400).json({ sucesso: false, erro: 'ID da fazenda é obrigatório' });
    }
    
    // Verificar permissão
    const permissao = await getPermissaoFazenda(req.usuario.id, fazenda_id);
    if (!permissao) {
      return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
    }
    
    const [statusResult, categoriaResult, totalResult] = await Promise.all([
      query('SELECT status, COUNT(*) as total FROM ocorrencias WHERE fazenda_id = $1 GROUP BY status', [fazenda_id]),
      query('SELECT categoria, COUNT(*) as total FROM ocorrencias WHERE fazenda_id = $1 GROUP BY categoria', [fazenda_id]),
      query('SELECT COUNT(*) as total FROM ocorrencias WHERE fazenda_id = $1', [fazenda_id])
    ]);
    
    res.json({
      sucesso: true,
      estatisticas: {
        total: parseInt(totalResult.rows[0]?.total || 0),
        por_status: statusResult.rows,
        por_categoria: categoriaResult.rows
      }
    });
  } catch (err) {
    console.error('Erro ao buscar estatísticas:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// OBTER ocorrências próximas a uma coordenada
router.get('/proximas/pesquisar', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, raio = 1000 } = req.query; // raio em metros
    const { query } = require('../config/database');
    
    if (!lat || !lng) {
      return res.status(400).json({ sucesso: false, erro: 'Latitude e longitude são obrigatórias' });
    }
    
    const result = await query(
      `SELECT o.*, 
              ST_Distance(o.localizacao::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distancia
       FROM ocorrencias o
       WHERE o.localizacao IS NOT NULL
         AND ST_DWithin(o.localizacao::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
       ORDER BY distancia
       LIMIT 50`,
      [lng, lat, raio]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar ocorrências próximas:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

module.exports = router;

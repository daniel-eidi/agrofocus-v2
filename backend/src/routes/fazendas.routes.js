/**
 * AgroFocus - Fazendas Routes (PostgreSQL)
 * CRUD completo de fazendas
 */

const express = require('express');
const router = express.Router();
const { Fazenda, Talhao, Permissao } = require('../models/db.models');
const { authMiddleware, getPermissaoFazenda, PERMISSOES } = require('./auth.routes');

// Middleware para verificar permissão
const checkPermissao = (nivelMinimo) => {
  return async (req, res, next) => {
    const { fazendaId } = req.params;
    const permissao = await getPermissaoFazenda(req.usuario.id, fazendaId);
    
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

// LISTAR todas as fazendas do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    const fazendas = await Fazenda.findByUsuario(req.usuario.id);
    res.json(fazendas);
  } catch (err) {
    console.error('Erro ao listar fazendas:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// OBTER uma fazenda específica
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar permissão
    const permissao = await getPermissaoFazenda(req.usuario.id, id);
    if (!permissao) {
      return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
    }
    
    const fazenda = await Fazenda.findById(id);
    if (!fazenda) {
      return res.status(404).json({ sucesso: false, erro: 'Fazenda não encontrada' });
    }
    
    res.json({
      ...fazenda,
      minha_permissao: permissao,
      compartilhada: fazenda.proprietario_id !== req.usuario.id
    });
  } catch (err) {
    console.error('Erro ao buscar fazenda:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// CRIAR nova fazenda
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { nome, municipio, estado, area_total, car, geometria } = req.body;
    
    if (!nome) {
      return res.status(400).json({ sucesso: false, erro: 'Nome da fazenda é obrigatório' });
    }
    
    const fazenda = await Fazenda.create({
      nome,
      municipio: municipio || '',
      estado: estado || '',
      area_total: area_total || 0,
      car: car || '',
      proprietario_id: req.usuario.id,
      geometria
    });
    
    res.status(201).json({
      sucesso: true,
      mensagem: 'Fazenda criada com sucesso',
      fazenda: {
        ...fazenda,
        minha_permissao: PERMISSOES.DONO,
        compartilhada: false
      }
    });
  } catch (err) {
    console.error('Erro ao criar fazenda:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// ATUALIZAR fazenda
router.put('/:id', authMiddleware, checkPermissao(PERMISSOES.GERENTE), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, municipio, estado, area_total, car, geometria } = req.body;
    
    const fazenda = await Fazenda.update(id, {
      nome,
      municipio,
      estado,
      area_total,
      car,
      geometria
    });
    
    if (!fazenda) {
      return res.status(404).json({ sucesso: false, erro: 'Fazenda não encontrada' });
    }
    
    res.json({
      sucesso: true,
      mensagem: 'Fazenda atualizada com sucesso',
      fazenda
    });
  } catch (err) {
    console.error('Erro ao atualizar fazenda:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// EXCLUIR fazenda
router.delete('/:id', authMiddleware, checkPermissao(PERMISSOES.DONO), async (req, res) => {
  try {
    const { id } = req.params;
    
    await Fazenda.delete(id);
    
    res.json({
      sucesso: true,
      mensagem: 'Fazenda excluída com sucesso'
    });
  } catch (err) {
    console.error('Erro ao excluir fazenda:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// OBTER talhões de uma fazenda
router.get('/:id/talhoes', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar permissão
    const permissao = await getPermissaoFazenda(req.usuario.id, id);
    if (!permissao) {
      return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
    }
    
    const talhoes = await Talhao.findByFazenda(id);
    
    // Parse do GeoJSON
    const talhoesFormatados = talhoes.map(t => ({
      ...t,
      geojson: t.geojson ? JSON.parse(t.geojson) : null,
      centroide: t.centroide || null
    }));
    
    res.json(talhoesFormatados);
  } catch (err) {
    console.error('Erro ao buscar talhões da fazenda:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// OBTER resumo/dashboard da fazenda
router.get('/:id/resumo', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar permissão
    const permissao = await getPermissaoFazenda(req.usuario.id, id);
    if (!permissao) {
      return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
    }
    
    // Buscar dados agregados
    const { query } = require('../config/database');
    
    const [fazendaResult, talhoesResult, ocorrenciasResult, safraResult] = await Promise.all([
      Fazenda.findById(id),
      Talhao.findByFazenda(id),
      query('SELECT status, COUNT(*) as total FROM ocorrencias WHERE fazenda_id = $1 GROUP BY status', [id]),
      query('SELECT * FROM safras WHERE fazenda_id = $1 AND status = $2 LIMIT 1', [id, 'em_andamento'])
    ]);
    
    const areaTotal = talhoesResult.reduce((sum, t) => sum + parseFloat(t.area_hectares || 0), 0);
    const ocorrenciasAbertas = ocorrenciasResult.rows.find(o => o.status === 'aberta')?.total || 0;
    
    res.json({
      sucesso: true,
      resumo: {
        fazenda: fazendaResult,
        total_talhoes: talhoesResult.length,
        area_total_hectares: areaTotal,
        safra_atual: safraResult.rows[0] || null,
        ocorrencias: {
          abertas: ocorrenciasAbertas,
          por_status: ocorrenciasResult.rows
        }
      }
    });
  } catch (err) {
    console.error('Erro ao buscar resumo da fazenda:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

module.exports = router;

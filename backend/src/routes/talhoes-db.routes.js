/**
 * AgroFocus - Talhões Routes (PostgreSQL + GeoJSON)
 * CRUD completo de talhões com geometria geoespacial
 */

const express = require('express');
const router = express.Router();
const { Talhao, Fazenda } = require('../models/db.models');
const { authMiddleware, getPermissaoFazenda, PERMISSOES } = require('./auth.routes');

// Middleware para verificar permissão na fazenda do talhão
const checkFazendaPermissao = (nivelMinimo) => {
  return async (req, res, next) => {
    try {
      const talhaoId = req.params.id;
      const talhao = await Talhao.findById(talhaoId);
      
      if (!talhao) {
        return res.status(404).json({ sucesso: false, erro: 'Talhão não encontrado' });
      }
      
      const permissao = await getPermissaoFazenda(req.usuario.id, talhao.fazenda_id);
      
      if (!permissao) {
        return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
      }
      
      const niveis = [PERMISSOES.VISUALIZADOR, PERMISSOES.OPERADOR, PERMISSOES.GERENTE, PERMISSOES.DONO];
      const nivelUsuario = niveis.indexOf(permissao);
      const nivelRequerido = niveis.indexOf(nivelMinimo);
      
      if (nivelUsuario < nivelRequerido) {
        return res.status(403).json({ sucesso: false, erro: 'Permissão insuficiente' });
      }
      
      req.talhao = talhao;
      req.permissaoFazenda = permissao;
      next();
    } catch (err) {
      console.error('Erro no middleware de permissão:', err);
      res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
    }
  };
};

// LISTAR todos os talhões (com filtro opcional por fazenda)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { fazenda_id } = req.query;
    
    // Se especificou fazenda, verificar permissão
    if (fazenda_id) {
      const permissao = await getPermissaoFazenda(req.usuario.id, fazenda_id);
      if (!permissao) {
        return res.status(403).json({ sucesso: false, erro: 'Acesso negado à fazenda' });
      }
    }
    
    const talhoes = await Talhao.findAll({ fazenda_id });
    
    // Parse do GeoJSON para cada talhão
    const talhoesFormatados = talhoes.map(t => ({
      ...t,
      geojson: t.geojson ? JSON.parse(t.geojson) : null,
      coordenadas: typeof t.coordenadas === 'string' ? JSON.parse(t.coordenadas) : t.coordenadas,
      centroide: t.centroide_geojson ? JSON.parse(t.centroide_geojson) : null
    }));
    
    res.json(talhoesFormatados);
  } catch (err) {
    console.error('Erro ao listar talhões:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// OBTER um talhão específico (com GeoJSON completo)
router.get('/:id', authMiddleware, checkFazendaPermissao(PERMISSOES.VISUALIZADOR), async (req, res) => {
  try {
    const talhao = req.talhao;
    
    // Parse do GeoJSON
    const talhaoFormatado = {
      ...talhao,
      geojson: talhao.geojson ? JSON.parse(talhao.geojson) : null,
      coordenadas: typeof talhao.coordenadas === 'string' ? JSON.parse(talhao.coordenadas) : talhao.coordenadas,
      centroide: talhao.centroide_geojson ? JSON.parse(talhao.centroide_geojson) : null
    };
    
    res.json(talhaoFormatado);
  } catch (err) {
    console.error('Erro ao buscar talhão:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// OBTER GeoJSON de um talhão (para mapas)
router.get('/:id/geojson', authMiddleware, checkFazendaPermissao(PERMISSOES.VISUALIZADOR), async (req, res) => {
  try {
    const { id } = req.params;
    const { query } = require('../config/database');
    
    const result = await query(
      `SELECT 
        json_build_object(
          'type', 'Feature',
          'id', t.id,
          'geometry', ST_AsGeoJSON(t.geometria)::json,
          'properties', json_build_object(
            'id', t.id,
            'nome', t.nome,
            'area_hectares', t.area_hectares,
            'tipo_solo', t.tipo_solo,
            'status', t.status,
            'fazenda_id', t.fazenda_id,
            'fazenda_nome', f.nome,
            'safra_id', t.safra_id,
            'created_at', t.created_at
          )
        ) as feature
       FROM talhoes t
       LEFT JOIN fazendas f ON t.fazenda_id = f.id
       WHERE t.id = $1`,
      [id]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ sucesso: false, erro: 'Talhão não encontrado' });
    }
    
    res.json(result.rows[0].feature);
  } catch (err) {
    console.error('Erro ao buscar GeoJSON do talhão:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// CRIAR novo talhão
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { 
      nome, 
      area_hectares, 
      tipo_solo, 
      fazenda_id, 
      safra_id, 
      geometria, 
      coordenadas,
      status = 'ativo' 
    } = req.body;
    
    if (!nome || !fazenda_id) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Nome do talhão e fazenda são obrigatórios' 
      });
    }
    
    // Verificar permissão na fazenda
    const permissao = await getPermissaoFazenda(req.usuario.id, fazenda_id);
    if (!permissao || (permissao !== PERMISSOES.DONO && permissao !== PERMISSOES.GERENTE)) {
      return res.status(403).json({ sucesso: false, erro: 'Permissão insuficiente' });
    }
    
    const talhao = await Talhao.create({
      nome,
      area_hectares,
      tipo_solo,
      fazenda_id,
      safra_id,
      geometria,
      coordenadas,
      status
    });
    
    // Parse do GeoJSON na resposta
    const talhaoFormatado = {
      ...talhao,
      geojson: talhao.geojson ? JSON.parse(talhao.geojson) : null,
      coordenadas: typeof talhao.coordenadas === 'string' ? JSON.parse(talhao.coordenadas) : talhao.coordenadas
    };
    
    res.status(201).json({
      sucesso: true,
      mensagem: 'Talhão criado com sucesso',
      talhao: talhaoFormatado
    });
  } catch (err) {
    console.error('Erro ao criar talhão:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// ATUALIZAR talhão
router.put('/:id', authMiddleware, checkFazendaPermissao(PERMISSOES.GERENTE), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, area_hectares, tipo_solo, safra_id, geometria, coordenadas, status } = req.body;
    
    const talhao = await Talhao.update(id, {
      nome,
      area_hectares,
      tipo_solo,
      safra_id,
      geometria,
      coordenadas,
      status
    });
    
    if (!talhao) {
      return res.status(404).json({ sucesso: false, erro: 'Talhão não encontrado' });
    }
    
    const talhaoFormatado = {
      ...talhao,
      geojson: talhao.geojson ? JSON.parse(talhao.geojson) : null,
      coordenadas: typeof talhao.coordenadas === 'string' ? JSON.parse(talhao.coordenadas) : talhao.coordenadas
    };
    
    res.json({
      sucesso: true,
      mensagem: 'Talhão atualizado com sucesso',
      talhao: talhaoFormatado
    });
  } catch (err) {
    console.error('Erro ao atualizar talhão:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// EXCLUIR talhão com verificação de integridade
router.delete('/:id', authMiddleware, checkFazendaPermissao(PERMISSOES.DONO), async (req, res) => {
  try {
    const { id } = req.params;
    const { query } = require('../config/database');
    
    // Verificar se há ocorrências vinculadas
    const ocorrenciasResult = await query(
      'SELECT COUNT(*) as total FROM ocorrencias WHERE talhao_id = $1',
      [id]
    );
    const totalOcorrencias = parseInt(ocorrenciasResult.rows[0].total);
    
    // Verificar se há inspeções vinculadas
    const inspecoesResult = await query(
      'SELECT COUNT(*) as total FROM inspecoes WHERE talhao_id = $1',
      [id]
    );
    const totalInspecoes = parseInt(inspecoesResult.rows[0].total);
    
    if (totalOcorrencias > 0 || totalInspecoes > 0) {
      const mensagens = [];
      if (totalOcorrencias > 0) mensagens.push(`${totalOcorrencias} ocorrência(s)`);
      if (totalInspecoes > 0) mensagens.push(`${totalInspecoes} inspeção(ões)`);
      
      return res.status(400).json({
        sucesso: false,
        erro: `Não é possível excluir. Existem ${mensagens.join(' e ')} vinculada(s) a este talhão.`
      });
    }
    
    await Talhao.delete(id);
    
    res.json({
      sucesso: true,
      mensagem: 'Talhão excluído com sucesso'
    });
  } catch (err) {
    console.error('Erro ao excluir talhão:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// BUSCAR talhões próximos a uma coordenada
router.get('/proximos/pesquisar', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, raio = 5000 } = req.query; // raio em metros, padrão 5km
    
    if (!lat || !lng) {
      return res.status(400).json({ sucesso: false, erro: 'Latitude e longitude são obrigatórias' });
    }
    
    const talhoes = await Talhao.findWithinRadius(parseFloat(lat), parseFloat(lng), parseInt(raio));
    
    res.json(talhoes);
  } catch (err) {
    console.error('Erro ao buscar talhões próximos:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

// OBTER todos os talhões como FeatureCollection GeoJSON
router.get('/geojson/todos', authMiddleware, async (req, res) => {
  try {
    const { fazenda_id } = req.query;
    const { query } = require('../config/database');
    
    let sql = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', json_agg(
          json_build_object(
            'type', 'Feature',
            'id', t.id,
            'geometry', ST_AsGeoJSON(t.geometria)::json,
            'properties', json_build_object(
              'id', t.id,
              'nome', t.nome,
              'area_hectares', t.area_hectares,
              'tipo_solo', t.tipo_solo,
              'status', t.status,
              'fazenda_id', t.fazenda_id,
              'fazenda_nome', f.nome,
              'safra_id', t.safra_id
            )
          )
        )
      ) as geojson
      FROM talhoes t
      LEFT JOIN fazendas f ON t.fazenda_id = f.id
    `;
    
    const values = [];
    if (fazenda_id) {
      sql += ' WHERE t.fazenda_id = $1';
      values.push(fazenda_id);
    }
    
    const result = await query(sql, values);
    
    res.json(result.rows[0]?.geojson || { type: 'FeatureCollection', features: [] });
  } catch (err) {
    console.error('Erro ao buscar GeoJSON dos talhões:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
  }
});

module.exports = router;

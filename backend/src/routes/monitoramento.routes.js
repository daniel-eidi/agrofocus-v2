/**
 * AgroFocus - Rotas de Monitoramento Integrado
 * Super Mapa com NDVI, Inspeções e Maquinário
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const axios = require('axios');

// URL do serviço GEE Python
const GEE_SERVICE_URL = process.env.GEE_SERVICE_URL || 'http://localhost:5001';

/**
 * GET /api/monitoramento/camadas/:talhaoId
 * Retorna dados consolidados para o mapa de monitoramento
 */
router.get('/camadas/:talhaoId', async (req, res) => {
  try {
    const { talhaoId } = req.params;
    const userId = req.user?.id;

    // 1. Buscar talhão com geometria
    const talhaoResult = await query(`
      SELECT 
        t.id,
        t.nome,
        t.area_hectares,
        t.tipo_solo,
        t.status,
        t.fazenda_id,
        f.nome as fazenda_nome,
        s.nome as safra_nome,
        s.cultura,
        ST_AsGeoJSON(t.geometria) as geometria_geojson,
        CASE 
          WHEN t.centroide IS NULL THEN NULL 
          ELSE json_build_object(
            'lat', ST_Y(t.centroide),
            'lng', ST_X(t.centroide)
          ) 
        END as centroide
      FROM talhoes t
      LEFT JOIN fazendas f ON t.fazenda_id = f.id
      LEFT JOIN safras s ON t.safra_id = s.id
      WHERE t.id = $1
    `, [talhaoId]);

    if (talhaoResult.rows.length === 0) {
      return res.status(404).json({ 
        sucesso: false, 
        erro: 'Talhão não encontrado' 
      });
    }

    const talhao = talhaoResult.rows[0];
    const geometria = talhao.geometria_geojson 
      ? JSON.parse(talhao.geometria_geojson) 
      : null;

    // 2. Buscar inspeções do talhão
    const inspecoesResult = await query(`
      SELECT 
        id,
        COALESCE(analise_tipo, 'Inspeção') as tipo,
        COALESCE(analise_categoria, 'geral') as categoria,
        latitude,
        longitude,
        data_criacao as data,
        COALESCE(analise_severidade, 'baixa') as severidade,
        status,
        observacoes,
        COALESCE(cultura, 'Não informada') as cultura
      FROM inspecoes
      WHERE (talhao_id = $1
        OR (
          latitude IS NOT NULL 
          AND longitude IS NOT NULL
          AND fazenda_id = $2
        ))
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
      ORDER BY data_criacao DESC
      LIMIT 50
    `, [talhaoId, talhao.fazenda_id]);

    // 3. Buscar NDVI do GEE Service (últimas 10 imagens)
    let ndviData = { imagens: [], modo: 'offline' };
    
    if (geometria) {
      try {
        // Definir período: últimos 90 dias
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0];

        const geeResponse = await axios.post(`${GEE_SERVICE_URL}/list-images`, {
          geometry: geometria,
          startDate,
          endDate
        }, { timeout: 30000 });

        if (geeResponse.data.success) {
          ndviData = {
            imagens: geeResponse.data.images.map(img => ({
              id: img.image_id,
              data: img.date,
              cobertura_nuvens: img.cloud_cover,
              tile_url: img.tile_url
            })),
            modo: geeResponse.data.mode || 'real'
          };
        }
      } catch (geeError) {
        console.warn('GEE Service indisponível, usando mock:', geeError.message);
        // Mock de imagens NDVI
        ndviData = gerarMockNdvi();
      }
    } else {
      // Sem geometria, usar mock
      ndviData = gerarMockNdvi();
    }

    // 4. Buscar maquinário (verificar se existe tabela de rastreamento)
    let maquinarioData = { ativos: [], rastro_dia: [] };
    
    try {
      // Tentar buscar equipamentos ativos
      const equipamentosResult = await query(`
        SELECT 
          id,
          nome,
          tipo,
          status
        FROM equipamentos
        WHERE fazenda_id = $1
          AND status = 'em_uso'
        LIMIT 10
      `, [talhao.fazenda_id]);

      // Gerar posições mock para equipamentos em uso
      const centroide = talhao.centroide;
      if (centroide && centroide.lat && centroide.lng) {
        maquinarioData.ativos = equipamentosResult.rows.map((eq, idx) => ({
          id: eq.id,
          nome: eq.nome,
          tipo: eq.tipo,
          lat: centroide.lat + (Math.random() - 0.5) * 0.01,
          lng: centroide.lng + (Math.random() - 0.5) * 0.01,
          ultima_atualizacao: new Date().toISOString(),
          velocidade: Math.round(Math.random() * 15 + 5) // km/h
        }));

        // Gerar rastro simulado para o primeiro equipamento
        if (maquinarioData.ativos.length > 0) {
          const rastro = gerarRastroSimulado(
            centroide.lat, 
            centroide.lng,
            maquinarioData.ativos[0].id
          );
          maquinarioData.rastro_dia = [rastro];
        }
      }
    } catch (eqError) {
      console.warn('Erro ao buscar equipamentos:', eqError.message);
    }

    // 5. Montar resposta consolidada
    const resposta = {
      sucesso: true,
      talhao: {
        id: talhao.id,
        nome: talhao.nome,
        area_hectares: talhao.area_hectares,
        fazenda_nome: talhao.fazenda_nome,
        safra: talhao.safra_nome,
        cultura: talhao.cultura,
        centroide: talhao.centroide,
        geometria: geometria
      },
      ndvi: ndviData,
      inspecoes: inspecoesResult.rows.map(insp => ({
        id: insp.id,
        tipo: insp.tipo,
        categoria: insp.categoria,
        latitude: parseFloat(insp.latitude),
        longitude: parseFloat(insp.longitude),
        data: insp.data,
        severidade: insp.severidade,
        status: insp.status,
        cultura: insp.cultura
      })),
      maquinario: maquinarioData
    };

    res.json(resposta);

  } catch (error) {
    console.error('Erro em /monitoramento/camadas:', error);
    res.status(500).json({ 
      sucesso: false, 
      erro: 'Erro interno do servidor',
      detalhes: error.message 
    });
  }
});

/**
 * GET /api/monitoramento/ndvi/:talhaoId
 * Busca NDVI específico para uma data
 */
router.get('/ndvi/:talhaoId', async (req, res) => {
  try {
    const { talhaoId } = req.params;
    const { imageId, date } = req.query;

    // Buscar geometria do talhão
    const talhaoResult = await query(`
      SELECT ST_AsGeoJSON(geometria) as geometria_geojson
      FROM talhoes WHERE id = $1
    `, [talhaoId]);

    if (talhaoResult.rows.length === 0 || !talhaoResult.rows[0].geometria_geojson) {
      return res.status(404).json({ 
        sucesso: false, 
        erro: 'Talhão não encontrado ou sem geometria' 
      });
    }

    const geometria = JSON.parse(talhaoResult.rows[0].geometria_geojson);

    try {
      const geeResponse = await axios.post(`${GEE_SERVICE_URL}/ndvi`, {
        geometry: geometria,
        imageId,
        date
      }, { timeout: 30000 });

      if (geeResponse.data.success) {
        res.json({
          sucesso: true,
          tile_url: geeResponse.data.tileUrl,
          stats: geeResponse.data.stats,
          modo: geeResponse.data.mode || 'real'
        });
      } else {
        throw new Error('GEE retornou erro');
      }
    } catch (geeError) {
      // Mock response
      res.json({
        sucesso: true,
        tile_url: null,
        stats: { mean: 0.65, min: 0.2, max: 0.9 },
        modo: 'mock'
      });
    }

  } catch (error) {
    console.error('Erro em /monitoramento/ndvi:', error);
    res.status(500).json({ 
      sucesso: false, 
      erro: 'Erro interno do servidor' 
    });
  }
});

/**
 * GET /api/monitoramento/talhoes
 * Lista todos os talhões disponíveis para monitoramento
 */
router.get('/talhoes', async (req, res) => {
  try {
    const { fazenda_id } = req.query;
    const userId = req.user?.id;

    let sql = `
      SELECT 
        t.id,
        t.nome,
        t.area_hectares,
        t.fazenda_id,
        f.nome as fazenda_nome,
        s.cultura,
        CASE 
          WHEN t.centroide IS NULL THEN NULL 
          ELSE json_build_object(
            'lat', ST_Y(t.centroide),
            'lng', ST_X(t.centroide)
          ) 
        END as centroide,
        CASE WHEN t.geometria IS NOT NULL THEN true ELSE false END as tem_geometria
      FROM talhoes t
      LEFT JOIN fazendas f ON t.fazenda_id = f.id
      LEFT JOIN safras s ON t.safra_id = s.id
    `;
    
    const values = [];
    const conditions = [];

    if (fazenda_id) {
      values.push(fazenda_id);
      conditions.push(`t.fazenda_id = $${values.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY f.nome, t.nome';

    const result = await query(sql, values);

    res.json({
      sucesso: true,
      talhoes: result.rows
    });

  } catch (error) {
    console.error('Erro em /monitoramento/talhoes:', error);
    res.status(500).json({ 
      sucesso: false, 
      erro: 'Erro interno do servidor' 
    });
  }
});

/**
 * GET /api/monitoramento/fazenda/:fazendaId
 * Retorna todos os talhões de uma fazenda com geometria para visualização no mapa
 */
router.get('/fazenda/:fazendaId', async (req, res) => {
  try {
    const { fazendaId } = req.params;
    
    // 1. Buscar todos os talhões da fazenda com geometria
    const talhoesResult = await query(`
      SELECT 
        t.id,
        t.nome,
        t.area_hectares,
        t.status,
        s.nome as safra_nome,
        s.cultura,
        ST_AsGeoJSON(t.geometria) as geometria_geojson,
        CASE 
          WHEN t.centroide IS NULL THEN NULL 
          ELSE json_build_object(
            'lat', ST_Y(t.centroide),
            'lng', ST_X(t.centroide)
          ) 
        END as centroide
      FROM talhoes t
      LEFT JOIN safras s ON t.safra_id = s.id
      WHERE t.fazenda_id = $1 
        AND t.geometria IS NOT NULL
      ORDER BY t.nome
    `, [fazendaId]);

    if (talhoesResult.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Nenhum talhão com geometria encontrado para esta fazenda'
      });
    }

    const talhoes = talhoesResult.rows.map(t => ({
      ...t,
      geometria: t.geometria_geojson ? JSON.parse(t.geometria_geojson) : null
    }));

    // 2. Criar FeatureCollection para o GEE
    const featureCollection = {
      type: 'FeatureCollection',
      features: talhoes.map(t => ({
        type: 'Feature',
        properties: { 
          id: t.id, 
          nome: t.nome,
          cultura: t.cultura 
        },
        geometry: t.geometria
      }))
    };

    // 3. Buscar NDVI cobrindo toda a área da fazenda
    let ndviData = { imagens: [], modo: 'offline' };
    
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      // Usar o centroide do primeiro talhão como referência para buscar imagens
      const geeResponse = await axios.post(`${GEE_SERVICE_URL}/list-images`, {
        geometry: featureCollection,
        startDate,
        endDate
      }, { timeout: 30000 });

      if (geeResponse.data.success) {
        ndviData = {
          imagens: geeResponse.data.images.map(img => ({
            id: img.image_id,
            data: img.date,
            cobertura_nuvens: img.cloud_cover,
            tile_url: null
          })),
          modo: geeResponse.data.mode || 'real'
        };
      }
    } catch (geeError) {
      console.warn('GEE Service indisponível para fazenda:', geeError.message);
      ndviData = gerarMockNdvi();
    }

    res.json({
      sucesso: true,
      fazenda_id: parseInt(fazendaId),
      talhoes: talhoes,
      ndvi: ndviData,
      total_talhoes: talhoes.length,
      area_total_ha: talhoes.reduce((sum, t) => sum + parseFloat(t.area_hectares || 0), 0)
    });

  } catch (error) {
    console.error('Erro em /monitoramento/fazenda:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro interno do servidor'
    });
  }
});

// --- Funções auxiliares ---

function gerarMockNdvi() {
  const imagens = [];
  let currentDate = new Date();

  for (let i = 0; i < 10; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    imagens.push({
      id: `MOCK_${dateStr.replace(/-/g, '')}`,
      data: dateStr,
      cobertura_nuvens: Math.round(Math.random() * 25),
      tile_url: null // Frontend tratará como mock
    });
    // Voltar 5-8 dias
    currentDate = new Date(currentDate.getTime() - (5 + Math.random() * 3) * 24 * 60 * 60 * 1000);
  }

  return { imagens, modo: 'mock' };
}

function gerarRastroSimulado(baseLat, baseLng, equipamentoId) {
  const coordenadas = [];
  let lat = baseLat;
  let lng = baseLng;
  const now = Date.now();

  // Simular 8 horas de trabalho (5 em 5 minutos = 96 pontos)
  for (let i = 0; i < 96; i++) {
    // Movimento tipo "passada" no campo
    if (i % 12 < 6) {
      lng += 0.0002; // Vai para direita
    } else {
      lng -= 0.0002; // Volta para esquerda
    }
    if (i % 12 === 5 || i % 12 === 11) {
      lat += 0.0001; // Avança uma linha
    }

    coordenadas.push([
      lat + (Math.random() - 0.5) * 0.00005,
      lng + (Math.random() - 0.5) * 0.00005,
      now - (96 - i) * 5 * 60 * 1000 // Timestamp
    ]);
  }

  return {
    equipamento_id: equipamentoId,
    coordenadas
  };
}

module.exports = router;

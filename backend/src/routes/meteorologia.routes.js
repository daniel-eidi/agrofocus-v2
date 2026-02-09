/**
 * Rotas de Meteorologia - AgroFocus
 * Inclui GDD (Growing Degree Days) e dados climáticos
 */

const express = require('express');
const router = express.Router();
const gddService = require('../services/gdd.service');

// Middleware de validação
const validarGDDParams = (req, res, next) => {
  const { data_plantio, cultura_id } = req.query;
  
  if (!data_plantio) {
    return res.status(400).json({ 
      erro: 'Parâmetro data_plantio é obrigatório (formato: YYYY-MM-DD)' 
    });
  }
  
  if (!cultura_id) {
    return res.status(400).json({ 
      erro: 'Parâmetro cultura_id é obrigatório' 
    });
  }
  
  // Valida formato da data
  const dataRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dataRegex.test(data_plantio)) {
    return res.status(400).json({ 
      erro: 'Data de plantio deve estar no formato YYYY-MM-DD' 
    });
  }
  
  next();
};

/**
 * GET /api/gdd/:talhaoId
 * Calcula GDD acumulado para um talhão
 * 
 * Query params:
 * - data_plantio: Data de plantio (YYYY-MM-DD)
 * - cultura_id: ID da cultura (milho, soja, trigo, etc.)
 * - lat: Latitude do talhão
 * - lng: Longitude do talhão
 * 
 * Exemplo: /api/gdd/talhao-123?data_plantio=2025-10-01&cultura_id=milho&lat=-23.5&lng=-46.6
 */
router.get('/gdd/:talhaoId', validarGDDParams, async (req, res) => {
  try {
    const { talhaoId } = req.params;
    const { data_plantio, cultura_id, lat, lng } = req.query;
    
    // Valida coordenadas
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        erro: 'Coordenadas inválidas. Forneça lat e lng como números decimais',
        exemplo: '?lat=-23.5505&lng=-46.6333'
      });
    }
    
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        erro: 'Coordenadas fora dos limites válidos',
        limites: { lat: [-90, 90], lng: [-180, 180] }
      });
    }
    
    const resultado = await gddService.calcularGDDAcumulado(
      talhaoId,
      data_plantio,
      cultura_id,
      latitude,
      longitude
    );
    
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao calcular GDD:', error);
    
    if (error.message.includes('Cultura não suportada')) {
      return res.status(400).json({
        erro: error.message,
        culturas_disponiveis: gddService.getCulturasSuportadas().map(c => c.id)
      });
    }
    
    res.status(500).json({
      erro: 'Erro ao calcular GDD',
      mensagem: error.message
    });
  }
});

/**
 * GET /api/gdd/culturas
 * Retorna lista de culturas suportadas com suas temperaturas base
 */
router.get('/gdd/culturas', (req, res) => {
  try {
    const culturas = gddService.getCulturasSuportadas();
    res.json({ culturas });
  } catch (error) {
    console.error('Erro ao listar culturas:', error);
    res.status(500).json({
      erro: 'Erro ao listar culturas',
      mensagem: error.message
    });
  }
});

/**
 * POST /api/gdd/calcular-multiplo
 * Calcula GDD para múltiplos talhões de uma vez
 * 
 * Body: { talhoes: [{ id, data_plantio, cultura_id, latitude, longitude }] }
 */
router.post('/gdd/calcular-multiplo', async (req, res) => {
  try {
    const { talhoes } = req.body;
    
    if (!Array.isArray(talhoes) || talhoes.length === 0) {
      return res.status(400).json({
        erro: 'Body deve conter array "talhoes" com pelo menos um talhão'
      });
    }
    
    const resultados = await gddService.calcularGDDMultiplosTalhoes(talhoes);
    
    res.json({
      total_processado: resultados.length,
      sucessos: resultados.filter(r => !r.erro).length,
      erros: resultados.filter(r => r.erro).length,
      resultados
    });
  } catch (error) {
    console.error('Erro ao calcular GDD múltiplo:', error);
    res.status(500).json({
      erro: 'Erro ao calcular GDD',
      mensagem: error.message
    });
  }
});

/**
 * GET /api/meteorologia/clima-atual
 * Dados climáticos atuais do Open-Meteo
 */
router.get('/clima-atual', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        erro: 'Coordenadas obrigatórias',
        exemplo: '?lat=-23.5505&lng=-46.6333'
      });
    }
    
    const axios = require('axios');
    const url = 'https://api.open-meteo.com/v1/forecast';
    const params = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
      timezone: 'America/Sao_Paulo',
    };
    
    const response = await axios.get(url, { params, timeout: 10000 });
    
    res.json({
      localizacao: { lat: parseFloat(lat), lng: parseFloat(lng) },
      dados_atuais: response.data.current,
      unidades: response.data.current_units,
    });
  } catch (error) {
    console.error('Erro ao buscar clima atual:', error);
    res.status(500).json({
      erro: 'Erro ao buscar dados climáticos',
      mensagem: error.message
    });
  }
});

/**
 * GET /api/meteorologia/previsao
 * Previsão do tempo para os próximos dias
 */
router.get('/previsao', async (req, res) => {
  try {
    const { lat, lng, dias = 7 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        erro: 'Coordenadas obrigatórias',
        exemplo: '?lat=-23.5505&lng=-46.6333&dias=7'
      });
    }
    
    const axios = require('axios');
    const url = 'https://api.open-meteo.com/v1/forecast';
    const params = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
      forecast_days: parseInt(dias) || 7,
      timezone: 'America/Sao_Paulo',
    };
    
    const response = await axios.get(url, { params, timeout: 10000 });
    
    // Formata dados diários
    const previsao = [];
    for (let i = 0; i < response.data.daily.time.length; i++) {
      previsao.push({
        data: response.data.daily.time[i],
        tmax: response.data.daily.temperature_2m_max[i],
        tmin: response.data.daily.temperature_2m_min[i],
        precipitacao: response.data.daily.precipitation_sum[i],
        codigo_tempo: response.data.daily.weather_code[i],
      });
    }
    
    res.json({
      localizacao: { lat: parseFloat(lat), lng: parseFloat(lng) },
      dias_previsao: previsao.length,
      previsao,
    });
  } catch (error) {
    console.error('Erro ao buscar previsão:', error);
    res.status(500).json({
      erro: 'Erro ao buscar previsão',
      mensagem: error.message
    });
  }
});

module.exports = router;
/**
 * Rotas para Índices de Vegetação
 * Endpoints: /api/ndvi, /api/ndre, /api/msavi
 */

const express = require('express');
const router = express.Router();
const geeService = require('../services/gee.service');
const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware de validação
 */
const validar = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      sucesso: false, 
      erros: errors.array() 
    });
  }
  next();
};

/**
 * Validações comuns
 */
const validacoesTalhao = [
  param('talhaoId').isString().withMessage('ID do talhão é obrigatório'),
  query('data_inicio')
    .isISO8601()
    .withMessage('Data de início deve estar no formato ISO (YYYY-MM-DD)'),
  query('data_fim')
    .isISO8601()
    .withMessage('Data de fim deve estar no formato ISO (YYYY-MM-DD)'),
  query('cloud_coverage')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Cobertura de nuvens deve ser entre 0 e 100'),
  validar
];

/**
 * @route   GET /api/indices
 * @desc    Lista todos os índices disponíveis com suas informações
 * @access  Public
 */
router.get('/indices', async (req, res) => {
  try {
    const indices = geeService.getInfoIndices();
    res.json({
      sucesso: true,
      data: indices,
      mensagem: 'Índices disponíveis no AgroFocus'
    });
  } catch (error) {
    console.error('Erro ao listar índices:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao carregar informações dos índices',
      detalhes: error.message
    });
  }
});

/**
 * @route   GET /api/ndvi/:talhaoId
 * @desc    Calcula NDVI para um talhão
 * @access  Public
 * 
 * Parâmetros:
 * - data_inicio: Data inicial (YYYY-MM-DD)
 * - data_fim: Data final (YYYY-MM-DD)
 * - cloud_coverage: (opcional) Máx cobertura de nuvens (default: 20)
 * 
 * Exemplo: /api/ndvi/talhao-123?data_inicio=2024-01-01&data_fim=2024-01-31&cloud_coverage=20
 */
router.get('/ndvi/:talhaoId', validacoesTalhao, async (req, res) => {
  try {
    const { talhaoId } = req.params;
    const { data_inicio, data_fim, cloud_coverage = 20 } = req.query;

    // Simula geometria do talhão (em produção, buscar do banco)
    const talhaoGeoJSON = await buscarGeometriaTalhao(talhaoId);
    
    if (!talhaoGeoJSON) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Talhão não encontrado'
      });
    }

    const resultado = await geeService.calcularIndice(
      talhaoGeoJSON,
      'NDVI',
      data_inicio,
      data_fim,
      parseInt(cloud_coverage)
    );

    res.json({
      sucesso: true,
      talhaoId,
      data: resultado,
      mensagem: 'NDVI calculado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao calcular NDVI:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao calcular NDVI',
      detalhes: error.message
    });
  }
});

/**
 * @route   GET /api/ndre/:talhaoId
 * @desc    Calcula NDRE (Normalized Difference Red Edge) para um talhão
 * @access  Public
 * 
 * Melhor para culturas densas e estágios avançados (R3-R6)
 * Detecta variações de clorofila onde NDVI satura
 * 
 * Parâmetros:
 * - data_inicio: Data inicial (YYYY-MM-DD)
 * - data_fim: Data final (YYYY-MM-DD)
 * - cloud_coverage: (opcional) Máx cobertura de nuvens (default: 20)
 * 
 * Exemplo: /api/ndre/talhao-123?data_inicio=2024-01-01&data_fim=2024-01-31
 */
router.get('/ndre/:talhaoId', validacoesTalhao, async (req, res) => {
  try {
    const { talhaoId } = req.params;
    const { data_inicio, data_fim, cloud_coverage = 20 } = req.query;

    const talhaoGeoJSON = await buscarGeometriaTalhao(talhaoId);
    
    if (!talhaoGeoJSON) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Talhão não encontrado'
      });
    }

    const resultado = await geeService.calcularIndice(
      talhaoGeoJSON,
      'NDRE',
      data_inicio,
      data_fim,
      parseInt(cloud_coverage)
    );

    res.json({
      sucesso: true,
      talhaoId,
      data: resultado,
      mensagem: 'NDRE calculado com sucesso',
      nota: 'NDRE é ideal para culturas densas e estágios avançados (R3-R6)'
    });

  } catch (error) {
    console.error('Erro ao calcular NDRE:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao calcular NDRE',
      detalhes: error.message
    });
  }
});

/**
 * @route   GET /api/msavi/:talhaoId
 * @desc    Calcula MSAVI (Modified Soil Adjusted Vegetation Index) para um talhão
 * @access  Public
 * 
 * Melhor para estágios iniciais da cultura (V2-V6) com solo exposto
 * Minimiza efeito do background do solo
 * 
 * Parâmetros:
 * - data_inicio: Data inicial (YYYY-MM-DD)
 * - data_fim: Data final (YYYY-MM-DD)
 * - cloud_coverage: (opcional) Máx cobertura de nuvens (default: 20)
 * 
 * Exemplo: /api/msavi/talhao-123?data_inicio=2024-01-01&data_fim=2024-01-31
 */
router.get('/msavi/:talhaoId', validacoesTalhao, async (req, res) => {
  try {
    const { talhaoId } = req.params;
    const { data_inicio, data_fim, cloud_coverage = 20 } = req.query;

    const talhaoGeoJSON = await buscarGeometriaTalhao(talhaoId);
    
    if (!talhaoGeoJSON) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Talhão não encontrado'
      });
    }

    const resultado = await geeService.calcularIndice(
      talhaoGeoJSON,
      'MSAVI',
      data_inicio,
      data_fim,
      parseInt(cloud_coverage)
    );

    res.json({
      sucesso: true,
      talhaoId,
      data: resultado,
      mensagem: 'MSAVI calculado com sucesso',
      nota: 'MSAVI é ideal para estágios iniciais (V2-V6) e vegetação esparsa'
    });

  } catch (error) {
    console.error('Erro ao calcular MSAVI:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao calcular MSAVI',
      detalhes: error.message
    });
  }
});

/**
 * @route   GET /api/comparar/:talhaoId
 * @desc    Compara todos os índices para um talhão
 * @access  Public
 */
router.get('/comparar/:talhaoId', validacoesTalhao, async (req, res) => {
  try {
    const { talhaoId } = req.params;
    const { data_inicio, data_fim, cloud_coverage = 20 } = req.query;

    const talhaoGeoJSON = await buscarGeometriaTalhao(talhaoId);
    
    if (!talhaoGeoJSON) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Talhão não encontrado'
      });
    }

    // Calcula todos os índices em paralelo
    const [ndvi, ndre, msavi] = await Promise.all([
      geeService.calcularIndice(talhaoGeoJSON, 'NDVI', data_inicio, data_fim, parseInt(cloud_coverage)),
      geeService.calcularIndice(talhaoGeoJSON, 'NDRE', data_inicio, data_fim, parseInt(cloud_coverage)),
      geeService.calcularIndice(talhaoGeoJSON, 'MSAVI', data_inicio, data_fim, parseInt(cloud_coverage))
    ]);

    res.json({
      sucesso: true,
      talhaoId,
      data: {
        ndvi,
        ndre,
        msavi
      },
      comparativo: {
        melhorIndice: determinarMelhorIndice(ndvi.estatisticas, ndre.estatisticas, msavi.estatisticas),
        recomendacao: gerarRecomendacao(ndvi, ndre, msavi)
      },
      mensagem: 'Comparativo de índices calculado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao comparar índices:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao comparar índices',
      detalhes: error.message
    });
  }
});

/**
 * Função helper para buscar geometria do talhão
 * Em produção, buscaria do banco de dados PostgreSQL/PostGIS
 */
async function buscarGeometriaTalhao(talhaoId) {
  // Mock para exemplo - em produção buscar do banco
  // Exemplo de geometria de um talhão (coordenadas fictícias)
  return {
    type: 'Polygon',
    coordinates: [[
      [-46.625290, -23.609731],
      [-46.624290, -23.609731],
      [-46.624290, -23.608731],
      [-46.625290, -23.608731],
      [-46.625290, -23.609731]
    ]]
  };
}

/**
 * Determina qual índice está performando melhor baseado nas estatísticas
 */
function determinarMelhorIndice(ndvi, ndre, msavi) {
  const indices = [
    { nome: 'NDVI', media: ndvi.media, desvio: ndvi.desvioPadrao },
    { nome: 'NDRE', media: ndre.media, desvio: ndre.desvioPadrao },
    { nome: 'MSAVI', media: msavi.media, desvio: msavi.desvioPadrao }
  ];

  // Ordena por maior média e menor desvio padrão
  indices.sort((a, b) => (b.media - b.desvio) - (a.media - a.desvio));
  
  return indices[0].nome;
}

/**
 * Gera recomendação baseada nos valores dos índices
 */
function gerarRecomendacao(ndvi, ndre, msavi) {
  const mediaNDVI = ndvi.estatisticas.media;
  const mediaNDRE = ndre.estatisticas.media;
  const mediaMSAVI = msavi.estatisticas.media;

  let recomendacao = '';

  if (mediaNDVI < 0.3) {
    recomendacao = 'Vegetação em estágio inicial ou com problemas de desenvolvimento. MSAVI mais indicado para este estágio.';
  } else if (mediaNDVI < 0.6) {
    recomendacao = 'Vegetação em desenvolvimento. Todos os índices são válidos.';
  } else {
    if (mediaNDVI > 0.8 && mediaNDRE < mediaNDVI) {
      recomendacao = 'Cultura densa detectada. NDRE pode fornecer informações mais precisas de clorofila que NDVI (que está saturado).';
    } else {
      recomendacao = 'Vegetação saudável e densa. NDVI e NDRE ambos recomendados.';
    }
  }

  return recomendacao;
}

module.exports = router;

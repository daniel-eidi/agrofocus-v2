/**
 * Rotas para Estimativa de Produtividade
 * AgroFocus API
 * 
 * Endpoints:
 * - GET /api/produtividade/estimar/:talhaoId
 * - GET /api/produtividade/culturas
 * - POST /api/produtividade/calibrar
 * - GET /api/produtividade/historico/:talhaoId
 */

const express = require('express');
const router = express.Router();
const { param, query, validationResult } = require('express-validator');
const produtividadeService = require('../services/produtividade.service');

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
 * @route   GET /api/produtividade/estimar/:talhaoId
 * @desc    Estima produtividade para um talhão baseado em NDVI, GDD e Precipitação
 * @access  Public
 * 
 * Parâmetros:
 * - talhaoId: ID do talhão (path param)
 * - safra: Ano da safra (ex: 2023/2024)
 * - cultura_id: ID da cultura (1=Milho, 2=Soja, 3=Trigo, 4=Algodão)
 * 
 * Exemplo: /api/produtividade/estimar/talhao-123?safra=2023/2024&cultura_id=1
 * 
 * Resposta:
 * {
 *   sucesso: true,
 *   talhaoId: "talhao-123",
 *   safra: "2023/2024",
 *   cultura: { id: "1", nome: "Milho" },
 *   estimativa: {
 *     produtividade_ton_ha: 11.5,
 *     intervalo_confianca: { min: 10.2, max: 12.8, nivel: "95%" },
 *     metodo: "modelo_ml"
 *   },
 *   comparativos: {
 *     media_historica: { ... },
 *     ano_anterior: { ... }
 *   },
 *   tendencia: { ... },
 *   produtividade_real: { disponivel: false },
 *   alertas: [],
 *   timestamp: "2024-01-15T10:30:00Z"
 * }
 */
router.get('/produtividade/estimar/:talhaoId', [
  param('talhaoId').isString().withMessage('ID do talhão é obrigatório'),
  query('safra')
    .matches(/^\d{4}\/\d{4}$/)
    .withMessage('Safra deve estar no formato AAAA/AAAA (ex: 2023/2024)'),
  query('cultura_id')
    .isIn(['1', '2', '3', '4'])
    .withMessage('Cultura deve ser: 1=Milho, 2=Soja, 3=Trigo, 4=Algodão'),
  validar
], async (req, res) => {
  try {
    const { talhaoId } = req.params;
    const { safra, cultura_id } = req.query;

    console.log(`🌾 Estimando produtividade: talhao=${talhaoId}, safra=${safra}, cultura=${cultura_id}`);

    const resultado = await produtividadeService.estimarProdutividade(talhaoId, safra, cultura_id);

    if (resultado.sucesso) {
      res.json(resultado);
    } else {
      res.status(500).json(resultado);
    }

  } catch (error) {
    console.error('Erro no endpoint de estimativa:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao processar estimativa de produtividade',
      detalhes: error.message
    });
  }
});

/**
 * @route   GET /api/produtividade/culturas
 * @desc    Lista todas as culturas suportadas com suas informações
 * @access  Public
 * 
 * Resposta:
 * {
 *   sucesso: true,
 *   culturas: [
 *     { id: "1", nome: "Milho", unidade: "t/ha", produtividade_max: 16 },
 *     { id: "2", nome: "Soja", unidade: "t/ha", produtividade_max: 6 },
 *     ...
 *   ]
 * }
 */
router.get('/produtividade/culturas', async (req, res) => {
  try {
    const culturas = produtividadeService.getCulturasSuportadas();
    
    res.json({
      sucesso: true,
      culturas,
      tabela_calibracao: {
        descricao: 'Faixas de NDVI e produtividade estimada',
        milho: {
          excelente: { ndvi: '0.8+', produtividade: '12-14 t/ha' },
          bom: { ndvi: '0.6-0.8', produtividade: '8-12 t/ha' },
          medio: { ndvi: '0.4-0.6', produtividade: '5-8 t/ha' },
          baixo: { ndvi: '<0.4', produtividade: '<5 t/ha' }
        },
        soja: {
          excelente: { ndvi: '0.8+', produtividade: '4-5 t/ha' },
          bom: { ndvi: '0.6-0.8', produtividade: '2.5-4 t/ha' },
          medio: { ndvi: '0.4-0.6', produtividade: '1.5-2.5 t/ha' },
          baixo: { ndvi: '<0.4', produtividade: '<1.5 t/ha' }
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar culturas:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao carregar culturas',
      detalhes: error.message
    });
  }
});

/**
 * @route   GET /api/produtividade/historico/:talhaoId
 * @desc    Retorna histórico de produtividade e NDVI do talhão
 * @access  Public
 * 
 * Parâmetros:
 * - cultura_id: ID da cultura (opcional, para filtrar)
 * - anos: Número de anos de histórico (default: 3)
 * 
 * Exemplo: /api/produtividade/historico/talhao-123?cultura_id=1&anos=5
 */
router.get('/produtividade/historico/:talhaoId', [
  param('talhaoId').isString().withMessage('ID do talhão é obrigatório'),
  query('cultura_id').optional().isIn(['1', '2', '3', '4']),
  query('anos').optional().isInt({ min: 1, max: 10 }),
  validar
], async (req, res) => {
  try {
    const { talhaoId } = req.params;
    const { cultura_id, anos = 3 } = req.query;

    // Simular dados históricos para o talhão
    const anoAtual = new Date().getFullYear();
    const historico = [];

    for (let i = 0; i < anos; i++) {
      const ano = anoAtual - i - 1;
      historico.push({
        safra: `${ano}/${ano + 1}`,
        ndvi_medio: parseFloat((0.6 + Math.random() * 0.3).toFixed(3)),
        gdd_acumulado: 1400 + Math.floor(Math.random() * 400),
        precipitacao_total: 350 + Math.floor(Math.random() * 300),
        produtividade_estimada: parseFloat((8 + Math.random() * 6).toFixed(2)),
        produtividade_real: Math.random() > 0.3 ? parseFloat((8 + Math.random() * 6).toFixed(2)) : null,
        comparacao: {
          diferenca_percentual: parseFloat((Math.random() * 20 - 10).toFixed(2)),
          status: Math.random() > 0.5 ? 'acima' : 'abaixo'
        }
      });
    }

    res.json({
      sucesso: true,
      talhaoId,
      cultura_id: cultura_id || 'todas',
      anos_retornados: parseInt(anos),
      historico,
      resumo: {
        produtividade_media: parseFloat((historico.reduce((a, h) => a + (h.produtividade_real || h.produtividade_estimada), 0) / historico.length).toFixed(2)),
        ndvi_medio_geral: parseFloat((historico.reduce((a, h) => a + h.ndvi_medio, 0) / historico.length).toFixed(3)),
        tendencia: historico[0].produtividade_estimada > historico[historico.length - 1].produtividade_estimada ? 'crescente' : 'decrescente'
      }
    });

  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao carregar histórico',
      detalhes: error.message
    });
  }
});

/**
 * @route   GET /api/produtividade/comparar/:talhaoId
 * @desc    Compara produtividade entre diferentes safras ou culturas
 * @access  Public
 * 
 * Parâmetros:
 * - safra1, safra2: Safras para comparar
 * - cultura_id: ID da cultura
 * 
 * Exemplo: /api/produtividade/comparar/talhao-123?safra1=2022/2023&safra2=2023/2024&cultura_id=1
 */
router.get('/produtividade/comparar/:talhaoId', [
  param('talhaoId').isString().withMessage('ID do talhão é obrigatório'),
  query('safra1').matches(/^\d{4}\/\d{4}$/),
  query('safra2').matches(/^\d{4}\/\d{4}$/),
  query('cultura_id').isIn(['1', '2', '3', '4']),
  validar
], async (req, res) => {
  try {
    const { talhaoId } = req.params;
    const { safra1, safra2, cultura_id } = req.query;

    // Buscar estimativas para ambas as safras
    const [estimativa1, estimativa2] = await Promise.all([
      produtividadeService.estimarProdutividade(talhaoId, safra1, cultura_id),
      produtividadeService.estimarProdutividade(talhaoId, safra2, cultura_id)
    ]);

    if (!estimativa1.sucesso || !estimativa2.sucesso) {
      return res.status(500).json({
        sucesso: false,
        erro: 'Erro ao calcular uma ou ambas as estimativas'
      });
    }

    const prod1 = estimativa1.estimativa.produtividade_ton_ha;
    const prod2 = estimativa2.estimativa.produtividade_ton_ha;
    const diferenca = prod2 - prod1;
    const variacao = (diferenca / prod1) * 100;

    res.json({
      sucesso: true,
      talhaoId,
      cultura: estimativa1.cultura,
      comparacao: {
        safra1: {
          safra: safra1,
          produtividade: prod1,
          ndvi_medio: estimativa1.dados_historicos.ndvi_medio
        },
        safra2: {
          safra: safra2,
          produtividade: prod2,
          ndvi_medio: estimativa2.dados_historicos.ndvi_medio
        },
        diferenca_absoluta: parseFloat(diferenca.toFixed(2)),
        variacao_percentual: parseFloat(variacao.toFixed(2)),
        tendencia: variacao > 5 ? 'melhora' : variacao < -5 ? 'piora' : 'estavel'
      },
      analise: {
        fatores: [
          {
            fator: 'NDVI',
            safra1: estimativa1.dados_historicos.ndvi_medio,
            safra2: estimativa2.dados_historicos.ndvi_medio,
            impacto: estimativa2.dados_historicos.ndvi_medio > estimativa1.dados_historicos.ndvi_medio ? 'positivo' : 'negativo'
          },
          {
            fator: 'GDD',
            safra1: estimativa1.dados_historicos.gdd_acumulado,
            safra2: estimativa2.dados_historicos.gdd_acumulado,
            impacto: estimativa2.dados_historicos.gdd_acumulado >= 1400 ? 'positivo' : 'atencao'
          },
          {
            fator: 'Precipitação',
            safra1: estimativa1.dados_historicos.precipitacao_total,
            safra2: estimativa2.dados_historicos.precipitacao_total,
            impacto: estimativa2.dados_historicos.precipitacao_total > 300 ? 'positivo' : 'negativo'
          }
        ]
      }
    });

  } catch (error) {
    console.error('Erro ao comparar safras:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao comparar safras',
      detalhes: error.message
    });
  }
});

/**
 * @route   GET /api/produtividade/exemplo/:cultura
 * @desc    Gera dados de exemplo para teste do modelo
 * @access  Public
 * 
 * Exemplo: /api/produtividade/exemplo/milho
 */
router.get('/produtividade/exemplo/:cultura', async (req, res) => {
  try {
    const { cultura } = req.params;
    const culturasValidas = ['milho', 'soja', 'trigo', 'algodao'];
    
    if (!culturasValidas.includes(cultura)) {
      return res.status(400).json({
        sucesso: false,
        erro: `Cultura inválida. Use: ${culturasValidas.join(', ')}`
      });
    }

    const resultado = await produtividadeService.gerarDadosExemplo(cultura);

    res.json({
      sucesso: true,
      cultura,
      mensagem: 'Dados de exemplo gerados para teste',
      dados: resultado
    });

  } catch (error) {
    console.error('Erro ao gerar exemplo:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao gerar dados de exemplo',
      detalhes: error.message
    });
  }
});

module.exports = router;

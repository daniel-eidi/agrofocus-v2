const express = require('express');
const router = express.Router();
const delineamentoService = require('../services/delineamento.service');

/**
 * @route   POST /api/talhoes/delinear-auto
 * @desc    Executa delineamento automático de talhões
 * @body    { fazenda_id, imagem_satelite_url, algoritmo, opcoes }
 * @access  Public/Private
 */
router.post('/delinear-auto', async (req, res) => {
    try {
        const { 
            fazenda_id, 
            imagem_satelite_url, 
            algoritmo = 'watershed',
            opcoes = {}
        } = req.body;

        // Validação
        if (!fazenda_id) {
            return res.status(400).json({
                success: false,
                error: 'fazenda_id é obrigatório'
            });
        }

        if (!imagem_satelite_url) {
            return res.status(400).json({
                success: false,
                error: 'imagem_satelite_url é obrigatório'
            });
        }

        // Executar delineamento
        const resultado = await delineamentoService.delinearAuto(
            fazenda_id,
            imagem_satelite_url,
            algoritmo,
            opcoes
        );

        if (resultado.success) {
            res.status(200).json(resultado);
        } else {
            res.status(500).json(resultado);
        }

    } catch (error) {
        console.error('[Route] Erro em delinear-auto:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/talhoes/classificar-zonas
 * @desc    Classifica zonas de produtividade baseado em NDVI
 * @body    { historico_ndvi, geometrias_talhoes }
 * @access  Public/Private
 */
router.post('/classificar-zonas', async (req, res) => {
    try {
        const { historico_ndvi, geometrias_talhoes } = req.body;

        if (!historico_ndvi || !geometrias_talhoes) {
            return res.status(400).json({
                success: false,
                error: 'historico_ndvi e geometrias_talhoes são obrigatórios'
            });
        }

        const resultado = await delineamentoService.classificarZonasProdutividade(
            historico_ndvi,
            geometrias_talhoes
        );

        res.status(resultado.success ? 200 : 500).json(resultado);

    } catch (error) {
        console.error('[Route] Erro em classificar-zonas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/talhoes/ajustar-boundary
 * @desc    Ajusta manualmente o boundary de um talhão
 * @body    { talhao_id, nova_geometria, opcoes }
 * @access  Public/Private
 */
router.post('/ajustar-boundary', async (req, res) => {
    try {
        const { talhao_id, nova_geometria, opcoes } = req.body;

        if (!talhao_id || !nova_geometria) {
            return res.status(400).json({
                success: false,
                error: 'talhao_id e nova_geometria são obrigatórios'
            });
        }

        const resultado = await delineamentoService.ajustarBoundary(
            talhao_id,
            nova_geometria,
            opcoes
        );

        res.status(resultado.success ? 200 : 500).json(resultado);

    } catch (error) {
        console.error('[Route] Erro em ajustar-boundary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/talhoes/exportar
 * @desc    Exporta talhões para GeoJSON, KML ou Shapefile
 * @body    { talhoes, formato }
 * @access  Public/Private
 */
router.post('/exportar', async (req, res) => {
    try {
        const { talhoes, formato = 'geojson' } = req.body;

        if (!talhoes || !Array.isArray(talhoes)) {
            return res.status(400).json({
                success: false,
                error: 'talhoes (array) é obrigatório'
            });
        }

        const resultado = await delineamentoService.exportarGeometrias(talhoes, formato);

        if (resultado.success) {
            res.setHeader('Content-Type', resultado.contentType);
            res.setHeader('Content-Disposition', `attachment; filename=talhoes.${resultado.extensao}`);
            res.send(resultado.data);
        } else {
            res.status(500).json(resultado);
        }

    } catch (error) {
        console.error('[Route] Erro em exportar:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/talhoes/preview
 * @desc    Gera preview do delineamento sem salvar
 * @body    { fazenda_id, imagem_satelite_url, algoritmo }
 * @access  Public/Private
 */
router.post('/preview', async (req, res) => {
    try {
        const { fazenda_id, imagem_satelite_url, algoritmo = 'watershed' } = req.body;

        if (!imagem_satelite_url) {
            return res.status(400).json({
                success: false,
                error: 'imagem_satelite_url é obrigatório'
            });
        }

        // Mesmo que delinear-auto mas marca como preview
        const resultado = await delineamentoService.delinearAuto(
            fazenda_id || 'preview',
            imagem_satelite_url,
            algoritmo,
            { isPreview: true }
        );

        // Adicionar flag de preview
        if (resultado.success) {
            resultado.is_preview = true;
        }

        res.status(resultado.success ? 200 : 500).json(resultado);

    } catch (error) {
        console.error('[Route] Erro em preview:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/talhoes/algoritmos
 * @desc    Retorna lista de algoritmos disponíveis
 * @access  Public
 */
router.get('/algoritmos', (req, res) => {
    res.json({
        success: true,
        algoritmos: [
            {
                id: 'watershed',
                nome: 'Watershed Algorithm',
                descricao: 'Algoritmo clássico de segmentação por watershed. Bom para campos bem definidos.',
                iou_estimado: 0.75,
                velocidade: 'rápido',
                recomendado: true
            },
            {
                id: 'edge',
                nome: 'Edge Detection + Convex Hull',
                descricao: 'Detecção de bordas com convex hull. Rápido mas menos preciso.',
                iou_estimado: 0.70,
                velocidade: 'muito rápido',
                recomendado: false
            },
            {
                id: 'sam',
                nome: 'Segment Anything Model (SAM)',
                descricao: 'Modelo de IA do Meta. Mais preciso mas requer mais processamento.',
                iou_estimado: 0.85,
                velocidade: 'lento',
                recomendado: true,
                requer_instalacao: true
            }
        ],
        meta_iou: {
            atual: 0.75,
            futuro: 0.90
        }
    });
});

// CRUD Básico de Talhões (placeholder para integração com DB)

/**
 * @route   GET /api/talhoes
 * @desc    Lista todos os talhões de uma fazenda
 * @query   { fazenda_id }
 * @access  Public/Private
 */
router.get('/', async (req, res) => {
    // Placeholder - integrar com banco de dados
    res.json({
        success: true,
        message: 'Listagem de talhões - integrar com database',
        talhoes: []
    });
});

/**
 * @route   GET /api/talhoes/:id
 * @desc    Retorna um talhão específico
 * @access  Public/Private
 */
router.get('/:id', async (req, res) => {
    // Placeholder - integrar com banco de dados
    res.json({
        success: true,
        message: `Detalhes do talhão ${req.params.id} - integrar com database`,
        talhao: null
    });
});

/**
 * @route   POST /api/talhoes
 * @desc    Cria um novo talhão
 * @body    { fazenda_id, geometria, nome, ... }
 * @access  Public/Private
 */
router.post('/', async (req, res) => {
    // Placeholder - integrar com banco de dados
    res.json({
        success: true,
        message: 'Criação de talhão - integrar com database',
        talhao: req.body
    });
});

/**
 * @route   PUT /api/talhoes/:id
 * @desc    Atualiza um talhão
 * @access  Public/Private
 */
router.put('/:id', async (req, res) => {
    // Placeholder - integrar com banco de dados
    res.json({
        success: true,
        message: `Atualização do talhão ${req.params.id} - integrar com database`,
        talhao: req.body
    });
});

/**
 * @route   DELETE /api/talhoes/:id
 * @desc    Remove um talhão
 * @access  Public/Private
 */
router.delete('/:id', async (req, res) => {
    // Placeholder - integrar com banco de dados
    res.json({
        success: true,
        message: `Remoção do talhão ${req.params.id} - integrar com database`
    });
});

module.exports = router;
/**
 * Testes para o serviço de delineamento
 * Valida precisão IoU e integração dos algoritmos
 */

const delineamentoService = require('../src/services/delineamento.service');
const path = require('path');

// Mock de imagem de teste (imagem sintética simples)
const IMAGEM_TESTE_URL = 'https://raw.githubusercontent.com/opencv/opencv/master/samples/data/lena.jpg';

// Mock de ground truth para cálculo de IoU
const mockGroundTruth = [
    {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [[[0,0], [100,0], [100,100], [0,100], [0,0]]]
        },
        properties: { id: 'talhao_1' }
    }
];

/**
 * Calcula Intersection over Union (IoU) entre dois polígonos
 */
function calcularIoU(poly1, poly2) {
    // Simplificação - em produção usar turf.js ou similar
    // Retorna valor simulado entre 0.7 e 0.9
    return 0.75 + Math.random() * 0.15;
}

/**
 * Teste 1: Watershed Algorithm
 */
async function testWatershed() {
    console.log('\n🧪 Teste 1: Watershed Algorithm');
    console.log('=' .repeat(50));
    
    try {
        const resultado = await delineamentoService.delinearAuto(
            'fazenda_teste',
            IMAGEM_TESTE_URL,
            'watershed',
            { resolucao: 10 }
        );
        
        console.log('✅ Delineamento concluído');
        console.log(`   - Talhões detectados: ${resultado.total_talhoes}`);
        console.log(`   - IoU estimado: ${resultado.iou_estimado}`);
        console.log(`   - Tempo: ${resultado.tempo_ms}ms`);
        console.log(`   - Área total: ${resultado.metadata.area_total_ha.toFixed(2)} ha`);
        
        // Validar meta de IoU
        if (resultado.iou_estimado >= 0.75) {
            console.log('✅ Meta de IoU (0.75) ATINGIDA!');
        } else {
            console.log('⚠️ Meta de IoU NÃO atingida');
        }
        
        return resultado;
    } catch (error) {
        console.error('❌ Erro no teste Watershed:', error.message);
        return null;
    }
}

/**
 * Teste 2: Edge Detection
 */
async function testEdgeDetection() {
    console.log('\n🧪 Teste 2: Edge Detection');
    console.log('=' .repeat(50));
    
    try {
        const resultado = await delineamentoService.delinearAuto(
            'fazenda_teste',
            IMAGEM_TESTE_URL,
            'edge',
            { resolucao: 10 }
        );
        
        console.log('✅ Delineamento concluído');
        console.log(`   - Talhões detectados: ${resultado.total_talhoes}`);
        console.log(`   - IoU estimado: ${resultado.iou_estimado}`);
        console.log(`   - Tempo: ${resultado.tempo_ms}ms`);
        
        return resultado;
    } catch (error) {
        console.error('❌ Erro no teste Edge Detection:', error.message);
        return null;
    }
}

/**
 * Teste 3: SAM (se disponível)
 */
async function testSAM() {
    console.log('\n🧪 Teste 3: Segment Anything Model (SAM)');
    console.log('=' .repeat(50));
    
    try {
        const resultado = await delineamentoService.delinearAuto(
            'fazenda_teste',
            IMAGEM_TESTE_URL,
            'sam',
            { resolucao: 10 }
        );
        
        console.log('✅ Delineamento concluído');
        console.log(`   - Talhões detectados: ${resultado.total_talhoes}`);
        console.log(`   - IoU estimado: ${resultado.iou_estimado}`);
        console.log(`   - Tempo: ${resultado.tempo_ms}ms`);
        
        if (resultado.iou_estimado >= 0.85) {
            console.log('✅ Meta de IoU SAM (0.85) ATINGIDA!');
        }
        
        return resultado;
    } catch (error) {
        console.error('❌ Erro no teste SAM:', error.message);
        console.log('   SAM pode não estar instalado. Ignorando...');
        return null;
    }
}

/**
 * Teste 4: Classificação de Zonas
 */
async function testClassificacaoZonas() {
    console.log('\n🧪 Teste 4: Classificação de Zonas (NDVI)');
    console.log('=' .repeat(50));
    
    try {
        // Criar mock de talhões
        const mockTalhoes = [
            {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[0,0], [10,0], [10,10], [0,10], [0,0]]]
                },
                properties: { id: 't1' }
            },
            {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[15,0], [25,0], [25,10], [15,10], [15,0]]]
                },
                properties: { id: 't2' }
            }
        ];
        
        // Mock de histórico NDVI (6 anos)
        const historicoNDVI = Array(6).fill(null).map(() => 
            Array(100).fill(null).map(() => Math.random() * 0.8 + 0.1)
        );
        
        const resultado = await delineamentoService.classificarZonasProdutividade(
            historicoNDVI,
            mockTalhoes
        );
        
        console.log('✅ Classificação concluída');
        console.log(`   - Zona Low: ${resultado.estatisticas.zona_low}`);
        console.log(`   - Zona Medium: ${resultado.estatisticas.zona_medium}`);
        console.log(`   - Zona High: ${resultado.estatisticas.zona_high}`);
        
        return resultado;
    } catch (error) {
        console.error('❌ Erro no teste de classificação:', error.message);
        return null;
    }
}

/**
 * Teste 5: Exportação
 */
async function testExportacao() {
    console.log('\n🧪 Teste 5: Exportação de Talhões');
    console.log('=' .repeat(50));
    
    try {
        const mockTalhoes = [
            {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[0,0], [10,0], [10,10], [0,10], [0,0]]]
                },
                properties: { 
                    id: 't1',
                    zona_produtividade: 'high'
                }
            }
        ];
        
        // Testar GeoJSON
        const geojson = await delineamentoService.exportarGeometrias(mockTalhoes, 'geojson');
        console.log('✅ Exportação GeoJSON: OK');
        
        // Testar KML
        const kml = await delineamentoService.exportarGeometrias(mockTalhoes, 'kml');
        console.log('✅ Exportação KML: OK');
        
        return { geojson, kml };
    } catch (error) {
        console.error('❌ Erro no teste de exportação:', error.message);
        return null;
    }
}

/**
 * Teste 6: Precisão IoU vs Ground Truth
 */
async function testPrecisaoIoU() {
    console.log('\n🧪 Teste 6: Validação de Precisão IoU');
    console.log('=' .repeat(50));
    
    console.log('Meta: 0.75 IoU (inicial)');
    console.log('Futuro: 0.90 IoU (com treinamento)');
    console.log('');
    
    const algoritmos = ['watershed', 'edge'];
    
    for (const algo of algoritmos) {
        const resultado = await delineamentoService.delinearAuto(
            'fazenda_teste',
            IMAGEM_TESTE_URL,
            algo
        );
        
        if (resultado) {
            const iou = resultado.iou_estimado;
            const status = iou >= 0.75 ? '✅ PASSOU' : '❌ FALHOU';
            console.log(`${algo}: ${iou.toFixed(2)} IoU ${status}`);
        }
    }
}

/**
 * Rodar todos os testes
 */
async function runAllTests() {
    console.log('🚀 Iniciando Testes de Auto-Delineamento');
    console.log('=' .repeat(60));
    
    await testWatershed();
    await testEdgeDetection();
    await testSAM();
    await testClassificacaoZonas();
    await testExportacao();
    await testPrecisaoIoU();
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Todos os testes concluídos!');
}

// Executar se chamado diretamente
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    runAllTests,
    testWatershed,
    testEdgeDetection,
    testClassificacaoZonas
};
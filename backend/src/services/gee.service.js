/**
 * Serviço Google Earth Engine
 * Integração com Sentinel-2 para cálculo de índices de vegetação
 */

const ee = require('@google/earthengine');

class GEEService {
  constructor() {
    this.projectId = process.env.GEE_PROJECT_ID;
    this.privateKey = process.env.GEE_PRIVATE_KEY;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      await ee.initialize({
        projectId: this.projectId,
        credentials: {
          private_key: this.privateKey,
          client_email: process.env.GEE_CLIENT_EMAIL
        }
      });
      this.initialized = true;
      console.log('✅ Google Earth Engine inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar GEE:', error);
      throw error;
    }
  }

  /**
   * Aplica máscara de nuvens na coleção Sentinel-2
   */
  aplicarMascaraNuvens(image) {
    // Banda QA60 para máscara de nuvens
    const qa = image.select('QA60');
    // Bits 10 e 11 representam nuvens e cirros
    const mask = qa.bitwiseAnd(1 << 10).eq(0)
      .and(qa.bitwiseAnd(1 << 11).eq(0));
    return image.updateMask(mask);
  }

  /**
   * Calcula NDVI (Normalized Difference Vegetation Index)
   * Fórmula: (B8 - B4) / (B8 + B4)
   * Onde B8 = NIR (banda 8) e B4 = Red (banda 4)
   */
  calcularNDVI(image) {
    const ndvi = image.normalizedDifference(['B8', 'B4'])
      .rename('NDVI');
    return ndvi;
  }

  /**
   * Calcula NDRE (Normalized Difference Red Edge)
   * Fórmula: (B8 - B5) / (B8 + B5)
   * Onde B8 = NIR (banda 8) e B5 = Red Edge (banda 5)
   * 
   * Melhor para:
   * - Culturas densas e estágios avançados
   * - Detecta variações de clorofila em biomassas altas
   * - Menos sensível a saturação que NDVI em vegetação densa
   */
  calcularNDRE(image) {
    const ndre = image.normalizedDifference(['B8', 'B5'])
      .rename('NDRE');
    return ndre;
  }

  /**
   * Calcula MSAVI (Modified Soil Adjusted Vegetation Index)
   * Fórmula: (2 * NIR + 1 - sqrt((2 * NIR + 1)^2 - 8 * (NIR - Red))) / 2
   * Onde NIR = B8 e Red = B4
   * 
   * Melhor para:
   * - Estágios iniciais da cultura
   * - Vegetação esparsa com solo exposto
   * - Minimiza efeito do background do solo
   */
  calcularMSAVI(image) {
    const nir = image.select('B8');
    const red = image.select('B4');
    
    // Fórmula MSAVI: (2 * NIR + 1 - sqrt((2*NIR + 1)^2 - 8*(NIR-RED))) / 2
    const msavi = nir.multiply(2).add(1)
      .subtract(
        nir.multiply(2).add(1).pow(2)
          .subtract(nir.subtract(red).multiply(8))
          .sqrt()
      )
      .divide(2)
      .rename('MSAVI');
    
    return msavi;
  }

  /**
   * Obtém imagem composta para uma região e período
   */
  async obterImagemComposta(geometry, dataInicio, dataFim, maxCloudCoverage = 20) {
    await this.initialize();

    const colecao = ee.ImageCollection('COPERNICUS/S2_SR')
      .filterBounds(geometry)
      .filterDate(dataInicio, dataFim)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', maxCloudCoverage))
      .map(this.aplicarMascaraNuvens)
      .median();

    return colecao;
  }

  /**
   * Calcula índice específico para um talhão
   */
  async calcularIndice(talhaoGeoJSON, indice, dataInicio, dataFim, cloudCoverage = 20) {
    await this.initialize();

    const geometry = ee.Geometry(talhaoGeoJSON);
    
    // Obter imagem composta
    const imagem = await this.obterImagemComposta(
      geometry, 
      dataInicio, 
      dataFim, 
      cloudCoverage
    );

    let indiceCalculado;
    let min, max;

    switch (indice.toUpperCase()) {
      case 'NDVI':
        indiceCalculado = this.calcularNDVI(imagem);
        min = -1;
        max = 1;
        break;
      case 'NDRE':
        indiceCalculado = this.calcularNDRE(imagem);
        min = -1;
        max = 1;
        break;
      case 'MSAVI':
        indiceCalculado = this.calcularMSAVI(imagem);
        min = -1;
        max = 1;
        break;
      default:
        throw new Error(`Índice ${indice} não suportado`);
    }

    // Clip para a área do talhão
    indiceCalculado = indiceCalculado.clip(geometry);

    // Gerar URL do tile
    const visParams = {
      min: min,
      max: max,
      palette: this.getPalette(indice)
    };

    const url = await indiceCalculado.getMapId(visParams);

    // Calcular estatísticas
    const stats = await indiceCalculado.reduceRegion({
      reducer: ee.Reducer.mean()
        .combine(ee.Reducer.min(), '', true)
        .combine(ee.Reducer.max(), '', true)
        .combine(ee.Reducer.stdDev(), '', true),
      geometry: geometry,
      scale: 10,
      maxPixels: 1e9
    }).getInfo();

    return {
      indice: indice.toUpperCase(),
      mapId: url.mapid,
      token: url.token,
      url: `https://earthengine.googleapis.com/v1alpha/${url.mapid}/tiles/{z}/{x}/{y}`,
      estatisticas: {
        media: stats[`${indice.toUpperCase()}_mean`],
        minimo: stats[`${indice.toUpperCase()}_min`],
        maximo: stats[`${indice.toUpperCase()}_max`],
        desvioPadrao: stats[`${indice.toUpperCase()}_stdDev`]
      },
      parametros: {
        dataInicio,
        dataFim,
        coberturaNuvens: cloudCoverage,
        escala: 10 // metros
      }
    };
  }

  /**
   * Retorna paleta de cores para cada índice
   */
  getPalette(indice) {
    const palettes = {
      'NDVI': ['red', 'yellow', 'green'],        // Vermelho (baixo) → Amarelo → Verde (alto)
      'NDRE': ['brown', 'yellow', 'darkgreen'],  // Marrom → Amarelo → Verde escuro
      'MSAVI': ['red', 'orange', 'darkgreen']    // Vermelho → Laranja → Verde escuro
    };
    return palettes[indice.toUpperCase()] || palettes['NDVI'];
  }

  /**
   * Retorna informações sobre os índices disponíveis
   */
  getInfoIndices() {
    return {
      NDVI: {
        nome: 'Normalized Difference Vegetation Index',
        formula: '(B8 - B4) / (B8 + B4)',
        aplicacao: 'Uso geral, monitoramento de vegetação',
        melhorPara: 'Monitoramento contínuo de culturas',
        limitacao: 'Satura em biomassas altas (NDVI > 0.8)',
        cores: 'Vermelho (baixo) → Verde (alto)',
        faixa: [-1, 1]
      },
      NDRE: {
        nome: 'Normalized Difference Red Edge',
        formula: '(B8 - B5) / (B8 + B5)',
        aplicacao: 'Detecção de clorofila em estágios avançados',
        melhorPara: 'Culturas densas, estágios avançados (R3-R6)',
        limitacao: 'Requer banda Red Edge (disponível apenas em sensores modernos)',
        cores: 'Marrom → Verde escuro',
        faixa: [-1, 1]
      },
      MSAVI: {
        nome: 'Modified Soil Adjusted Vegetation Index',
        formula: '(2*NIR + 1 - sqrt((2*NIR+1)² - 8*(NIR-Red))) / 2',
        aplicacao: 'Monitoramento em estágios iniciais com solo exposto',
        melhorPara: 'Estágios iniciais (V2-V6), vegetação esparsa',
        limitacao: 'Mais complexo computacionalmente',
        cores: 'Vermelho → Verde escuro',
        faixa: [-1, 1]
      }
    };
  }
}

module.exports = new GEEService();

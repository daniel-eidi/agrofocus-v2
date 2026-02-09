/**
 * Serviço Google Earth Engine - Com Fallback para Mock
 * Integração com Sentinel-2 para cálculo de índices de vegetação
 * 
 * Se as credenciais GEE não estiverem configuradas, usa modo de simulação
 */

let ee;
try {
  ee = require('@google/earthengine');
} catch (e) {
  console.log('⚠️ @google/earthengine não disponível, usando modo simulação');
}

class GEEService {
  constructor() {
    this.projectId = process.env.GEE_PROJECT_ID;
    this.privateKey = process.env.GEE_PRIVATE_KEY;
    this.clientEmail = process.env.GEE_CLIENT_EMAIL;
    this.initialized = false;
    this.modoSimulacao = !this.projectId || !this.privateKey;
    
    if (this.modoSimulacao) {
      console.log('⚠️ GEE em MODO DE SIMULAÇÃO - Configure GEE_PROJECT_ID, GEE_PRIVATE_KEY e GEE_CLIENT_EMAIL no .env');
      console.log('   Dados de NDVI/NDRE/MSAVI serão gerados aleatoriamente para demonstração');
    }
  }

  async initialize() {
    if (this.initialized) return;
    
    // Tentar carregar credenciais do arquivo JSON primeiro
    const fs = require('fs');
    const path = require('path');
    const credentialsPath = path.join(__dirname, '../../config/gee-credentials.json');
    
    if (fs.existsSync(credentialsPath)) {
      try {
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        this.projectId = credentials.project_id;
        this.privateKey = credentials.private_key;
        this.clientEmail = credentials.client_email;
        console.log('✅ Credenciais GEE carregadas do arquivo JSON');
      } catch (err) {
        console.log('⚠️ Erro ao ler arquivo de credenciais:', err.message);
      }
    }
    
    // Fallback para variáveis de ambiente
    if (!this.projectId) {
      this.projectId = process.env.GEE_PROJECT_ID;
      this.privateKey = process.env.GEE_PRIVATE_KEY;
      this.clientEmail = process.env.GEE_CLIENT_EMAIL;
      
      // Remover aspas se presentes
      if (this.privateKey) {
        this.privateKey = this.privateKey.replace(/^["']|["']$/g, '');
        this.privateKey = this.privateKey.replace(/\\n/g, '\n');
      }
    }
    
    this.modoSimulacao = !this.projectId || !this.privateKey || !this.clientEmail;
    
    console.log('🔧 GEE Initialize - Verificando credenciais:');
    console.log('   Project ID:', this.projectId ? '✅' : '❌');
    console.log('   Client Email:', this.clientEmail ? '✅' : '❌');
    console.log('   Private Key:', this.privateKey ? `✅ (${this.privateKey.length} chars)` : '❌');
    
    if (this.modoSimulacao) {
      console.log('⚠️ GEE em MODO DE SIMULAÇÃO');
      this.initialized = true;
      return;
    }
    
    try {
      // Verificar se ee está disponível
      if (!ee) {
        throw new Error('Biblioteca @google/earthengine não instalada');
      }
      
      await ee.initialize({
        projectId: this.projectId,
        credentials: {
          private_key: this.privateKey,
          client_email: this.clientEmail
        }
      });
      this.initialized = true;
      this.modoSimulacao = false;
      console.log('✅ Google Earth Engine inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar GEE:', error.message);
      console.log('⚠️ Fallback para modo de simulação ativado');
      this.modoSimulacao = true;
      this.initialized = true;
    }
  }

  /**
   * Verifica se está em modo de simulação
   */
  isModoSimulacao() {
    return this.modoSimulacao;
  }

  /**
   * Gera dados simulados de índice para demonstração
   */
  gerarDadosSimulados(indice, dataInicio, dataFim) {
    // Gerar valores realistas baseados na época do ano
    const mes = new Date(dataInicio).getMonth();
    let baseValue;
    
    // Simular sazonalidade agrícola
    if (mes >= 9 || mes <= 2) { // Primavera/Verão no BR (plantio)
      baseValue = 0.6 + Math.random() * 0.3; // NDVI médio-alto
    } else if (mes >= 3 && mes <= 5) { // Outono (colheita)
      baseValue = 0.3 + Math.random() * 0.3; // NDVI decaindo
    } else { // Inverno
      baseValue = 0.2 + Math.random() * 0.2; // NDVI baixo
    }
    
    const variacao = (Math.random() - 0.5) * 0.2;
    
    return {
      indice: indice.toUpperCase(),
      modo: 'simulacao',
      mapId: `mock-${indice.toLowerCase()}-${Date.now()}`,
      token: 'mock-token',
      url: null, // Sem tile URL em modo de simulação
      estatisticas: {
        media: parseFloat((baseValue + variacao).toFixed(3)),
        minimo: parseFloat((baseValue - 0.2).toFixed(3)),
        maximo: parseFloat((baseValue + 0.2).toFixed(3)),
        desvioPadrao: parseFloat((0.05 + Math.random() * 0.05).toFixed(3))
      },
      parametros: {
        dataInicio,
        dataFim,
        coberturaNuvens: 20,
        escala: 10
      },
      nota: 'DADOS DE SIMULAÇÃO - Configure credenciais GEE para dados reais do Sentinel-2'
    };
  }

  /**
   * Calcula índice específico para um talhão
   */
  async calcularIndice(talhaoGeoJSON, indice, dataInicio, dataFim, cloudCoverage = 20) {
    await this.initialize();

    // Se estiver em modo de simulação, retorna dados mock
    if (this.modoSimulacao) {
      console.log(`🎲 Gerando dados simulados de ${indice} para ${dataInicio} a ${dataFim}`);
      return this.gerarDadosSimulados(indice, dataInicio, dataFim);
    }

    try {
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
        modo: 'real',
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
          escala: 10
        }
      };
    } catch (error) {
      console.error(`❌ Erro ao calcular ${indice}:`, error.message);
      console.log('🎲 Fallback para simulação');
      return this.gerarDadosSimulados(indice, dataInicio, dataFim);
    }
  }

  /**
   * Aplica máscara de nuvens na coleção Sentinel-2
   */
  aplicarMascaraNuvens(image) {
    const qa = image.select('QA60');
    const mask = qa.bitwiseAnd(1 << 10).eq(0)
      .and(qa.bitwiseAnd(1 << 11).eq(0));
    return image.updateMask(mask);
  }

  /**
   * Calcula NDVI
   */
  calcularNDVI(image) {
    const ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
    return ndvi;
  }

  /**
   * Calcula NDRE
   */
  calcularNDRE(image) {
    const ndre = image.normalizedDifference(['B8', 'B5']).rename('NDRE');
    return ndre;
  }

  /**
   * Calcula MSAVI
   */
  calcularMSAVI(image) {
    const nir = image.select('B8');
    const red = image.select('B4');
    
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
    const colecao = ee.ImageCollection('COPERNICUS/S2_SR')
      .filterBounds(geometry)
      .filterDate(dataInicio, dataFim)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', maxCloudCoverage))
      .map(this.aplicarMascaraNuvens)
      .median();

    return colecao;
  }

  /**
   * Retorna paleta de cores para cada índice
   */
  getPalette(indice) {
    const palettes = {
      'NDVI': ['red', 'yellow', 'green'],
      'NDRE': ['brown', 'yellow', 'darkgreen'],
      'MSAVI': ['red', 'orange', 'darkgreen']
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
        limitacao: 'Requer banda Red Edge',
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
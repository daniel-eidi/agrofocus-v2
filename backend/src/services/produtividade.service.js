/**
 * Serviço de Estimativa de Produtividade
 * AgroFocus - Integração com modelo ML Python
 * 
 * Funcionalidades:
 * - Coletar dados históricos (NDVI, GDD, Precipitação)
 * - Calcular estimativas usando modelo ML ou tabela de calibração
 * - Analisar tendências e comparar com média histórica
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// Mock de banco de dados - em produção, usar PostgreSQL
const mockDatabase = {
  talhoes: new Map(),
  dadosHistoricos: new Map(),
  produtividadesReais: new Map()
};

class ProdutividadeService {
  constructor() {
    this.pythonScriptPath = path.join(__dirname, '..', 'ml', 'modelo_estimativa.py');
    this.modelsDir = path.join(__dirname, '..', 'ml', 'models');
  }

  /**
   * Executa script Python para predição
   */
  async executarModeloPython(acao, dados, cultura = 'milho') {
    return new Promise((resolve, reject) => {
      let comando;
      
      if (acao === 'predict') {
        const jsonStr = JSON.stringify(dados).replace(/"/g, '\\"');
        comando = `python3 "${this.pythonScriptPath}" --cultura ${cultura} --predict "${jsonStr}"`;
      } else if (acao === 'exemplo') {
        comando = `python3 "${this.pythonScriptPath}" --cultura ${cultura} --exemplo`;
      } else {
        reject(new Error(`Ação desconhecida: ${acao}`));
        return;
      }

      exec(comando, { timeout: 30000 }, (error, stdout, stderr) => {
        if (stderr && !stderr.includes('⚠️')) {
          console.warn('Python stderr:', stderr);
        }
        
        if (error) {
          // Fallback para estimativa JavaScript se Python falhar
          console.warn('Python falhou, usando fallback JS:', error.message);
          resolve(this.estimativaFallback(dados.ndvi_mean, cultura));
          return;
        }

        try {
          const resultado = JSON.parse(stdout);
          resolve(resultado);
        } catch (parseError) {
          console.error('Erro ao parsear saída Python:', parseError);
          resolve(this.estimativaFallback(dados.ndvi_mean, cultura));
        }
      });
    });
  }

  /**
   * Fallback para estimativa quando Python não disponível
   */
  estimativaFallback(ndviMean, cultura = 'milho') {
    const tabelaCalibracao = {
      milho: [
        { min: 0.8, max: 1.0, prod: 13, intervalo: [12, 14], desc: 'Excelente' },
        { min: 0.6, max: 0.8, prod: 10, intervalo: [8, 12], desc: 'Bom' },
        { min: 0.4, max: 0.6, prod: 6.5, intervalo: [5, 8], desc: 'Médio' },
        { min: 0.0, max: 0.4, prod: 2.5, intervalo: [0, 5], desc: 'Baixo' }
      ],
      soja: [
        { min: 0.8, max: 1.0, prod: 4.5, intervalo: [4, 5], desc: 'Excelente' },
        { min: 0.6, max: 0.8, prod: 3.25, intervalo: [2.5, 4], desc: 'Bom' },
        { min: 0.4, max: 0.6, prod: 2, intervalo: [1.5, 2.5], desc: 'Médio' },
        { min: 0.0, max: 0.4, prod: 0.75, intervalo: [0, 1.5], desc: 'Baixo' }
      ],
      trigo: [
        { min: 0.8, max: 1.0, prod: 7, intervalo: [6, 8], desc: 'Excelente' },
        { min: 0.6, max: 0.8, prod: 5, intervalo: [4, 6], desc: 'Bom' },
        { min: 0.4, max: 0.6, prod: 3, intervalo: [2, 4], desc: 'Médio' },
        { min: 0.0, max: 0.4, prod: 1, intervalo: [0, 2], desc: 'Baixo' }
      ],
      algodao: [
        { min: 0.8, max: 1.0, prod: 5.25, intervalo: [4.5, 6], desc: 'Excelente' },
        { min: 0.6, max: 0.8, prod: 3.75, intervalo: [3, 4.5], desc: 'Bom' },
        { min: 0.4, max: 0.6, prod: 2.25, intervalo: [1.5, 3], desc: 'Médio' },
        { min: 0.0, max: 0.4, prod: 0.75, intervalo: [0, 1.5], desc: 'Baixo' }
      ]
    };

    const faixas = tabelaCalibracao[cultura] || tabelaCalibracao.milho;
    
    for (const faixa of faixas) {
      if (faixa.min <= ndviMean && ndviMean <= faixa.max) {
        return {
          estimativa_ton_ha: faixa.prod,
          intervalo_confianca: {
            min: faixa.intervalo[0],
            max: faixa.intervalo[1],
            nivel: 'estimado'
          },
          metodo: 'tabela_calibracao_js',
          cultura: cultura,
          descricao_faixa: faixa.desc,
          features_utilizadas: { ndvi_mean: ndviMean },
          observacao: 'Fallback JavaScript - modelo Python não disponível'
        };
      }
    }

    return {
      estimativa_ton_ha: 0,
      intervalo_confianca: { min: 0, max: 0, nivel: 'n/a' },
      metodo: 'erro',
      erro: 'NDVI fora das faixas esperadas'
    };
  }

  /**
   * Coleta dados históricos de um talhão
   */
  async coletarDadosHistoricos(talhaoId, safra, culturaId) {
    // Em produção: buscar do banco de dados
    // Por enquanto, simulamos dados históricos
    
    const dados = await this.simularDadosHistoricos(talhaoId, safra, culturaId);
    
    return {
      talhaoId,
      safra,
      culturaId,
      dados_coletados: {
        ndvi_medio: dados.ndviMedio,
        gdd_acumulado: dados.gddAcumulado,
        precipitacao_total: dados.precipitacaoTotal,
        historico_ndvi: dados.historicoNDVI,
        dados_3_safras: dados.ultimas3Safras
      },
      fontes: ['satelite_sentinel2', 'estacao_meteorologica', 'historico_produtor']
    };
  }

  /**
   * Simula dados históricos para demonstração
   */
  async simularDadosHistoricos(talhaoId, safra, culturaId) {
    // Determinar cultura pelo ID
    const culturas = { '1': 'milho', '2': 'soja', '3': 'trigo', '4': 'algodao' };
    const cultura = culturas[culturaId] || 'milho';
    
    // Gerar valores baseados no talhaoId (pseudo-random consistente)
    const seed = talhaoId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const base = (seed % 40) / 100; // 0.00 - 0.40
    
    // Simular NDVI médio baseado na cultura e seed
    const ndviMedio = 0.55 + base + (Math.random() * 0.15 - 0.075);
    
    // Simular GDD baseado na cultura
    const gddBase = cultura === 'milho' ? 1600 : cultura === 'soja' ? 1400 : 1200;
    const gddAcumulado = gddBase + (seed % 400) - 200;
    
    // Simular precipitação
    const precipitacaoTotal = 400 + (seed % 300);
    
    // Histórico de NDVI para os últimos 12 meses
    const historicoNDVI = [];
    for (let i = 11; i >= 0; i--) {
      const mes = new Date();
      mes.setMonth(mes.getMonth() - i);
      historicoNDVI.push({
        mes: mes.toISOString().slice(0, 7),
        ndvi: parseFloat((ndviMedio + (Math.random() * 0.2 - 0.1)).toFixed(3))
      });
    }
    
    // Dados das últimas 3 safras
    const anoBase = parseInt(safra.split('/')[0]);
    const ultimas3Safras = [];
    for (let i = 1; i <= 3; i++) {
      const anoSafra = anoBase - i;
      ultimas3Safras.push({
        safra: `${anoSafra}/${anoSafra + 1}`,
        ndvi_medio: parseFloat((ndviMedio + (Math.random() * 0.2 - 0.1)).toFixed(3)),
        gdd_acumulado: gddAcumulado + Math.floor(Math.random() * 200 - 100),
        precipitacao: precipitacaoTotal + Math.floor(Math.random() * 150 - 75),
        produtividade_real: cultura === 'milho' 
          ? parseFloat((8 + Math.random() * 6).toFixed(2))
          : parseFloat((2.5 + Math.random() * 2.5).toFixed(2))
      });
    }
    
    return {
      ndviMedio: parseFloat(ndviMedio.toFixed(3)),
      gddAcumulado,
      precipitacaoTotal,
      historicoNDVI,
      ultimas3Safras,
      cultura
    };
  }

  /**
   * Calcula GDD (Graus-dia de crescimento)
   */
  calcularGDD(temperaturas, tBase = 10, tMax = 30) {
    let gddTotal = 0;
    
    for (const temp of temperaturas) {
      const tMin = Math.max(temp.min, tBase);
      const tMaxCalc = Math.min(temp.max, tMax);
      const gddDia = ((tMin + tMaxCalc) / 2) - tBase;
      if (gddDia > 0) {
        gddTotal += gddDia;
      }
    }
    
    return gddTotal;
  }

  /**
   * Principal: Estimar produtividade de um talhão
   */
  async estimarProdutividade(talhaoId, safra, culturaId) {
    try {
      // 1. Coletar dados históricos
      const dadosHistoricos = await this.coletarDadosHistoricos(talhaoId, safra, culturaId);
      const { dados_coletados } = dadosHistoricos;
      
      // Determinar cultura
      const culturas = { '1': 'milho', '2': 'soja', '3': 'trigo', '4': 'algodao' };
      const cultura = culturas[culturaId] || 'milho';
      
      // 2. Preparar features para o modelo
      const features = {
        ndvi_mean: dados_coletados.ndvi_medio,
        gdd_total: dados_coletados.gdd_acumulado,
        precip_total: dados_coletados.precipitacao_total
      };
      
      // 3. Executar modelo de ML
      let resultadoML;
      try {
        resultadoML = await this.executarModeloPython('predict', features, cultura);
      } catch (error) {
        console.warn('Erro no modelo ML, usando fallback:', error);
        resultadoML = this.estimativaFallback(features.ndvi_mean, cultura);
      }
      
      // 4. Buscar produtividade real (se disponível)
      const produtividadeReal = await this.buscarProdutividadeReal(talhaoId, safra, culturaId);
      
      // 5. Calcular tendência
      const tendencia = this.calcularTendencia(dados_coletados.dados_3_safras);
      
      // 6. Comparar com média histórica
      const mediaHistorica = tendencia.media_historica || resultadoML.estimativa_ton_ha;
      const comparativo = this.compararComMediaHistorica(
        resultadoML.estimativa_ton_ha, 
        mediaHistorica
      );
      
      // 7. Buscar dados do ano anterior
      const comparativoAnoAnterior = await this.compararComAnoAnterior(
        talhaoId, 
        safra, 
        resultadoML.estimativa_ton_ha,
        culturaId
      );
      
      // Montar resposta completa
      return {
        sucesso: true,
        talhaoId,
        safra,
        cultura: {
          id: culturaId,
          nome: this.getNomeCultura(culturaId)
        },
        estimativa: {
          produtividade_ton_ha: resultadoML.estimativa_ton_ha,
          intervalo_confianca: resultadoML.intervalo_confianca,
          metodo: resultadoML.metodo,
          features_utilizadas: resultadoML.features_utilizadas
        },
        comparativos: {
          media_historica: comparativo,
          ano_anterior: comparativoAnoAnterior
        },
        tendencia,
        produtividade_real: produtividadeReal,
        dados_historicos: {
          ndvi_medio: dados_coletados.ndvi_medio,
          gdd_acumulado: dados_coletados.gdd_acumulado,
          precipitacao_total: dados_coletados.precipitacao_total,
          ultimas_3_safras: dados_coletados.dados_3_safras
        },
        alertas: comparativo.alertas || [],
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Erro ao estimar produtividade:', error);
      return {
        sucesso: false,
        erro: 'Erro ao calcular estimativa de produtividade',
        detalhes: error.message,
        talhaoId,
        safra,
        culturaId
      };
    }
  }

  /**
   * Busca produtividade real (dados do produtor)
   */
  async buscarProdutividadeReal(talhaoId, safra, culturaId) {
    // Em produção: buscar do banco
    // Simulando que temos dados em 30% dos casos
    const seed = talhaoId.length + safra.length;
    if (seed % 3 === 0) {
      const culturas = { '1': { base: 10, var: 4 }, '2': { base: 3.5, var: 1.5 } };
      const params = culturas[culturaId] || culturas['1'];
      return {
        disponivel: true,
        produtividade_ton_ha: parseFloat((params.base + Math.random() * params.var).toFixed(2)),
        data_colheita: `${safra.split('/')[0]}-03-15`,
        umidade: 13.5,
        fonte: 'produtor'
      };
    }
    return {
      disponivel: false,
      mensagem: 'Dados de produtividade real ainda não disponíveis para esta safra'
    };
  }

  /**
   * Calcula tendência baseada no histórico
   */
  calcularTendencia(dados3Safras) {
    if (!dados3Safras || dados3Safras.length < 2) {
      return {
        tendencia: 'insuficiente',
        mensagem: 'Dados históricos insuficientes'
      };
    }
    
    const produtividades = dados3Safras.map(s => s.produtividade_real);
    const media = produtividades.reduce((a, b) => a + b, 0) / produtividades.length;
    const primeira = produtividades[produtividades.length - 1];
    const ultima = produtividades[0];
    const variacao = ((ultima - primeira) / primeira) * 100;
    
    let tendencia;
    if (variacao > 5) tendencia = 'crescente';
    else if (variacao < -5) tendencia = 'decrescente';
    else tendencia = 'estavel';
    
    return {
      tendencia,
      variacao_percentual: parseFloat(variacao.toFixed(2)),
      produtividades_historicas: produtividades,
      media_historica: parseFloat(media.toFixed(2)),
      anos: dados3Safras.map(s => s.safra)
    };
  }

  /**
   * Compara estimativa com média histórica
   */
  compararComMediaHistorica(estimativaAtual, mediaHistorica) {
    const diferenca = estimativaAtual - mediaHistorica;
    const diferencaPercentual = (diferenca / mediaHistorica) * 100;
    
    const alertas = [];
    if (diferencaPercentual < -20) {
      alertas.push({
        tipo: 'critico',
        icone: '⚠️',
        mensagem: `Estimativa ${Math.abs(diferencaPercentual).toFixed(1)}% abaixo da média histórica`,
        acao_sugerida: 'Verificar condições da cultura, nutrição e pragas'
      });
    } else if (diferencaPercentual < -10) {
      alertas.push({
        tipo: 'atencao',
        icone: '⚡',
        mensagem: `Estimativa ${Math.abs(diferencaPercentual).toFixed(1)}% abaixo da média histórica`,
        acao_sugerida: 'Monitorar desenvolvimento da cultura'
      });
    } else if (diferencaPercentual > 10) {
      alertas.push({
        tipo: 'positivo',
        icone: '✅',
        mensagem: `Estimativa ${diferencaPercentual.toFixed(1)}% acima da média histórica`,
        acao_sugerida: 'Cultura com bom desenvolvimento'
      });
    }
    
    return {
      estimativa_atual: estimativaAtual,
      media_historica: mediaHistorica,
      diferenca_absoluta: parseFloat(diferenca.toFixed(2)),
      diferenca_percentual: parseFloat(diferencaPercentual.toFixed(2)),
      status: diferenca > 0 ? 'acima' : diferenca < 0 ? 'abaixo' : 'igual',
      alertas
    };
  }

  /**
   * Compara com ano anterior
   */
  async compararComAnoAnterior(talhaoId, safra, estimativaAtual, culturaId) {
    const anoAtual = parseInt(safra.split('/')[0]);
    const safraAnterior = `${anoAtual - 1}/${anoAtual}`;
    
    // Simular busca da estimativa do ano anterior
    const seed = talhaoId.length;
    const estimativaAnterior = estimativaAtual * (0.9 + (seed % 20) / 100);
    const diferenca = estimativaAtual - estimativaAnterior;
    const percentual = (diferenca / estimativaAnterior) * 100;
    
    return {
      safra_anterior: safraAnterior,
      estimativa_ano_anterior: parseFloat(estimativaAnterior.toFixed(2)),
      diferenca: parseFloat(diferenca.toFixed(2)),
      variacao_percentual: parseFloat(percentual.toFixed(2)),
      tendencia: percentual > 0 ? 'melhora' : percentual < 0 ? 'piora' : 'estavel'
    };
  }

  /**
   * Retorna nome da cultura
   */
  getNomeCultura(culturaId) {
    const nomes = {
      '1': 'Milho',
      '2': 'Soja',
      '3': 'Trigo',
      '4': 'Algodão'
    };
    return nomes[culturaId] || 'Desconhecida';
  }

  /**
   * Lista todas as culturas suportadas
   */
  getCulturasSuportadas() {
    return [
      { id: '1', nome: 'Milho', unidade: 't/ha', produtividade_max: 16 },
      { id: '2', nome: 'Soja', unidade: 't/ha', produtividade_max: 6 },
      { id: '3', nome: 'Trigo', unidade: 't/ha', produtividade_max: 9 },
      { id: '4', nome: 'Algodão', unidade: 't/ha', produtividade_max: 7 }
    ];
  }

  /**
   * Gera dados de exemplo para teste
   */
  async gerarDadosExemplo(cultura = 'milho') {
    try {
      const resultado = await this.executarModeloPython('exemplo', {}, cultura);
      return resultado;
    } catch (error) {
      console.warn('Erro ao gerar dados exemplo:', error);
      return {
        dados_gerados: [],
        exemplo_predicao: this.estimativaFallback(0.75, cultura)
      };
    }
  }
}

module.exports = new ProdutividadeService();

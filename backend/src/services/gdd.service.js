/**
 * Growing Degree Days (GDD) Service
 * Calcula graus-dia acumulados para previsão de estágios fenológicos
 */

const axios = require('axios');

// Tabela de temperaturas base por cultura (°C)
const TEMPERATURA_BASE = {
  milho: 10,
  soja: 7,
  trigo: 5,
  algodao: 12,
  cana: 18,
  arroz: 10,
  cafe: 8,
  laranja: 12,
};

// Tabela de estágios fenológicos por cultura (GDD acumulado necessário)
const ESTAGIOS_FENOLOGICOS = {
  milho: [
    { estagio: 'Emergência', gdd: 100, descricao: 'Plântulas emergindo do solo' },
    { estagio: 'V3 (3 folhas)', gdd: 200, descricao: 'Estádio vegetativo inicial' },
    { estagio: 'V6 (6 folhas)', gdd: 350, descricao: 'Crescimento vegetativo' },
    { estagio: 'Floração (R1)', gdd: 800, descricao: 'Início da floração - crítico para irrigação' },
    { estagio: 'Enchimento de grãos (R3)', gdd: 1100, descricao: 'Fase de enchimento dos grãos' },
    { estagio: 'Maturação fisiológica (R6)', gdd: 1400, descricao: 'Pronto para colheita' },
  ],
  soja: [
    { estagio: 'Emergência (VE)', gdd: 70, descricao: 'Plântulas emergindo' },
    { estagio: 'V3 (3 trifólios)', gdd: 150, descricao: 'Estádio vegetativo' },
    { estagio: 'V6 (6 trifólios)', gdd: 300, descricao: 'Crescimento vegetativo' },
    { estagio: 'Floração (R1)', gdd: 600, descricao: 'Primeira flor aberta' },
    { estagio: 'Vagem cheia (R3)', gdd: 900, descricao: 'Vagem com sementes visíveis' },
    { estagio: 'Início maturação (R7)', gdd: 1200, descricao: 'Sementes amarelas' },
  ],
  trigo: [
    { estagio: 'Emergência', gdd: 80, descricao: 'Plântulas emergindo' },
    { estagio: 'Afihamento', gdd: 250, descricao: 'Início do afihamento' },
    { estagio: 'Emborrachamento', gdd: 400, descricao: 'Alongamento do colmo' },
    { estagio: 'Floração', gdd: 550, descricao: 'Floração - sensível ao frio' },
    { estagio: 'Enchimento', gdd: 800, descricao: 'Formação do grão' },
    { estagio: 'Maturação', gdd: 1100, descricao: 'Pronto para colheita' },
  ],
  algodao: [
    { estagio: 'Emergência', gdd: 50, descricao: 'Plântulas emergindo' },
    { estagio: 'Flor branca', gdd: 400, descricao: 'Primeira flor aberta' },
    { estagio: 'Flor colorida', gdd: 600, descricao: 'Floração ativa' },
    { estagio: 'Cápsula aberta', gdd: 1100, descricao: 'Início da abertura' },
    { estagio: 'Colheita', gdd: 1400, descricao: 'Pronto para colheita' },
  ],
  cana: [
    { estagio: 'Emergência', gdd: 150, descricao: 'Brotação' },
    { estagio: 'Estolhos visíveis', gdd: 500, descricao: 'Formação de estolhos' },
    { estagio: 'Crescimento rápido', gdd: 1000, descricao: 'Fase de crescimento' },
    { estagio: 'Acamamento', gdd: 1500, descricao: 'Início do acamamento' },
    { estagio: 'Maturação', gdd: 2000, descricao: 'Açúcar acumulado' },
  ],
  arroz: [
    { estagio: 'Emergência', gdd: 60, descricao: 'Plântulas emergindo' },
    { estagio: 'Afihamento', gdd: 200, descricao: 'Início do afihamento' },
    { estagio: 'Floração', gdd: 450, descricao: 'Floração' },
    { estagio: 'Leitoso', gdd: 700, descricao: 'Grão leitoso' },
    { estagio: 'Maturação', gdd: 1000, descricao: 'Pronto para colheita' },
  ],
  cafe: [
    { estagio: 'Brotação floral', gdd: 100, descricao: 'Brotação das gemas florais' },
    { estagio: 'Floração principal', gdd: 400, descricao: 'Floração intensa' },
    { estagio: 'Fruto verde', gdd: 800, descricao: 'Desenvolvimento do fruto' },
    { estagio: 'Fruto amadurecendo', gdd: 1200, descricao: 'Mudança de cor' },
    { estagio: 'Colheita', gdd: 1500, descricao: 'Cereja madura' },
  ],
  laranja: [
    { estagio: 'Brotação', gdd: 150, descricao: 'Nova brotação' },
    { estagio: 'Floração', gdd: 400, descricao: 'Floração' },
    { estagio: 'Fruto pequeno', gdd: 600, descricao: 'Queda fisiológica' },
    { estagio: 'Crescimento do fruto', gdd: 1000, descricao: 'Aumento de tamanho' },
    { estagio: 'Maturação', gdd: 1400, descricao: 'Fruto maduro' },
  ],
};

/**
 * Calcula GDD diário
 * @param {number} tmax - Temperatura máxima (°C)
 * @param {number} tmin - Temperatura mínima (°C)
 * @param {number} tbase - Temperatura base da cultura (°C)
 * @returns {number} - GDD do dia
 */
function calcularGDD(tmax, tmin, tbase) {
  // Limita temperaturas para evitar valores extremos
  const tmaxLimite = Math.min(tmax, 30); // Limite superior de 30°C
  const tminLimite = Math.max(tmin, tbase); // Não considera abaixo de Tbase
  
  const media = (tmaxLimite + tminLimite) / 2;
  const gdd = Math.max(0, media - tbase);
  
  return Math.round(gdd * 10) / 10; // Arredonda para 1 decimal
}

/**
 * Busca dados históricos de temperatura do Open-Meteo
 * @param {number} latitude - Latitude do talhão
 * @param {number} longitude - Longitude do talhão
 * @param {string} dataInicio - Data de início (YYYY-MM-DD)
 * @param {string} dataFim - Data de fim (YYYY-MM-DD)
 * @returns {Promise<Array>} - Array de dados diários
 */
async function buscarDadosTemperatura(latitude, longitude, dataInicio, dataFim) {
  try {
    const url = `https://archive-api.open-meteo.com/v1/archive`;
    const params = {
      latitude,
      longitude,
      start_date: dataInicio,
      end_date: dataFim,
      daily: 'temperature_2m_max,temperature_2m_min',
      timezone: 'America/Sao_Paulo',
    };

    const response = await axios.get(url, { params, timeout: 10000 });
    const data = response.data;

    if (!data.daily) {
      throw new Error('Dados não disponíveis da API Open-Meteo');
    }

    const dias = [];
    for (let i = 0; i < data.daily.time.length; i++) {
      dias.push({
        data: data.daily.time[i],
        tmax: data.daily.temperature_2m_max[i],
        tmin: data.daily.temperature_2m_min[i],
      });
    }

    return dias;
  } catch (error) {
    console.error('Erro ao buscar dados do Open-Meteo:', error.message);
    throw error;
  }
}

/**
 * Busca previsão de temperatura para os próximos dias
 * @param {number} latitude - Latitude do talhão
 * @param {number} longitude - Longitude do talhão
 * @param {number} dias - Quantidade de dias de previsão (máx 16)
 * @returns {Promise<Array>} - Array de previsões diárias
 */
async function buscarPrevisaoTemperatura(latitude, longitude, dias = 7) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast`;
    const params = {
      latitude,
      longitude,
      daily: 'temperature_2m_max,temperature_2m_min',
      forecast_days: dias,
      timezone: 'America/Sao_Paulo',
    };

    const response = await axios.get(url, { params, timeout: 10000 });
    const data = response.data;

    const previsoes = [];
    for (let i = 0; i < data.daily.time.length; i++) {
      previsoes.push({
        data: data.daily.time[i],
        tmax: data.daily.temperature_2m_max[i],
        tmin: data.daily.temperature_2m_min[i],
      });
    }

    return previsoes;
  } catch (error) {
    console.error('Erro ao buscar previsão do Open-Meteo:', error.message);
    throw error;
  }
}

/**
 * Calcula GDD acumulado para um talhão
 * @param {string} talhaoId - ID do talhão
 * @param {string} dataPlantio - Data de plantio (YYYY-MM-DD)
 * @param {string} culturaId - ID da cultura (milho, soja, etc.)
 * @param {number} latitude - Latitude do talhão
 * @param {number} longitude - Longitude do talhão
 * @returns {Promise<Object>} - Resultado completo do GDD
 */
async function calcularGDDAcumulado(talhaoId, dataPlantio, culturaId, latitude, longitude) {
  const tbase = TEMPERATURA_BASE[culturaId.toLowerCase()];
  
  if (!tbase) {
    throw new Error(`Cultura não suportada: ${culturaId}`);
  }

  const hoje = new Date().toISOString().split('T')[0];
  
  // Busca dados históricos desde o plantio
  const dadosHistoricos = await buscarDadosTemperatura(
    latitude, 
    longitude, 
    dataPlantio, 
    hoje
  );

  // Calcula GDD diário e acumulado
  let gddAcumulado = 0;
  const gddDiario = [];

  for (const dia of dadosHistoricos) {
    const gddDia = calcularGDD(dia.tmax, dia.tmin, tbase);
    gddAcumulado += gddDia;
    
    gddDiario.push({
      data: dia.data,
      tmax: dia.tmax,
      tmin: dia.tmin,
      gdd_dia: gddDia,
      gdd_acumulado: Math.round(gddAcumulado * 10) / 10,
    });
  }

  // Busca previsão para próximos 7 dias
  const previsaoDados = await buscarPrevisaoTemperatura(latitude, longitude, 7);
  const previsao7Dias = [];
  let gddAcumuladoProj = gddAcumulado;

  for (const dia of previsaoDados) {
    const gddDia = calcularGDD(dia.tmax, dia.tmin, tbase);
    gddAcumuladoProj += gddDia;
    
    previsao7Dias.push({
      data: dia.data,
      tmax: dia.tmax,
      tmin: dia.tmin,
      gdd_dia: gddDia,
      gdd_acumulado_previsto: Math.round(gddAcumuladoProj * 10) / 10,
    });
  }

  // Determina estágio fenológico atual e próximo
  const estagios = ESTAGIOS_FENOLOGICOS[culturaId.toLowerCase()] || [];
  let estagioAtual = null;
  let proximoEstagio = null;
  let alertas = [];

  for (let i = 0; i < estagios.length; i++) {
    if (gddAcumulado >= estagios[i].gdd) {
      estagioAtual = estagios[i];
      if (i < estagios.length - 1) {
        proximoEstagio = estagios[i + 1];
      }
    }
  }

  // Verifica alertas - próximo estágio em menos de 3 dias
  if (proximoEstagio && previsao7Dias.length > 0) {
    const gddProximoEstagio = proximoEstagio.gdd;
    const diasParaProximoEstagio = previsao7Dias.findIndex(
      d => d.gdd_acumulado_previsto >= gddProximoEstagio
    );

    if (diasParaProximoEstagio !== -1 && diasParaProximoEstagio < 3) {
      alertas.push({
        tipo: 'estagio_proximo',
        nivel: 'info',
        estagio: proximoEstagio.estagio,
        mensagem: `${proximoEstagio.estagio} previsto em aproximadamente ${diasParaProximoEstagio + 1} dias`,
        dias_restantes: diasParaProximoEstagio + 1,
        gdd_faltante: Math.round((proximoEstagio.gdd - gddAcumulado) * 10) / 10,
      });
    }
  }

  // Estimativa de dias até a colheita
  const estagioFinal = estagios[estagios.length - 1];
  const gddRestante = estagioFinal ? estagioFinal.gdd - gddAcumulado : 0;
  const mediaGDDDia = gddDiario.length > 0 
    ? gddAcumulado / gddDiario.length 
    : 0;
  const diasAteColheita = mediaGDDDia > 0 
    ? Math.ceil(gddRestante / mediaGDDDia) 
    : null;

  return {
    talhao_id: talhaoId,
    cultura: culturaId,
    tbase_celsius: tbase,
    data_plantio: dataPlantio,
    data_atual: hoje,
    dias_desde_plantio: gddDiario.length,
    gdd_acumulado: Math.round(gddAcumulado * 10) / 10,
    gdd_diario: gddDiario,
    previsao_7dias: previsao7Dias,
    estagio_atual: estagioAtual ? {
      nome: estagioAtual.estagio,
      gdd_necessario: estagioAtual.gdd,
      descricao: estagioAtual.descricao,
    } : null,
    proximo_estagio: proximoEstagio ? {
      nome: proximoEstagio.estagio,
      gdd_necessario: proximoEstagio.gdd,
      descricao: proximoEstagio.descricao,
      gdd_faltante: Math.round((proximoEstagio.gdd - gddAcumulado) * 10) / 10,
    } : null,
    alertas: alertas,
    estimativa_colheita: diasAteColheita ? {
      dias_estimados: diasAteColheita,
      data_estimada: new Date(Date.now() + diasAteColheita * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    } : null,
  };
}

/**
 * Retorna todas as culturas suportadas
 */
function getCulturasSuportadas() {
  return Object.keys(TEMPERATURA_BASE).map(cultura => ({
    id: cultura,
    nome: cultura.charAt(0).toUpperCase() + cultura.slice(1),
    temperatura_base: TEMPERATURA_BASE[cultura],
    estagios: ESTAGIOS_FENOLOGICOS[cultura] || [],
  }));
}

/**
 * Calcula GDD para múltiplos talhões (útil para relatórios)
 * @param {Array} talhoes - Array de talhões com dados necessários
 */
async function calcularGDDMultiplosTalhoes(talhoes) {
  const resultados = [];
  
  for (const talhao of talhoes) {
    try {
      const resultado = await calcularGDDAcumulado(
        talhao.id,
        talhao.data_plantio,
        talhao.cultura_id,
        talhao.latitude,
        talhao.longitude
      );
      resultados.push(resultado);
    } catch (error) {
      resultados.push({
        talhao_id: talhao.id,
        erro: error.message,
      });
    }
  }
  
  return resultados;
}

module.exports = {
  calcularGDD,
  calcularGDDAcumulado,
  getCulturasSuportadas,
  calcularGDDMultiplosTalhoes,
  buscarDadosTemperatura,
  buscarPrevisaoTemperatura,
  TEMPERATURA_BASE,
  ESTAGIOS_FENOLOGICOS,
};
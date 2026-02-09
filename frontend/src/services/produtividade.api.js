/**
 * Serviço de API para Produtividade
 * AgroFocus Frontend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Estima produtividade para um talhão
 */
export const estimarProdutividade = async (talhaoId, safra, culturaId) => {
  const response = await fetch(
    `${API_BASE_URL}/produtividade/estimar/${talhaoId}?safra=${encodeURIComponent(safra)}&cultura_id=${culturaId}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.erro || 'Erro ao estimar produtividade');
  }
  
  return response.json();
};

/**
 * Lista culturas suportadas
 */
export const listarCulturas = async () => {
  const response = await fetch(`${API_BASE_URL}/produtividade/culturas`);
  
  if (!response.ok) {
    throw new Error('Erro ao carregar culturas');
  }
  
  return response.json();
};

/**
 * Busca histórico de produtividade
 */
export const buscarHistorico = async (talhaoId, culturaId = null, anos = 3) => {
  let url = `${API_BASE_URL}/produtividade/historico/${talhaoId}?anos=${anos}`;
  if (culturaId) {
    url += `&cultura_id=${culturaId}`;
  }
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Erro ao carregar histórico');
  }
  
  return response.json();
};

/**
 * Compara produtividade entre safras
 */
export const compararSafras = async (talhaoId, safra1, safra2, culturaId) => {
  const response = await fetch(
    `${API_BASE_URL}/produtividade/comparar/${talhaoId}?safra1=${encodeURIComponent(safra1)}&safra2=${encodeURIComponent(safra2)}&cultura_id=${culturaId}`
  );
  
  if (!response.ok) {
    throw new Error('Erro ao comparar safras');
  }
  
  return response.json();
};

/**
 * Gera dados de exemplo
 */
export const gerarDadosExemplo = async (cultura = 'milho') => {
  const response = await fetch(`${API_BASE_URL}/produtividade/exemplo/${cultura}`);
  
  if (!response.ok) {
    throw new Error('Erro ao gerar dados de exemplo');
  }
  
  return response.json();
};

export const produtividadeAPI = {
  estimarProdutividade,
  listarCulturas,
  buscarHistorico,
  compararSafras,
  gerarDadosExemplo
};

export default produtividadeAPI;
